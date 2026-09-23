import { runBackup, maintenance, ok, LOCAL } from "./backup.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const respond = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

const getBearerToken = (req) => {
  const authorization = req.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
};

export function createHandler(createClient, env) { return async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ success: false, error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = env("SUPABASE_URL");
    const anonKey = env("SUPABASE_ANON_KEY");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error(
        "SUPABASE_URL, SUPABASE_ANON_KEY of SUPABASE_SERVICE_ROLE_KEY ontbreekt."
      );
    }

    const bearerToken = getBearerToken(req);

    if (!bearerToken) {
      return respond({ success: false, error: "Niet toegestaan." }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let source = "cron";
    let requestedBy = null;

    if (bearerToken !== serviceRoleKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      });

      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser(bearerToken);

      if (userError || !user) {
        // The gateway may use a different valid service JWT than the runtime's
        // built-in key. Let PostgREST verify its signature and the service-only
        // EXECUTE grant; never authorize from decoded JWT claims alone.
        const { error: serviceError } = await userClient.rpc("backup_storage_inventory");
        if (serviceError) return respond({ success: false, error: "Ongeldige sessie." }, 401);
      } else {
      const { data: profile, error: profileError } = await serviceClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        return respond(
          { success: false, error: "Alleen admin mag een backup starten." },
          403
        );
      }

      source = "manual";
      requestedBy = user.id;
      }
    }

    const body = await req.json().catch(() => ({}));
    if (body.action === "download") {
      if (source !== "manual" || !/^[0-9a-f-]{36}$/.test(body.backup_id || "")) return respond({error:"admin_backup_id_required"},403);
      const run = ok(await serviceClient.from("backup_runs").select("path,status").eq("id",body.backup_id).single());
      if (run.status !== "success" || !run.path) return respond({error:"backup_unavailable"},404);
      const link = ok(await serviceClient.storage.from("backups").createSignedUrl(run.path,60));
      return respond({url:link.signedUrl});
    }
    const requestId = body.request_id || crypto.randomUUID();
    if (!/^[0-9a-f-]{36}$/.test(requestId)) return respond({ error: "invalid_request_id" }, 400);
    const projectRef = supabaseUrl === "http://127.0.0.1:55421" ? LOCAL : new URL(supabaseUrl).hostname.split(".")[0];
    let cleanupWarning = null;
    try { await maintenance(serviceClient); } catch { cleanupWarning = "retention_cleanup_failed"; }
    const result = await runBackup(serviceClient, { source, actor: requestedBy, requestId, projectRef, release: env("CSI_RELEASE") || null });
    if (cleanupWarning) ok(await serviceClient.from("backup_runs").update({ cleanup_warning: cleanupWarning }).eq("id", requestId));
    return respond({ success: result.status === "success", skipped: result.status === "skipped_test", status: result.status,
      backup_id: result.backup_id, cleanup_warning: cleanupWarning, replayed: result.replayed || false }, result.status === "failed" ? 500 : 200);
  } catch (_) {
    return respond({ success: false, error: "Backup mislukt. Controleer Systeem / Backupstatus en de serverlogs." }, 500);
  }
}; }
