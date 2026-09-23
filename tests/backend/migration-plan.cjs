const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
// The legacy bootstrap is TEST ONLY, before the historical production migrations.
const beforeManifest = ['tests/backend/supabase/migrations/20260923171313_legacy_test_base.sql',
  ...fs.readdirSync(path.join(root, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'supabase/migrations/' + f)];
const manifestPolicy = 'tests/backend/supabase/migrations/20260923171919_manifest_deny_policy.sql';
const files = [...beforeManifest, manifestPolicy];
function bundle() {
  let result = "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') THEN RAISE EXCEPTION 'Test bootstrap requires an empty application schema'; END IF; END $$;\n";
  for (const file of beforeManifest) result += `\n-- Source: ${file}\n` + fs.readFileSync(path.join(root,file),'utf8').replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'');
  result += "\nCREATE TABLE private.test_migration_manifest (file text PRIMARY KEY, sha256 text NOT NULL); ALTER TABLE private.test_migration_manifest ENABLE ROW LEVEL SECURITY; REVOKE ALL ON private.test_migration_manifest FROM PUBLIC, anon, authenticated;\n";
  for (const file of files) result += `INSERT INTO private.test_migration_manifest VALUES ('${file}', '${createHash('sha256').update(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n')).digest('hex')}');\n`;
  result += "INSERT INTO public.app_settings(key,value) VALUES ('game_mode','test'),('final_reports_open','false'),('test_environment','ksnagauoufsriwplvvtd');\n";
  result += fs.readFileSync(path.join(root,'tests/backend/supabase/migrations/20260923171919_manifest_deny_policy.sql'),'utf8');
  return result;
}
module.exports = { files, bundle };
if (require.main === module) { fs.mkdirSync(path.join(root,'.local'),{recursive:true}); fs.writeFileSync(path.join(root,'.local/hosted-bootstrap.sql'),bundle()); console.log('Test-only migration bundle prepared from '+files.length+' repository migrations.'); }
