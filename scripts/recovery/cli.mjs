import fs from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {assertTarget,PROD,TEST,LOCAL,MAX_BYTES,validateBundle,runBackup} from '../../supabase/functions/_shared/backup.mjs';
import {restoreBundle} from './restore.mjs';

const {values,positionals}=parseArgs({allowPositionals:true,options:{config:{type:'string'},target:{type:'string'},bundle:{type:'string'},out:{type:'string'},confirm:{type:'string'},'recreate-accounts':{type:'boolean'},help:{type:'boolean'}}});
async function main() {
 const command=positionals[0];
 if(values.help||!command) { console.log('backup --config <private-json> --target <ref> --out <new.json> | verify --bundle <json> | restore --config <private-json> --target <ref> --bundle <json> --confirm "RESTORE <ref>" [--recreate-accounts] --out <new-report.json>'); return; }
 if(!['backup','verify','restore'].includes(command)) throw new Error('unknown_command');
 let bundle;
 if(command!=='backup') {
  if(!values.bundle||(await fs.stat(values.bundle)).size>MAX_BYTES) throw new Error('invalid_bundle_file');
  bundle=await validateBundle(JSON.parse(await fs.readFile(values.bundle,'utf8')));
  console.log(`Bundle verified: ${bundle.manifest.backup_id}; ${Object.keys(bundle.datasets).length} datasets; ${bundle.files.length} files`);
 }
 if(command==='verify') return;
 if(!values.config||!values.target||!values.out) throw new Error('explicit_config_target_output_required');
 const config=JSON.parse(await fs.readFile(values.config,'utf8'));
 const {API_URL,SERVICE_ROLE_KEY}=config;
 if(config.PROJECT_REF&&config.PROJECT_REF!==values.target) throw new Error('config_target_mismatch');
 if(command==='restore') assertTarget(values.target,API_URL,SERVICE_ROLE_KEY);
 else if(![TEST,LOCAL,PROD].includes(values.target)||API_URL!==(values.target===LOCAL?'http://127.0.0.1:55421':`https://${values.target}.supabase.co`)) throw new Error('backup_target_mismatch');
 console.log(`${command} target: ${values.target} (${API_URL})`);
 // Reserve output before mutations; never silently overwrite an existing artifact.
 const output=await fs.open(values.out,'wx');
 try {
  const client=createClient(API_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  if(command==='backup') {
   const result=await runBackup(client,{source:'portable',projectRef:values.target,release:process.env.CSI_RELEASE||null});
   if(!result.bundle) throw new Error('backup_not_complete');
   await output.writeFile(JSON.stringify(result.bundle));
   console.log(`Portable bundle saved: ${result.backup_id}. Copy this private artifact off-project.`);
  } else {
   const report=await restoreBundle(client,bundle,{target:values.target,url:API_URL,key:SERVICE_ROLE_KEY,confirmation:values.confirm,recreate:values['recreate-accounts'],onPhase:p=>console.log(`Verified phase: ${p}`)});
   await output.writeFile(JSON.stringify(report,null,2)); console.log(report.summary);
  }
 } catch(error) {
  await output.writeFile(JSON.stringify({status:'failed',code:'recovery_failed',report:error.report||null}));
  throw error;
 } finally { await output.close(); }
}
main().catch(()=>{console.error('Recovery failed. Keep the game closed; inspect the report and runbook. No secrets logged.');process.exitCode=1;});
