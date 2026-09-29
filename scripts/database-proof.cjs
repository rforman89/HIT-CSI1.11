// Schema-only replay in a NEW disposable DB inside the existing dedicated LOCAL container.
// No hosted URL, project ref, linked target, or configurable container is accepted.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
process.chdir(path.resolve(__dirname, '..'));
const container = 'supabase_db_csi-hit-reliability';
const database = 'csi_buildproof_' + randomBytes(8).toString('hex');
const docker = (...args) => execFileSync(process.env.CSI_DOCKER || 'docker', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const sql = (db, input, user = 'postgres') => execFileSync(process.env.CSI_DOCKER || 'docker', ['exec','-i',container,'psql','-X','-U',user,'-d',db,'-v','ON_ERROR_STOP=1','-Atq'], { input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
fs.mkdirSync('.local/build-hardening', { recursive: true });
let created = false;
try {
  // Supabase-managed platform objects come from the installed LOCAL stack, with no data.
  let platform = docker('exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--no-publications','--no-subscriptions','--exclude-schema=public','--exclude-schema=private','--exclude-schema=supabase_migrations');
  platform = platform.replace(/^CREATE TRIGGER[^;]*EXECUTE FUNCTION (?:public|private)\.[^;]*;\s*$/gm, '')
    .replace(/^CREATE POLICY[^;]*;\s*$/gm, '');
  sql('postgres', `CREATE DATABASE ${database} TEMPLATE template0;`); created = true;
  sql(database, platform, 'supabase_admin');
  // Supabase's public defaults are platform prerequisites, absent from a bare template0 DB.
  sql(database, fs.readFileSync('supabase/bootstrap/platform-defaults.sql','utf8'));
  sql(database, 'CREATE PUBLICATION supabase_realtime;');
  const files = ['tests/backend/supabase/migrations/20260923171313_legacy_test_base.sql', ...fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort().map(x=>'supabase/migrations/'+x)];
  for (const file of files) { sql(database, fs.readFileSync(file,'utf8')); console.log('Applied '+file); }
  const catalog = sql(database, fs.readFileSync('scripts/schema-catalog.sql','utf8')).trim();
  fs.writeFileSync('.local/build-hardening/schema-expected.json', JSON.stringify(JSON.parse(catalog),null,2)+'\n');
  sql(database, fs.readFileSync('supabase/bootstrap/test-seed.sql','utf8'));
  sql(database, fs.readFileSync('supabase/bootstrap/test-seed.sql','utf8'));
  console.log('Fresh database replay passed: '+files.length+' ordered SQL files; catalog captured.');
} finally {
  // Only a database that this invocation created with a generated safe identifier.
  if (created) sql('postgres', `DROP DATABASE ${database};`);
}
