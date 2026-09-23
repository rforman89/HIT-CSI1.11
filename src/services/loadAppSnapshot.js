// Build a complete snapshot before committing any React state. Errors never become empty data.
export async function loadAppSnapshot(client, userId, signal, finalReportsEnabled = false) {
  const rows = async (query) => {
    const { data, error } = await query.abortSignal(signal);
    if (error) throw new Error(error.message || "Gegevens ophalen mislukt.");
    return data;
  };
  const profile = await rows(client.from("profiles").select("*").eq("id", userId).single());
  const query = (table, select = "*", order) => {
    let q = client.from(table).select(select);
    if (order) q = q.order(order, { ascending: !["notifications", "credit_transactions", "suspect_notes"].includes(table) });
    return q;
  };
  const [agendaItems, suspects, clues, clueCategories, settings] = await Promise.all([
    rows(query("agenda_items", "*", "starts_at")), rows(query("suspects", "*", "sort_order")),
    rows(query("clues", "*", "sort_order")), rows(query("clue_categories", "*", "sort_order")),
    rows(client.from("app_settings").select("key,value")),
  ]);
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const mode = ["live", "test"].includes(settingsMap.game_mode) ? settingsMap.game_mode : "unknown";
  const snapshot = { profile, agendaItems, suspects,
    clues: clues.map(clue => ({ ...clue, suspects: suspects.find(s => s.id === clue.suspect_id) || null })),
    clueCategories, gameMode: mode, finalReportsOpen: finalReportsEnabled && settingsMap.final_reports_open === "true",
    latestBackupInfo: null, groups: [], profiles: [], memberships: [], notifications: [], transactions: [],
    groupClues: [], suspectNotes: [], suspectStatuses: [], finalReports: [] };
  try { snapshot.latestBackupInfo = JSON.parse(settingsMap.latest_auto_backup || "null"); } catch (_) { /* Older optional backup metadata. */ }
  const admin = profile.role === "admin";
  const suspect = profile.role === "suspect";
  if (!admin && !suspect) {
    snapshot.memberships = await rows(client.from("group_members").select("*, groups(*)").eq("user_id", userId));
    snapshot.groups = snapshot.memberships.map(m => m.groups).filter(Boolean);
    if (!snapshot.memberships[0]) return snapshot;
  }
  const groupId = snapshot.memberships[0]?.group_id;
  const scoped = (table, select = "*", order) => {
    let q = query(table, select, order);
    if (groupId) q = q.eq("group_id", groupId);
    return rows(q);
  };
  const [groups, profiles, memberships, notifications, transactions, groupClues, notes, statuses, finalReports] = await Promise.all([
    admin || suspect ? rows(query("groups", "*", "created_at")) : snapshot.groups,
    admin ? rows(query("profiles", "*", "email")) : [],
    admin ? rows(query("group_members")) : snapshot.memberships,
    !suspect ? scoped("notifications", admin ? "*, groups(name)" : "*", "created_at") : [],
    !suspect ? scoped("credit_transactions", admin ? "*, groups(name)" : "*", "created_at") : [],
    scoped("group_clues", admin || suspect ? "*, groups(name)" : "*"),
    scoped("suspect_notes", "*, groups(name), suspects(name), profiles(display_name,email)", "created_at"),
    scoped("suspect_statuses", "*, groups(name), suspects(name)"),
    finalReportsEnabled && !suspect ? scoped("final_reports", "*, suspects(name)") : [],
  ]);
  return { ...snapshot, groups, profiles, memberships, notifications, transactions,
    groupClues: groupClues.map(row => ({ ...row, clues: snapshot.clues.find(c => c.id === row.clue_id) || null })),
    suspectNotes: notes, suspectStatuses: statuses, finalReports };
}
