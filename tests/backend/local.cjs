const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, '.local/test-backend.json'), 'utf8'));
// No env overrides: a test can NEVER accidentally target the hosted production project.
if (config.API_URL !== 'http://127.0.0.1:55421' || new URL(config.DB_URL).port !== '55422') {
  throw new Error('Testbackend geweigerd: uitsluitend CSI HIT lokaal op 55421/55422 toegestaan.');
}
const docker = process.env.CSI_DOCKER || 'docker';
function sql(statement) {
  return execFileSync(docker, ['exec', '-i', 'supabase_db_csi-hit-reliability', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'], { input: statement, encoding: 'utf8' }).trim();
}
function client(key = config.ANON_KEY) {
  return createClient(config.API_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const service = client(config.SERVICE_ROLE_KEY);
function ok(result) { if (result.error) throw new Error(result.error.message); return result.data; }
async function login(role) {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, '.local/fixture.json'), 'utf8'));
  const c = client();
  ok(await c.auth.signInWithPassword(fixture.accounts[role]));
  return c;
}
module.exports = { root, config, sql, client, service, ok, login };
