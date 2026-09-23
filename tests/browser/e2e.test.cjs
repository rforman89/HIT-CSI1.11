const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { root, config, service, ok, hosted, fixtureFile, verify, login: apiLogin } = require('../backend/target.cjs');
const fixture = JSON.parse(fs.readFileSync(root + '/' + fixtureFile));
const preview = hosted && fs.existsSync(root + '/.local/preview.json') ? JSON.parse(fs.readFileSync(root + '/.local/preview.json')) : null;
const base = preview?.url || 'http://127.0.0.1:3100';
const expectedPreviewBranch = process.env.CSI_PREVIEW_BRANCH || 'hardening/backup-restore-operations';
if (preview && (!['hardening/core-reliability','hardening/backup-restore-operations'].includes(expectedPreviewBranch) || new URL(base).protocol !== 'https:' || !new URL(base).hostname.endsWith('.vercel.app') || preview.branch !== expectedPreviewBranch)) throw new Error('Only the explicitly verified hardening Preview branch is allowed.');
const browserState = preview && fs.existsSync(root + '/.local/preview-browser-state.json') ? root + '/.local/preview-browser-state.json' : undefined;
async function verifyBundle() {
  const context = await browser.newContext({ storageState: browserState });
  try {
  const response = await context.request.get(base); assert.equal(response.status(),200);
  const html = await response.text(); const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(scripts.length); let code = '';
  for (const src of scripts) { const url=new URL(src,base); assert.equal(url.origin,new URL(base).origin); code += await (await context.request.get(url.href)).text(); }
  assert.ok(code.includes(config.API_URL), 'Built frontend must use the intended test endpoint');
  assert.ok(code.includes(config.ANON_KEY), 'Built frontend must use the matching test anon key');
  assert.ok(!code.includes(config.SERVICE_ROLE_KEY), 'No service role in frontend');
  console.log('Verified built frontend endpoint: ' + config.API_URL);
  } finally { await context.close(); }
}
let browser, adminApi;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await pause(100); }
  throw new Error('Condition did not become true within timeout');
}
const balance = () => service.from('groups').select('credits').eq('id', fixture.groupA).single().then(ok).then(g => g.credits);
before(async () => {
  await verify(); browser = await chromium.launch(); await verifyBundle();
  adminApi = await apiLogin('admin');
  ok(await service.from('app_settings').upsert({ key: 'game_mode', value: 'test' }));
});
beforeEach(verify);
after(async () => { await browser?.close(); await adminApi?.auth.signOut(); });
async function screen(t, role) {
  const context = await browser.newContext({ storageState: browserState, viewport: { width: 390, height: 844 } });
  const errors = [], unexpectedHosts = [], network = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (![new URL(base).origin, new URL(config.API_URL).origin].includes(url.origin)) {
      unexpectedHosts.push(url.hostname); return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (/warning.*react|react.*warning|invalid.*hook|unique.*key/i.test(msg.text())) errors.push(msg.text()); });
  page.on('response', r => { if (r.status() >= 400) network.push({ url: new URL(r.url()).pathname, status: r.status() }); });
  t.after(async () => { assert.deepEqual(errors, [], 'No JS/React errors'); assert.deepEqual(unexpectedHosts, [], 'Only verified frontend and isolated test backend accessed'); await context.close(); });
  await page.goto(base); if (role) await login(page, role);
  return { page, context, network };
}
async function login(page, role, password = fixture.accounts[role].password) {
  await page.getByPlaceholder('E-mail', { exact: true }).fill(fixture.accounts[role].email);
  await page.getByPlaceholder('Wachtwoord', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  if (password === fixture.accounts[role].password) await page.getByRole('button', { name: 'Uitloggen', exact: true }).waitFor();
}
async function credits(page) {
  await page.getByRole('button', { name: /^💰 Pegels$/ }).click();
  await page.locator('select').first().selectOption(fixture.groupA);
}
test('E2E login: wrong password, valid login, logout, account switch', async t => {
  const { page, network } = await screen(t); await login(page, 'a', 'incorrect-password');
  await page.getByText('Invalid login credentials', { exact: true }).waitFor();
  await login(page, 'a'); await page.getByText('Team TEST - Groep A', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Uitloggen', exact: true }).click(); await login(page, 'b');
  await page.getByText('Team TEST - Groep B', { exact: true }).waitFor(); assert.equal(await page.getByText('Team TEST - Groep A', { exact: true }).count(), 0);
  assert.deepEqual(network.map(r => r.status), [400]);
});
test('E2E credits: latency, processing feedback, double click and two-client balance sync', async t => {
  const { page } = await screen(t, 'admin'), { page: participant } = await screen(t, 'a'); await credits(page);
  const start = await balance(); let calls = 0;
  await page.route('**/rest/v1/rpc/mutate_group_credits', async route => { calls++; await pause(900); await route.continue(); });
  await page.getByRole('button', { name: '+5', exact: true }).evaluate(button => { button.click(); button.click(); });
  await page.getByRole('status').filter({ hasText: 'Bezig met verwerken' }).waitFor();
  assert.equal(await page.getByRole('button', { name: '+5', exact: true }).isDisabled(), true);
  await until(async () => await balance() === start + 5);
  await until(async () => (await participant.locator('body').innerText()).includes(`💰 ${start + 5} pegels`));
  assert.equal(calls, 1); assert.equal(await balance(), start + 5);
});
test('E2E credits: server commit with lost response survives reload and safe retry', async t => {
  const { page } = await screen(t, 'admin'); await credits(page); const start = await balance();
  await page.route('**/rest/v1/rpc/mutate_group_credits', async route => { await route.fetch(); await route.abort('failed'); });
  await page.getByRole('button', { name: '+5', exact: true }).click();
  await page.getByText(/Uitkomst nog onbekend/).waitFor(); assert.equal(await balance(), start + 5);
  await page.unroute('**/rest/v1/rpc/mutate_group_credits'); await page.reload();
  await page.getByRole('button', { name: /^💰 Pegels$/ }).click();
  await page.getByRole('button', { name: 'Controleer/herhaal pegelactie' }).click();
  await until(async () => await page.getByRole('button', { name: 'Controleer/herhaal pegelactie' }).count() === 0);
  assert.equal(await balance(), start + 5);
});
test('E2E credits: timeout after server commit retries same action once', async t => {
  const { page } = await screen(t, 'admin'); await credits(page); const start = await balance();
  await page.route('**/rest/v1/rpc/mutate_group_credits', async route => { const response = await route.fetch(); await pause(13000); await route.fulfill({ response }).catch(() => {}); });
  await page.getByRole('button', { name: '+5', exact: true }).click(); await page.getByText(/Uitkomst nog onbekend/).waitFor();
  await page.unroute('**/rest/v1/rpc/mutate_group_credits');
  await page.getByRole('button', { name: 'Controleer/herhaal pegelactie' }).click();
  await until(async () => await page.getByRole('button', { name: 'Controleer/herhaal pegelactie' }).count() === 0);
  assert.equal(await balance(), start + 5);
});
test('E2E sync: clue publication and game mode reach second client', async t => {
  const { page } = await screen(t, 'admin'), { page: participant } = await screen(t, 'a');
  const title = `TEST - Publicatie ${Date.now()}`;
  const row = ok(await service.from('clues_base').insert({ title, description: 'Fictief', price: 0, is_free: true, is_global: true, is_visible: false }).select().single());
  t.after(async () => { ok(await service.from('app_settings').upsert({ key: 'game_mode', value: 'test' })); ok(await adminApi.from('clues').delete().eq('id', row.id)); });
  await page.getByRole('button', { name: /📄 Clues/ }).click();
  await page.getByRole('button', { name: 'Verversen', exact: true }).click();
  await participant.getByRole('button', { name: /📄 Clues/ }).click();
  await page.getByText(title, { exact: true }).locator('..').getByRole('button', { name: 'Zichtbaar maken', exact: true }).click();
  await until(async () => (await participant.locator('body').innerText()).includes(title));
  await page.getByRole('button', { name: /✅ Klaar/ }).click();
  page.once('dialog', dialog => dialog.accept('LIVE'));
  await page.getByRole('button', { name: 'Zet spel live', exact: true }).click();
  await until(async () => (await participant.locator('body').innerText()).includes('LIVE SPEL'));
  await until(async () => (await page.locator('body').innerText()).includes('LIVE SPEL'));
  page.once('dialog', dialog => dialog.accept('TEST'));
  await page.getByRole('button', { name: 'Terug naar testmodus', exact: true }).click();
  await until(async () => (await participant.locator('body').innerText()).includes('TESTMODUS'));
});
test('E2E network: disconnect preserves data and blocks test actions; reconnect restores mode', async t => {
  const { page, context } = await screen(t, 'admin'); await page.getByRole('button', { name: /⚙️ Beheer/ }).click();
  await context.setOffline(true); await page.getByText('⚠️ SPELMODUS ONBEKEND', { exact: true }).waitFor();
  await page.getByText(/Geen verbinding. Laatst geladen gegevens blijven zichtbaar/).waitFor();
  assert.equal(await page.getByRole('button', { name: /Reset testdata/i }).count(), 0);
  assert.ok((await page.locator('body').innerText()).includes('TEST - Groep A'));
  await context.setOffline(false); await page.getByText('🧪 TESTMODUS', { exact: true }).first().waitFor();
});
test('E2E network: query error keeps last data, then refresh recovers', async t => {
  const { page } = await screen(t, 'a');
  await page.route('**/rest/v1/clues?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Injected outage' }) }));
  await page.getByRole('button', { name: 'Verversen', exact: true }).click();
  await page.getByText(/Verversen mislukt/).waitFor(); assert.equal(await page.getByText('Team TEST - Groep A', { exact: true }).count(), 1);
  await page.unroute('**/rest/v1/clues?*'); await page.getByRole('button', { name: 'Verversen', exact: true }).click();
  await page.getByText('🧪 TESTMODUS', { exact: true }).waitFor();
});
test('E2E races: delayed old snapshot cannot restore data after logout/account switch', async t => {
  const { page } = await screen(t, 'a'); let intercepted = false;
  await page.route('**/rest/v1/clues?*', async route => { if (!intercepted) { intercepted = true; const response = await route.fetch(); await pause(1500); await route.fulfill({ response }).catch(() => {}); } else await route.continue(); });
  await page.getByRole('button', { name: 'Verversen', exact: true }).click(); await until(() => intercepted);
  await page.getByRole('button', { name: 'Uitloggen', exact: true }).click(); await login(page, 'b'); await pause(1700);
  assert.equal(await page.getByText('Team TEST - Groep A', { exact: true }).count(), 0); await page.getByText('Team TEST - Groep B', { exact: true }).waitFor();
});

test('E2E notes: double submission saves once and status still updates', async t => {
  const { page } = await screen(t, 'a'); await page.getByRole('button', { name: /🕵️ Verdachten/ }).click();
  const text = `Testnotitie ${Date.now()}`;
  await page.getByRole('button', { name: 'Notitie toevoegen', exact: true }).click();
  await page.locator('textarea').last().fill(text);
  let calls = 0;
  await page.route('**/rest/v1/suspect_notes*', async route => {
    if (route.request().method() === 'POST') { calls++; await pause(700); } await route.continue();
  });
  await page.getByRole('button', { name: /Notitie opslaan/ }).evaluate(button => { button.click(); button.click(); });
  await page.getByText('Notitie opgeslagen.', { exact: true }).waitFor(); assert.equal(calls, 1);
  assert.equal(ok(await service.from('suspect_notes').select().eq('note', text)).length, 1);
  await page.getByRole('button', { name: 'Verdacht', exact: true }).click();
  await until(async () => ok(await service.from('suspect_statuses').select().eq('group_id', fixture.groupA).eq('suspect_id', fixture.suspect)).some(row => row.status === 'suspect'));
});
async function clueForm(page, title) {
  await page.getByRole('button', { name: /📄 Clues/ }).click();
  await page.getByPlaceholder('Titel', { exact: true }).fill(title);
  await page.getByPlaceholder('Omschrijving', { exact: true }).fill('Fictieve uploadtest');
}
test('E2E purchase: real participant purchase deducts once and unlocks clue', async t => {
  const row = ok(await service.from('clues_base').insert({ title: 'TEST - Browseraankoop', description: 'Fictieve aankoop', price: 5, is_visible: true, is_active: true }).select().single());
  t.after(() => adminApi.from('clues').delete().eq('id', row.id).then(ok));
  const { page } = await screen(t, 'a'), start = await balance();
  await page.getByRole('button', { name: /📄 Clues/ }).click();
  const card = page.getByRole('heading', { name: row.title, exact: true }).locator('..').locator('..');
  await card.getByRole('button', { name: 'Koop voor 5 pegels', exact: true }).click();
  await until(async () => await balance() === start - 5);
  await card.getByText('✅ Ontgrendeld', { exact: true }).waitFor();
  const assignments = ok(await service.from('group_clues').select().eq('group_id', fixture.groupA).eq('clue_id', row.id));
  assert.equal(assignments.length, 1); assert.equal(assignments[0].source, 'purchase');
});
test('E2E membership: client converges to new group without showing old group', async t => {
  const { page } = await screen(t, 'a');
  t.after(() => service.from('group_members').update({ group_id: fixture.groupA }).eq('user_id', fixture.users.a).then(ok));
  ok(await service.from('group_members').update({ group_id: fixture.groupB }).eq('user_id', fixture.users.a));
  await until(async () => (await page.getByText('Team TEST - Groep B', { exact: true }).count()) === 1);
  assert.equal(await page.getByText('Team TEST - Groep A', { exact: true }).count(), 0);
});
test('E2E races: overlapping snapshots retain the newest game mode', async t => {
  const { page } = await screen(t, 'a'); let intercepted = false;
  t.after(() => service.from('app_settings').upsert({ key: 'game_mode', value: 'test' }).then(ok));
  await page.route('**/rest/v1/app_settings?*', async route => {
    if (!intercepted) { intercepted = true; const response = await route.fetch(); await pause(2500); await route.fulfill({ response }).catch(() => {}); }
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Verversen', exact: true }).click(); await until(() => intercepted);
  ok(await service.from('app_settings').upsert({ key: 'game_mode', value: 'live' }));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.getByText('🔴 LIVE SPEL', { exact: true }).waitFor(); await pause(2800);
  await page.getByText('🔴 LIVE SPEL', { exact: true }).waitFor();
});
const pdf = { name: 'fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') };
test('E2E upload: failure prevents clue insertion', async t => {
  const { page } = await screen(t, 'admin'), title = `TEST - Uploadfout ${Date.now()}`; await clueForm(page, title);
  await page.locator('#clue-file').setInputFiles(pdf);
  await page.route('**/storage/v1/object/clue-files/**', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Upload afgewezen', message: 'Upload afgewezen', statusCode: '400' }) }));
  await page.getByRole('button', { name: 'Aanwijzing toevoegen', exact: true }).click(); await page.getByText(/Upload mislukt:/).waitFor();
  assert.equal(ok(await service.from('clues_base').select().eq('title', title)).length, 0);
});
test('E2E upload: definite DB rejection removes uploaded object', async t => {
  const { page } = await screen(t, 'admin'), title = `TEST - Insertfout ${Date.now()}`; await clueForm(page, title);
  await page.locator('#clue-file').setInputFiles(pdf); let uploadedPath;
  await page.route('**/rest/v1/clues*', async route => {
    if (route.request().method() === 'POST') {
      uploadedPath = route.request().postDataJSON().file_url;
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: '23514', message: 'Geïnjecteerde constraintfout' }) });
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Aanwijzing toevoegen', exact: true }).click(); await page.getByText('Geïnjecteerde constraintfout', { exact: true }).waitFor();
  assert.ok(uploadedPath); const objects = ok(await service.storage.from('clue-files').list('clues'));
  assert.ok(!objects.some(o => 'clues/' + o.name === uploadedPath));
  assert.equal(ok(await service.from('clues_base').select().eq('title', title)).length, 0);
});
test('E2E clue: creation without a file requires explicit confirmation', async t => {
  const { page } = await screen(t, 'admin'), title = `TEST - Zonder bestand ${Date.now()}`; await clueForm(page, title);
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'Aanwijzing toevoegen', exact: true }).click();
  assert.equal(ok(await service.from('clues_base').select().eq('title', title)).length, 0);
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Aanwijzing toevoegen', exact: true }).click();
  await page.getByText('Aanwijzing toegevoegd.', { exact: true }).waitFor();
  const row = ok(await service.from('clues_base').select().eq('title', title).single()); assert.equal(row.file_url, null);
  ok(await adminApi.from('clues').delete().eq('id', row.id));
});
test('E2E upload: successful upload creates a linked active clue', async t => {
  const { page } = await screen(t, 'admin'), title = `TEST - Bestand ${Date.now()}`; await clueForm(page, title);
  await page.locator('#clue-file').setInputFiles(pdf);
  await page.getByRole('button', { name: 'Aanwijzing toevoegen', exact: true }).click();
  await page.getByText('Aanwijzing toegevoegd.', { exact: true }).waitFor();
  const row = ok(await service.from('clues_base').select().eq('title', title).single()); assert.equal(row.is_active, true); assert.ok(row.file_url);
  assert.ok(ok(await service.storage.from('clue-files').list('clues')).some(o => 'clues/' + o.name === row.file_url));
  ok(await adminApi.from('clues').delete().eq('id', row.id)); ok(await service.storage.from('clue-files').remove([row.file_url]));
});

const sizes = [[360,800],[375,812],[390,844],[393,873],[412,915],[430,932],[844,390],[390,500]];
for (const role of [null, 'admin', 'a', 'suspect']) test(`responsive: ${role || 'login'} at 8 mobile/short/landscape viewports`, async t => {
  const { page, network } = await screen(t, role);
  if (role === 'admin') await page.getByRole('button', { name: /🕵️ Verhoor/ }).click();
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => {
      const html = document.documentElement, body = document.body, root = document.getElementById('root');
      const fixed = [...document.querySelectorAll('div')].filter(e => getComputedStyle(e).position === 'fixed' && e.querySelector('button'));
      return { width: html.scrollWidth, height: root.getBoundingClientRect().height, viewport: innerWidth,
        backgrounds: [html,body,root].map(e => getComputedStyle(e).backgroundColor),
        navigation: fixed.map(e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, bottom: r.bottom }; }) };
    });
    assert.ok(layout.width <= width, JSON.stringify({ width, height, layout })); assert.ok(layout.height >= height - 1);
    assert.ok(layout.backgrounds.every(c => c !== 'rgb(255, 255, 255)' && c !== 'rgba(0, 0, 0, 0)'));
    for (const r of layout.navigation) { assert.ok(r.left >= -1 && r.right <= width + 1); assert.ok(r.bottom <= height + 1); }
    if (role === 'admin' && width < 600) {
      const columns = await page.locator('.interrogation-layout').first().evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
      assert.equal(columns, 1, 'Interrogation stacks on narrow screens');
    }
  }
  await page.screenshot({ path: root + `/.local/responsive-${role || 'login'}.png` });
  assert.deepEqual(network, [], 'No unexpected HTTP errors in normal responsive flow');
});
test('responsive: image modal remains closable at 8 mobile/short/landscape viewports', async t => {
  const photo = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1000"><rect width="600" height="1000" fill="#505060"/></svg>');
  ok(await service.from('suspects').update({ photo_url: photo }).eq('id', fixture.suspect));
  t.after(async () => ok(await service.from('suspects').update({ photo_url: null }).eq('id', fixture.suspect)));
  const { page } = await screen(t, 'admin'); await page.getByRole('button', { name: /🕵️ Verhoor/ }).click();
  for (const [width,height] of sizes) {
    await page.setViewportSize({ width,height }); await page.getByRole('img', { name: 'TEST - Verdachte', exact: true }).click();
    const close = page.getByRole('button', { name: 'Sluiten', exact: true }), r = await close.boundingBox();
    assert.ok(r && r.y >= 0 && r.y + r.height <= height && r.x >= 0 && r.x + r.width <= width);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await close.click();
  }
});
test('responsive: deployment landing page under simulated public hostname at 8 viewports', async t => {
  const context = await browser.newContext({ storageState: browserState }), errors = []; t.after(() => context.close());
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'www.csi-hit.nl') { errors.push(url.hostname); return route.abort(); }
    const response = await context.request.get(base + url.pathname + url.search); await route.fulfill({ response });
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('https://www.csi-hit.nl/'); assert.ok((await page.title()).includes('CSI HIT'));
  await page.getByRole('img', { name: 'CSI HIT Alphen logo', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const [width,height] of sizes) {
    await page.setViewportSize({ width,height });
    const result = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.getElementById('root').getBoundingClientRect().height, color: getComputedStyle(document.body).backgroundColor }));
    assert.ok(result.width <= width, JSON.stringify({ width,height,result })); assert.ok(result.height >= height - 1); assert.notEqual(result.color, 'rgb(255, 255, 255)');
  }
  assert.deepEqual(errors, []);
});
