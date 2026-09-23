const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const { root, sql, service, ok, client, login } = require('./local.cjs');
const fixture = JSON.parse(fs.readFileSync(root + '/.local/fixture.json'));
let admin, a, b, suspect;
const mode = value => service.from('app_settings').upsert({ key: 'game_mode', value }).then(ok);
const balance = id => service.from('groups').select('credits').eq('id', id).single().then(ok).then(g => g.credits);
const mutation = (group, amount = 5, id = randomUUID()) => ({ target_group_id: group, amount_change: amount, mutation_reason: 'Automatische lokale regressietest', action_id: id });
const credit = (params, c = admin) => c.rpc('mutate_group_credits', params);
async function group(credits = 20) { return ok(await service.from('groups').insert({ name: 'TEST - Integratie', credits }).select().single()).id; }
async function clue(price = 5, extra = {}) { return ok(await service.from('clues_base').insert({ title: 'TEST - Integratie', description: 'Fictief geheim', price, suspect_id: fixture.suspect, file_url: 'test/private.txt', ...extra }).select().single()).id; }
async function purchaseGroup(credits = 20) {
  const id = await group(credits);
  ok(await service.from('group_members').update({ group_id: id }).eq('user_id', fixture.users.a));
  return id;
}
const purchase = (g, c, actor = a) => actor.rpc('purchase_clue', { target_group_id: g, target_clue_id: c });
before(async () => { [admin, a, b, suspect] = await Promise.all(['admin', 'a', 'b', 'suspect'].map(login)); await mode('test'); });
afterEach(async () => { ok(await service.from('group_members').update({ group_id: fixture.groupA }).eq('user_id', fixture.users.a)); });
after(async () => {
  await mode('test');
  ok(await admin.from('groups').delete().eq('name', 'TEST - Integratie'));
  ok(await admin.from('clues').delete().eq('title', 'TEST - Integratie'));
  ok(await admin.from('suspects').delete().eq('name', 'TEST - Ander'));
  for (const c of [admin,a,b,suspect]) await c?.auth.signOut();
});

test('credits: +5 stores balance, actor, reason, timestamp, action ID and notification together', async () => {
  const g = await group(), p = mutation(g), r = ok(await credit(p));
  assert.equal(await balance(g), 25); assert.equal(r.balance, 25);
  const rows = ok(await service.from('credit_transactions').select().eq('group_id', g));
  assert.equal(rows.length, 1); assert.equal(rows[0].action_id, p.action_id); assert.equal(rows[0].created_by, fixture.users.admin);
  assert.equal(rows[0].amount, 5); assert.equal(rows[0].reason, p.mutation_reason); assert.ok(Date.parse(rows[0].created_at));
  assert.equal(ok(await service.from('notifications').select().eq('group_id', g)).length, 1);
});
test('credits: retry returns original result, without another mutation', async () => {
  const g = await group(), p = mutation(g), first = ok(await credit(p)), second = ok(await credit(p));
  assert.equal(second.transaction_id, first.transaction_id); assert.equal(second.replayed, true); assert.equal(await balance(g), 25);
});
test('credits: eight concurrent identical requests book exactly once', async () => {
  const g = await group(), p = mutation(g);
  const results = (await Promise.all(Array.from({ length: 8 }, () => credit(p)))).map(ok);
  assert.equal(new Set(results.map(r => r.transaction_id)).size, 1); assert.equal(await balance(g), 25);
});
test('credits: different concurrent IDs do not lose updates', async () => {
  const g = await group(); (await Promise.all(Array.from({ length: 5 }, () => credit(mutation(g))))).forEach(ok);
  assert.equal(await balance(g), 45);
});
test('credits: negative amount works; overdraft is rejected atomically', async () => {
  const g = await group(); ok(await credit(mutation(g, -5))); assert.equal(await balance(g), 15);
  assert.ok((await credit(mutation(g, -16))).error); assert.equal(await balance(g), 15);
});
test('credits: failing notification rolls back balance AND transaction', async () => {
  const g = await group();
  sql(`CREATE FUNCTION public.test_fail_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.group_id='${g}' THEN RAISE EXCEPTION 'Injected test failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_fail_notification BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.test_fail_notification();`);
  try {
    assert.ok((await credit(mutation(g))).error); assert.equal(await balance(g), 20);
    assert.equal(ok(await service.from('credit_transactions').select().eq('group_id', g)).length, 0);
  } finally { sql('DROP TRIGGER test_fail_notification ON public.notifications; DROP FUNCTION public.test_fail_notification();'); }
});
test('credits: reusing ID with different payload is rejected', async () => {
  const g = await group(), p = mutation(g); ok(await credit(p));
  assert.ok((await credit({ ...p, amount_change: 10 })).error); assert.equal(await balance(g), 25);
});
test('credits: participant, suspect, anonymous and legacy RPC cannot mutate balance', async () => {
  const g = await group();
  for (const actor of [a, suspect, client()]) assert.ok((await credit(mutation(g), actor)).error);
  assert.ok((await admin.rpc('adjust_group_credits', { target_group_id: g, amount_change: 5 })).error);
  assert.equal(await balance(g), 20);
});
test('purchase: normal purchase writes correct source, time and cost', async () => {
  const g = await purchaseGroup(), c = await clue(); ok(await purchase(g, c)); assert.equal(await balance(g), 15);
  const row = ok(await service.from('group_clues').select().eq('group_id', g).single());
  assert.equal(row.source, 'purchase'); assert.ok(Date.parse(row.requested_at));
});
test('purchase: duplicate request cannot charge twice', async () => {
  const g = await purchaseGroup(), c = await clue(); ok(await purchase(g, c)); assert.ok((await purchase(g, c)).error); assert.equal(await balance(g), 15);
});
test('purchase: insufficient funds leave all data unchanged', async () => {
  const g = await purchaseGroup(1), c = await clue(); assert.ok((await purchase(g, c)).error); assert.equal(await balance(g), 1);
  assert.equal(ok(await service.from('group_clues').select().eq('group_id', g)).length, 0);
});
test('purchase: simultaneous same clue only charges once', async () => {
  const g = await purchaseGroup(), c = await clue(), results = await Promise.all([purchase(g, c), purchase(g, c)]);
  assert.equal(results.filter(r => !r.error).length, 1); assert.equal(await balance(g), 15);
});
test('purchase: concurrent different clues cannot spend same credits', async () => {
  const g = await purchaseGroup(5), c1 = await clue(), c2 = await clue(), results = await Promise.all([purchase(g, c1), purchase(g, c2)]);
  assert.equal(results.filter(r => !r.error).length, 1); assert.equal(await balance(g), 0);
});
test('purchase: foreign group rejected', async () => {
  const g = await group(), c = await clue(); assert.ok((await purchase(g, c)).error); assert.equal(await balance(g), 20);
});
test('manual assignment: source manual preserves balance', async () => {
  const g = await group(), c = await clue(); const row = ok(await admin.from('group_clues').insert({ group_id: g, clue_id: c, source: 'manual' }).select().single());
  assert.equal(row.source, 'manual'); assert.equal(await balance(g), 20);
});
for (const value of ['live', 'unknown', '']) test(`mode ${value || 'empty'}: reset, demo cleanup, removal, direct delete and demo creation blocked`, async () => {
  const g = await group(), c = await clue(), row = ok(await admin.from('group_clues').insert({ group_id: g, clue_id: c, source: 'manual' }).select().single());
  await mode(value);
  try {
    for (const [name, params] of [['reset_test_data', {}], ['delete_demo_data', {}], ['remove_group_clue', { target_assignment_id: row.id }]]) assert.ok((await admin.rpc(name, params)).error, name);
    for (const [table, id] of [['group_clues', row.id], ['groups', g], ['clues', c]]) assert.ok((await admin.from(table).delete().eq('id', id)).error, table);
    assert.ok((await admin.from('groups').insert({ name: 'DEMO - must be blocked' })).error);
  } finally { await mode('test'); }
});
test('mode missing: destructive RPC fails closed', async () => {
  ok(await service.from('app_settings').delete().eq('key', 'game_mode'));
  try { assert.ok((await admin.rpc('delete_demo_data')).error); } finally { await mode('test'); }
});
test('TEST: remove assignment and notification atomic, retry harmless', async () => {
  const g = await group(), c = await clue(), row = ok(await admin.from('group_clues').insert({ group_id: g, clue_id: c, source: 'manual' }).select().single());
  ok(await admin.rpc('remove_group_clue', { target_assignment_id: row.id })); ok(await admin.rpc('remove_group_clue', { target_assignment_id: row.id }));
  assert.equal(ok(await service.from('group_clues').select().eq('id', row.id)).length, 0);
  assert.equal(ok(await service.from('notifications').select().eq('group_id', g)).length, 1);
});
test('TEST: demo creation and atomic cleanup succeed', async () => {
  const g = ok(await admin.from('groups').insert({ name: 'DEMO - Local only' }).select().single());
  ok(await admin.rpc('delete_demo_data')); assert.equal(ok(await service.from('groups').select().eq('id', g.id)).length, 0);
});
test('RLS: anonymous cannot read game rows or mutate', async () => {
  const anonymous = client(); for (const table of ['groups', 'profiles', 'group_clues', 'suspect_notes', 'clues', 'clues_base']) {
    const r = await anonymous.from(table).select(); assert.ok(r.error || r.data.length === 0, table);
  }
});
test('RLS: participants only see own group and own notes; no direct balance update', async () => {
  const note = ok(await a.from('suspect_notes').insert({ group_id: fixture.groupA, suspect_id: fixture.suspect, user_id: fixture.users.a, note: 'Fictieve notitie A' }).select().single());
  assert.equal(ok(await b.from('suspect_notes').select().eq('id', note.id)).length, 0);
  assert.equal(ok(await b.from('groups').select().eq('id', fixture.groupA)).length, 0);
  assert.ok((await b.from('suspect_notes').insert({ group_id: fixture.groupA, suspect_id: fixture.suspect, user_id: fixture.users.b, note: 'Forbidden' })).error);
  const beforeBalance = await balance(fixture.groupA); await a.from('groups').update({ credits: 999 }).eq('id', fixture.groupA); assert.equal(await balance(fixture.groupA), beforeBalance);
});
test('RLS: own-suspect notes visible, other suspect notes hidden; admin sees both', async () => {
  const other = ok(await service.from('suspects').insert({ name: 'TEST - Ander' }).select().single());
  const note = ok(await a.from('suspect_notes').insert({ group_id: fixture.groupA, suspect_id: other.id, user_id: fixture.users.a, note: 'Fictief ander dossier' }).select().single());
  assert.equal(ok(await suspect.from('suspect_notes').select().eq('id', note.id)).length, 0);
  assert.ok(ok(await suspect.from('suspect_notes').select().eq('suspect_id', fixture.suspect)).length > 0);
  assert.equal(ok(await admin.from('suspect_notes').select().eq('id', note.id)).length, 1);
});
test('RLS: masked clue files stay secret until assigned; clues_base remains denied', async () => {
  const c = await clue();
  assert.ok((await a.from('clues_base').select()).error);
  const hidden = ok(await a.from('clues').select().eq('id', c).single()); assert.equal(hidden.file_url, null);
  ok(await admin.from('group_clues').insert({ group_id: fixture.groupA, clue_id: c, source: 'manual', status: 'released', released_at: new Date().toISOString() }));
  assert.equal(ok(await a.from('clues').select().eq('id', c).single()).file_url, 'test/private.txt');
  assert.equal(ok(await b.from('clues').select().eq('id', c).single()).file_url, null);
});
test('LIVE: owner can still edit/delete own notes', async () => {
  const note = ok(await a.from('suspect_notes').insert({ group_id: fixture.groupA, suspect_id: fixture.suspect, user_id: fixture.users.a, note: 'LIVE notitie' }).select().single());
  await mode('live'); try {
    ok(await a.from('suspect_notes').update({ note: 'Bijgewerkt' }).eq('id', note.id)); ok(await a.from('suspect_notes').delete().eq('id', note.id));
    assert.equal(ok(await a.from('suspect_notes').select().eq('id', note.id)).length, 0);
  } finally { await mode('test'); }
});
test('TEST: reset RPC succeeds and leaves accounts intact', async () => {
  const result = ok(await admin.rpc('reset_test_data')); assert.ok(result);
  assert.equal(ok(await service.from('credit_transactions').select()).length, 0);
  assert.equal(ok(await service.from('profiles').select()).length, 4);
});
test('mode race: LIVE change waits until an authorized TEST transaction ends', async () => {
  const { spawn } = require('node:child_process');
  const process = spawn(global.process.env.CSI_DOCKER || 'docker', ['exec', '-i', 'supabase_db_csi-hit-reliability', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq']);
  const ready = new Promise((resolve, reject) => {
    process.stdout.on('data', chunk => { if (chunk.toString().includes('LOCKED')) resolve(); });
    process.on('error', reject); process.on('exit', code => { if (code) reject(new Error('Local lock test failed')); });
  });
  const done = new Promise((resolve, reject) => process.on('exit', code => code === 0 ? resolve() : reject(new Error('Local transaction failed'))));
  process.stdin.end(`BEGIN; SELECT set_config('request.jwt.claim.sub','${fixture.users.admin}',true); SELECT public.remove_group_clue('${randomUUID()}'); SELECT 'LOCKED'; SELECT pg_sleep(1); COMMIT;`);
  await ready; const start = Date.now();
  await mode('live'); assert.ok(Date.now() - start >= 500, 'Mode update must wait for shared lock');
  await done; await mode('test');
});
