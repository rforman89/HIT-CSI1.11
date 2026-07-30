module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "Method not allowed.",
    });
  }

  const authHeader = req.headers.authorization || "";
  const querySecret = req.query?.secret || "";
  const expectedSecret = process.env.CRON_SECRET;

  const isAuthorized =
    expectedSecret &&
    (authHeader === `Bearer ${expectedSecret}` || querySecret === expectedSecret);

  if (!isAuthorized) {
    return res.status(401).json({
      ok: false,
      message: "Niet toegestaan.",
    });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      ok: false,
      message:
        "Supabase environment variables ontbreken. Controleer SUPABASE_URL/REACT_APP_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in Vercel.",
    });
  }

  try {
    const keepAliveResponse = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?select=key%2Cvalue&key=eq.game_mode`,
      {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(20000),
      }
    );

    const keepAliveData = await keepAliveResponse.json().catch(() => null);

    if (!keepAliveResponse.ok) {
      return res.status(500).json({
        ok: false,
        message: "Supabase keep-alive ping mislukt.",
        status: keepAliveResponse.status,
        error: keepAliveData,
      });
    }

    const backupResponse = await fetch(
      `${supabaseUrl}/functions/v1/csi-hit-nightly-backup`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "cron" }),
        signal: AbortSignal.timeout(50000),
      }
    );

    const backupData = await backupResponse.json().catch(() => null);

    if (!backupResponse.ok) {
      return res.status(500).json({
        ok: false,
        message:
          "Keep-alive is gelukt, maar de automatische CSI HIT-backup is mislukt.",
        backup_status: backupResponse.status,
        backup: backupData,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "CSI HIT-onderhoud is gelukt.",
      checked_table: "app_settings",
      checked_key: "game_mode",
      game_mode: keepAliveData?.[0]?.value || null,
      backup: backupData,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    const timedOut =
      err?.name === "TimeoutError" || err?.name === "AbortError";

    return res.status(500).json({
      ok: false,
      message: timedOut
        ? "CSI HIT-onderhoud duurde te lang."
        : "Onverwachte fout bij CSI HIT-onderhoud.",
      error: err?.message || String(err),
    });
  }
};
