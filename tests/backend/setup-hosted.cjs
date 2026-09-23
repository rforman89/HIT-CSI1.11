const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { root, config, projectRef, fixtureFile, service, ok, verify } = require('./hosted.cjs');
(async () => {
  await verify();
  const file = path.join(root, fixtureFile);
  const id = n => `d6137600-1985-4000-8000-${String(n).padStart(12, '0')}`;
  const fixture = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {
    accounts: {}, users: {}, groupA: id(1), groupB: id(2), suspect: id(3), clue: id(4), freeClue: id(5), hiddenClue: id(6), note: id(7)
  };
  ok(await service.from('app_settings').upsert([{ key: 'game_mode', value: 'test' }, { key: 'final_reports_open', value: 'false' }]));
  ok(await service.from('groups').upsert([{ id: fixture.groupA, name: 'TEST - Groep A', credits: 100 }, { id: fixture.groupB, name: 'TEST - Groep B', credits: 100 }]));
  ok(await service.from('suspects').upsert({ id: fixture.suspect, name: 'TEST - Verdachte', description: 'Uitsluitend fictieve testgegevens.', photo_url: null }));
  const existing = ok(await service.auth.admin.listUsers({ perPage: 1000 })).users;
  for (const role of ['admin', 'admin2', 'a', 'a2', 'b', 'suspect']) {
    if (!fixture.accounts[role]) {
      fixture.accounts[role] = { email: `csi-${role}@example.test`, password: randomBytes(24).toString('base64url') };
      const found = existing.find(u => u.email === fixture.accounts[role].email);
      const { user } = found ? ok(await service.auth.admin.updateUserById(found.id, { password: fixture.accounts[role].password })) : ok(await service.auth.admin.createUser({ ...fixture.accounts[role], email_confirm: true }));
      fixture.users[role] = user.id;
      fs.writeFileSync(file, JSON.stringify(fixture, null, 2));
    }
    ok(await service.from('profiles').update({ role: role.startsWith('admin') ? 'admin' : role === 'suspect' ? 'suspect' : 'participant', display_name: `Test ${role}`, suspect_id: role === 'suspect' ? fixture.suspect : null }).eq('id', fixture.users[role]));
  }
  for (const role of ['a', 'a2', 'b']) ok(await service.from('group_members').upsert({ group_id: role === 'b' ? fixture.groupB : fixture.groupA, user_id: fixture.users[role] }, { onConflict: 'user_id' }));
  ok(await service.from('clues_base').upsert([
    { id: fixture.clue, title: 'TEST - Aanwijzing', description: 'Fictieve betaalde aanwijzing.', price: 5, is_free: false, is_global: false, is_visible: true, is_active: true, suspect_id: fixture.suspect, file_url: 'test/private.pdf' },
    { id: fixture.freeClue, title: 'TEST - Gratis', description: 'Fictieve gratis aanwijzing.', price: 0, is_free: true, is_visible: true, is_active: true, is_global: true },
    { id: fixture.hiddenClue, title: 'TEST - Verborgen', description: 'Fictief geheim.', price: 5, is_free: false, is_global: false, is_visible: false, is_active: true, suspect_id: fixture.suspect, file_url: 'test/hidden.pdf' }
  ]));
  ok(await service.from('suspect_notes').upsert({ id: fixture.note, group_id: fixture.groupA, suspect_id: fixture.suspect, user_id: fixture.users.a, note: 'Fictief verhoorscenario: controleer het alibi.' }));
  fs.writeFileSync(file, JSON.stringify(fixture, null, 2));
  fs.writeFileSync(path.join(root, '.local/hosted-client.env'), `REACT_APP_ENVIRONMENT=test\nREACT_APP_TEST_PROJECT_ID=${projectRef}\nREACT_APP_SUPABASE_URL=${config.API_URL}\nREACT_APP_SUPABASE_ANON_KEY=${config.ANON_KEY}\n`);
  console.log(`Verified ${projectRef}: six fictitious accounts and deterministic test dataset prepared; no secrets logged.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
