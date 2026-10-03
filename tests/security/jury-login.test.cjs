// Supplemental jury session checks. Never run against a hosted backend.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
if (process.env.CSI_BACKEND && process.env.CSI_BACKEND !== 'local') throw Error('LOCAL only');
const { config, client, ok } = require('../backend/local.cjs');
const fixture = JSON.parse(fs.readFileSync('.local/fixture.json'));
const base = 'http://127.0.0.1:3100';
let browser;
before(async () => {
  assert.equal(config.API_URL, 'http://127.0.0.1:55421');
  browser = await chromium.launch();
});
after(async () => browser?.close());

test('jury session: wrong password, login, refresh, logout and relogin preserve database role', async () => {
  const actor = client(), credentials = fixture.accounts.jury;
  try {
    assert.ok((await actor.auth.signInWithPassword({ ...credentials, password: 'deliberately-incorrect' })).error);
    ok(await actor.auth.signInWithPassword(credentials));
    const { session } = ok(await actor.auth.refreshSession());
    assert.equal(ok(await actor.from('profiles').select('role').eq('id', session.user.id).single()).role, 'jury');
    assert.equal(ok(await actor.rpc('is_admin')), false);
    ok(await actor.auth.signOut());
    assert.ok((await actor.auth.refreshSession({ refresh_token: session.refresh_token })).error);
    ok(await actor.auth.signInWithPassword(credentials));
    assert.equal(ok(await actor.from('profiles').select('role').single()).role, 'jury');
  } finally { await actor.auth.signOut(); }
});

test('jury browser: reload and direct admin URL retain jury UI; logout removes it', async () => {
  const context = await browser.newContext(), errors = [];
  await context.route('**/*', route => [base, config.API_URL].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    const html = await (await context.request.get(base)).text();
    const asset = html.match(/<script[^>]+src="([^"]+)"/)[1];
    assert.ok((await (await context.request.get(new URL(asset, base).href)).text()).includes(config.API_URL));
    await page.goto(base);
    await page.getByLabel('E-mail', { exact: true }).fill(fixture.accounts.jury.email);
    await page.getByLabel('Wachtwoord', { exact: true }).fill(fixture.accounts.jury.password);
    await page.getByLabel('Wachtwoord', { exact: true }).press('Enter');
    await page.getByRole('heading', { name: 'CSI HIT Jury', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'CSI HIT Jury', exact: true }).waitFor();
    await page.goto(base + '/admin');
    await page.getByRole('heading', { name: 'CSI HIT Jury', exact: true }).waitFor();
    assert.equal(await page.getByRole('navigation', { name: 'Beheernavigatie' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /Beheer|Reset|backup|Zet spel live|Terug naar testmodus/i }).count(), 0);
    await page.getByRole('button', { name: 'Uitloggen', exact: true }).click();
    await page.getByRole('heading', { name: 'CSI HIT Login', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'CSI HIT Login', exact: true }).waitFor();
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
