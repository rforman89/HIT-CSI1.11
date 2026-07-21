const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
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
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value")
      .eq("key", "game_mode")
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: "Supabase keep-alive ping mislukt.",
        error: error.message,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "CSI HIT Supabase keep-alive ping gelukt.",
      checked_table: "app_settings",
      checked_key: "game_mode",
      game_mode: data?.value || null,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Onverwachte fout bij keep-alive.",
      error: err?.message || String(err),
    });
  }
};
