import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

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

const TABLES_TO_BACKUP = [
  "app_settings",
  "groups",
  "profiles",
  "group_members",
  "suspects",
  "agenda_items",
  "clue_categories",
  "clues_base",
  "group_clues",
  "suspect_notes",
  "suspect_statuses",
  "notifications",
  "credit_transactions",
  "final_reports",
];

const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

const getBearerToken = (req: Request) => {
  const authorization = req.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
};

const getDateFromBackupPath = (path: string) => {
  const match = path.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ success: false, error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
    let requestedBy: string | null = null;

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
        return respond({ success: false, error: "Ongeldige sessie." }, 401);
      }

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

    const { data: gameModeRow, error: gameModeError } = await serviceClient
      .from("app_settings")
      .select("value")
      .eq("key", "game_mode")
      .maybeSingle();

    if (gameModeError) throw gameModeError;

    const gameMode = gameModeRow?.value || "test";

    if (gameMode !== "live") {
      return respond({
        skipped: true,
        message: "Backup overgeslagen: spel staat niet in LIVE-modus.",
        game_mode: gameMode,
      });
    }

    const exportedAt = new Date().toISOString();
    const backupDate = exportedAt.slice(0, 10);
    const path = `daily/csi-hit-backup-${backupDate}.json`;

    const backup: Record<string, unknown> = {
      format_version: 2,
      exported_at: exportedAt,
      source,
      requested_by: requestedBy,
      game_mode: gameMode,
      tables: {},
    };

    const recordCounts: Record<string, number> = {};

    for (const tableName of TABLES_TO_BACKUP) {
      const { data, error } = await serviceClient
        .from(tableName)
        .select("*");

      if (error) {
        throw new Error(
          `Tabel ${tableName} kon niet worden geback-upt: ${error.message}`
        );
      }

      (backup.tables as Record<string, unknown>)[tableName] = data || [];
      recordCounts[tableName] = (data || []).length;
    }

    const backupJson = JSON.stringify(backup, null, 2);

    const { error: uploadError } = await serviceClient.storage
      .from("backups")
      .upload(path, backupJson, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const cutoff = new Date(`${backupDate}T00:00:00.000Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - 29);

    let removedOldBackups = 0;
    let cleanupWarning: string | null = null;

    try {
      const allBackupPaths: string[] = [];

      const listFiles = async (prefix = ""): Promise<void> => {
        const { data, error } = await serviceClient.storage
          .from("backups")
          .list(prefix, {
            limit: 1000,
            offset: 0,
            sortBy: { column: "name", order: "asc" },
          });

        if (error) throw error;

        for (const item of data || []) {
          const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

          if (item.id === null) {
            await listFiles(itemPath);
          } else {
            allBackupPaths.push(itemPath);
          }
        }
      };

      await listFiles();

      const stalePaths = allBackupPaths.filter((candidatePath) => {
        if (candidatePath === path) return false;

        const candidateDate = getDateFromBackupPath(candidatePath);
        if (!candidateDate) return false;

        return new Date(`${candidateDate}T00:00:00.000Z`) < cutoff;
      });

      if (stalePaths.length > 0) {
        const { error: removeError } = await serviceClient.storage
          .from("backups")
          .remove(stalePaths);

        if (removeError) throw removeError;
        removedOldBackups = stalePaths.length;
      }
    } catch (cleanupError) {
      cleanupWarning =
        cleanupError instanceof Error
          ? cleanupError.message
          : String(cleanupError);
    }

    const latestBackupInfo = {
      created_at: exportedAt,
      path,
      source,
      requested_by: requestedBy,
      record_counts: recordCounts,
      removed_old_backups: removedOldBackups,
      retention_days: 30,
      cleanup_warning: cleanupWarning,
    };

    const { error: settingsError } = await serviceClient
      .from("app_settings")
      .upsert(
        {
          key: "latest_auto_backup",
          value: JSON.stringify(latestBackupInfo),
          updated_at: exportedAt,
        },
        { onConflict: "key" }
      );

    if (settingsError) throw settingsError;

    return respond({
      success: true,
      path,
      latest_backup: latestBackupInfo,
    });
  } catch (error) {
    return respond(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});
