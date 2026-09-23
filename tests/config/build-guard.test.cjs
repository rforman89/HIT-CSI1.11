const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const base = { ...process.env, REACT_APP_SUPABASE_ANON_KEY: 'test-only-placeholder', REACT_APP_ENVIRONMENT: 'test', REACT_APP_TEST_PROJECT_ID: 'isolated', REACT_APP_SUPABASE_URL: 'https://isolated.supabase.co' };
for (const [name, override, message] of [
  ['Preview with production backend', { VERCEL_ENV: 'preview', REACT_APP_SUPABASE_URL: 'https://uhfcrskkgutlqqogahbr.supabase.co', REACT_APP_TEST_PROJECT_ID: 'uhfcrskkgutlqqogahbr' }, 'niet aantoonbaar geïsoleerd'],
  ['Preview claiming production environment', { VERCEL_ENV: 'preview', REACT_APP_ENVIRONMENT: 'production' }, 'Preview vereist'],
  ['Hosted Preview with loopback backend', { VERCEL_ENV: 'preview', REACT_APP_SUPABASE_URL: 'http://127.0.0.1:55421', REACT_APP_TEST_PROJECT_ID: 'csi-hit-reliability' }, 'lokale testbackend niet gebruiken'],
  ['Production with test backend', { VERCEL_ENV: 'production' }, 'Onverwachte productiebackend'],
  ['Unrecognized backend hostname', { VERCEL_ENV: 'preview', REACT_APP_SUPABASE_URL: 'https://isolated.example.test' }, 'niet aantoonbaar geïsoleerd'],
]) test(`build guard rejects ${name}`, () => {
  const result = spawnSync(process.execPath, ['scripts/build.cjs'], { cwd: root, env: { ...base, ...override }, encoding: 'utf8' });
  assert.equal(result.status, 1); assert.ok(result.stderr.includes(message));
  assert.ok(!result.stdout.includes('Creating an optimized production build'));
});
