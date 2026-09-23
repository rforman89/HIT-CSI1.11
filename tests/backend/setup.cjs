const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { root, config, sql, service, ok } = require('./local.cjs');
(async () => {
  if (sql("SELECT to_regclass('public.profiles') IS NULL") === 't') {
    sql(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  }
  if (sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='credit_transactions' AND column_name='action_id'") === '0') {
    sql(fs.readFileSync(path.join(root, 'supabase/migrations/20260923150822_core_reliability.sql'), 'utf8'));
  }
  const file = path.join(root, '.local/fixture.json');
  let fixture = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {
    accounts: {}, users: {}, groupA: randomUUID(), groupB: randomUUID(), suspect: randomUUID(), clue: randomUUID()
  };
  ok(await service.from('app_settings').upsert({ key: 'game_mode', value: 'test' }));
  ok(await service.from('groups').upsert([
    { id: fixture.groupA, name: 'TEST - Groep A', credits: 100 },
    { id: fixture.groupB, name: 'TEST - Groep B', credits: 100 }
  ]));
  ok(await service.from('suspects').upsert({ id: fixture.suspect, name: 'TEST - Verdachte', description: 'Uitsluitend fictieve testgegevens.' }));
  for (const role of ['admin', 'a', 'b', 'suspect']) {
    if (!fixture.accounts[role]) {
      fixture.accounts[role] = { email: `csi-${role}@example.test`, password: randomBytes(24).toString('base64url') };
      const { user } = ok(await service.auth.admin.createUser({ ...fixture.accounts[role], email_confirm: true }));
      fixture.users[role] = user.id;
      fs.writeFileSync(file, JSON.stringify(fixture, null, 2));
    }
    ok(await service.from('profiles').update({ role: ['admin', 'suspect'].includes(role) ? role : 'participant', display_name: `Test ${role}`, suspect_id: role === 'suspect' ? fixture.suspect : null }).eq('id', fixture.users[role]));
  }
  ok(await service.from('group_members').upsert([
    { group_id: fixture.groupA, user_id: fixture.users.a }, { group_id: fixture.groupB, user_id: fixture.users.b }
  ], { onConflict: 'group_id,user_id' }));
  ok(await service.from('clues_base').upsert({ id: fixture.clue, title: 'TEST - Aanwijzing', description: 'Fictieve geheime aanwijzing.', price: 5, suspect_id: fixture.suspect, file_url: 'test/private.txt' }));
  fs.writeFileSync(file, JSON.stringify(fixture, null, 2));
  fs.writeFileSync(path.join(root, '.env.local'), `REACT_APP_ENVIRONMENT=test\nREACT_APP_TEST_PROJECT_ID=csi-hit-reliability\nREACT_APP_SUPABASE_URL=${config.API_URL}\nREACT_APP_SUPABASE_ANON_KEY=${config.ANON_KEY}\n`);
  console.log('Lokale testbackend voorbereid: fictieve accounts/data, geïsoleerde poorten, clientconfiguratie. Geen secrets gelogd.');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
