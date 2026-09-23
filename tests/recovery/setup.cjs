const fs=require('node:fs');
const {sql}=require('../backend/local.cjs');
// local.cjs hardcodes the isolated 55421/55422 stack. Never accepts hosted env overrides.
if(sql("SELECT to_regprocedure('public.backup_begin(uuid,text,uuid)') IS NULL")==='t') {
 sql(fs.readFileSync('supabase/migrations/20260923182309_backup_restore_operations.sql','utf8'));
}
sql("INSERT INTO public.app_settings(key,value) VALUES('test_environment','csi-hit-reliability') ON CONFLICT(key) DO UPDATE SET value=excluded.value; NOTIFY pgrst,'reload schema';");
console.log('LOCAL operations schema/marker prepared.');
