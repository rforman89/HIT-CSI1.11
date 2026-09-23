const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createClient } = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '../..');
const projectRef = 'ksnagauoufsriwplvvtd';
const config = JSON.parse(fs.readFileSync(path.join(root, '.local/hosted-backend.json'), 'utf8'));
if (config.PROJECT_REF !== projectRef || config.API_URL !== `https://${projectRef}.supabase.co`) throw new Error('Hosted tests require the explicitly authorized CSI HIT TEST endpoint.');
for (const key of [config.ANON_KEY, config.SERVICE_ROLE_KEY]) {
  const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url'));
  if (claims.ref !== projectRef) throw new Error('Key project mismatch: no writes permitted.');
}
const cli = process.env.CSI_SUPABASE_CLI || 'supabase';
function client(key = config.ANON_KEY) { return createClient(config.API_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
const service = client(config.SERVICE_ROLE_KEY);
function ok(result) { if (result.error) throw new Error(result.error.message); return result.data; }
async function verify() {
  const row = ok(await service.from('app_settings').select('value').eq('key', 'test_environment').single());
  if (row.value !== projectRef) throw new Error('Hosted database marker mismatch: no writes permitted.');
}
function sqlArgs(file) { return ['db', 'query', '--linked', '--project-ref', projectRef, '--file', file, '-o', 'json']; }
function sqlFile(statement) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csi-hosted-sql-'));
  const file = path.join(dir, 'query.sql'); fs.writeFileSync(file, statement); return file;
}
function sql(statement) {
  const file = sqlFile(statement);
  try {
    const data = JSON.parse(execFileSync(cli, sqlArgs(file), { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }));
    const rows = data.rows || data; return rows.length === 1 ? String(Object.values(rows[0])[0]) : JSON.stringify(rows);
  } finally { fs.unlinkSync(file); fs.rmdirSync(path.dirname(file)); }
}
async function sqlAsync(statement) {
  const file = sqlFile(statement);
  try { return await promisify(execFile)(cli, sqlArgs(file), { encoding: 'utf8' }); }
  finally { fs.unlinkSync(file); fs.rmdirSync(path.dirname(file)); }
}
async function login(role) {
  await verify(); const fixture = JSON.parse(fs.readFileSync(path.join(root, '.local/hosted-fixture.json')));
  const c = client(); ok(await c.auth.signInWithPassword(fixture.accounts[role])); return c;
}
module.exports = { root, config, projectRef, fixtureFile: '.local/hosted-fixture.json', hosted: true, sql, sqlAsync, client, service, ok, login, verify };
