const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
test('client environment has an exact public allowlist', async () => {
  const { clientEnvironment, clientKeys } = await import('../../scripts/build-config.mjs');
  const env = clientEnvironment('test', process.cwd(), { SUPABASE_SERVICE_ROLE_KEY: 'sentinel', REACT_APP_SECRET: 'sentinel' });
  assert.deepEqual(Object.keys(env), clientKeys);
  assert(!JSON.stringify(env).includes('sentinel'));
});
test('frontend rejects both server secret formats', async () => {
  const { validateBuild } = await import('../../scripts/build-config.mjs');
  for (const key of ['sb_secret_test', 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.test']) {
    assert.throws(() => validateBuild({ REACT_APP_SUPABASE_URL: 'http://127.0.0.1:55421', REACT_APP_SUPABASE_ANON_KEY: key }), /Server-only/);
  }
});
test('deployment artifacts and secrets remain ignored by Git and Vercel', () => {
  const paths = ['.local/fixture.json', '.env.local', '.vercel/project.json', 'build/index.html', 'test-results/a.png', 'playwright/.auth/session.json'];
  for (const file of paths) {
    assert(execFileSync('git', ['check-ignore', file], { encoding: 'utf8' }).trim());
    const patterns = fs.readFileSync('.vercelignore', 'utf8').split(/\r?\n/).map(x => x.replace(/\/$/, ''));
    assert(patterns.some(p => p && !p.startsWith('#') && (file === p || file.startsWith(p + '/') || (p === '.env.*' && file.startsWith('.env.')))), file);
  }
});
test('Git owns build/install/output settings and retains CSP, API and cron', () => {
  const v = require('../../vercel.json');
  assert.equal(v.installCommand, 'npm ci'); assert.equal(v.buildCommand, 'npm run build'); assert.equal(v.outputDirectory, 'build');
  assert.equal(v.crons[0].path, '/api/keep-alive');
  assert.match(v.headers[0].headers.find(x => x.key === 'Content-Security-Policy').value, /script-src 'self';/);
  const spa = new RegExp('^' + v.rewrites[0].source + '$');
  assert(spa.test('/dossier')); assert(!spa.test('/api/keep-alive')); assert(!spa.test('/assets/missing.js'));
});
