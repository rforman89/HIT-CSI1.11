// Destructive fictional drill. This executable has an independent, fixed TEST/LOCAL allowlist.
import fs from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {TABLES,TEST,LOCAL,assertTarget,ok,runBackup,validateBundle} from '../../supabase/functions/_shared/backup.mjs';
import {restoreBundle,listUsers} from './restore.mjs';
const {values}=parseArgs({options:{target:{type:'string'},confirm:{type:'string'},'smoke-url':{type:'string'},state:{type:'string'}}});
async function main(){
 const target=values.target;
 if(![TEST,LOCAL].includes(target)||values.confirm!==`DRILL ${target}`)throw Error('exact_test_target_and_confirmation_required');
 const hosted=target===TEST;
 const config=JSON.parse(await fs.readFile(hosted?'.local/hosted-backend.json':'.local/test-backend.json','utf8'));
 assertTarget(target,config.API_URL,config.SERVICE_ROLE_KEY);
 console.log(`DESTRUCTIVE FICTIONAL DRILL TARGET: ${target}`);
 const client=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const preflight=ok(await client.rpc('restore_preflight',{target_ref:target}));
 const fixture=JSON.parse(await fs.readFile(hosted?'.local/hosted-fixture.json':'.local/fixture.json','utf8'));
 const groups=ok(await client.from('groups').select('name'));
 if(groups.some(g=>!/^TEST -/.test(g.name)))throw Error('non_fixture_groups_present');
 const users=await listUsers(client);
 if(users.some(u=>!u.email?.endsWith('@example.test')))throw Error('non_fictional_accounts_present');
 const start=performance.now(),phases={};
 ok(await client.from('app_settings').upsert({key:'game_mode',value:'test',updated_at:new Date().toISOString()}));
 ok(await client.from('clues_base').update({file_url:null,pdf_url:null}).not('id','is',null));
 ok(await client.from('suspects').update({photo_url:null}).not('id','is',null));
 const pdf=new TextEncoder().encode('%PDF-1.4\nCSI HIT fictional recovery drill\n%%EOF');
 ok(await client.storage.from('clue-files').upload('recovery/drill.pdf',pdf,{contentType:'application/pdf',upsert:true}));
 ok(await client.from('clues_base').update({file_url:'recovery/drill.pdf'}).eq('id',fixture.clue));
 const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
 ok(await client.storage.from('suspect-photos').upload('recovery/drill.png',png,{contentType:'image/png',upsert:true}));
 ok(await client.from('suspects').update({photo_url:`${config.API_URL}/storage/v1/object/public/suspect-photos/recovery/drill.png`}).eq('id',fixture.suspect));
 ok(await client.from('group_clues').upsert({group_id:fixture.groupA,clue_id:fixture.clue,status:'released',source:'manual',released_at:'2026-09-23T12:00:00Z'},{onConflict:'group_id,clue_id'}));
 ok(await client.from('suspect_users').upsert({suspect_id:fixture.suspect,user_id:fixture.users.suspect},{onConflict:'suspect_id,user_id'}));
 ok(await client.from('suspect_statuses').upsert({group_id:fixture.groupA,suspect_id:fixture.suspect,status:'suspect'},{onConflict:'group_id,suspect_id'}));
 ok(await client.from('groups').update({credits:137}).eq('id',fixture.groupA));
 const notes=Array.from({length:1205},(_,i)=>({id:`88888888-8888-4888-8888-${String(i).padStart(12,'0')}`,group_id:fixture.groupA,suspect_id:fixture.suspect,user_id:fixture.users.a,note:`Fictieve herstelnotitie ${i}`,created_at:'2026-09-23T12:00:00Z'}));
 for(let i=0;i<notes.length;i+=200)ok(await client.from('suspect_notes').upsert(notes.slice(i,i+200)));
 const admin=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 ok(await admin.auth.signInWithPassword(fixture.accounts.admin));
 ok(await admin.rpc('mutate_group_credits',{target_group_id:fixture.groupA,amount_change:5,mutation_reason:'Fictieve herstelproef',action_id:crypto.randomUUID()}));
 phases.fixture_ms=performance.now()-start;
 let phase=performance.now();const result=await runBackup(client,{source:'drill',projectRef:target});
 const file=`.local/drill-${result.backup_id}.json`;await fs.writeFile(file,JSON.stringify(result.bundle),{flag:'wx'});
 phases.backup_ms=performance.now()-phase;
 const bundle=await validateBundle(JSON.parse(await fs.readFile(file,'utf8')));
 const expected={group_credits:142,notes:bundle.datasets.suspect_notes.length,transactions:bundle.datasets.credit_transactions.length,files:bundle.files.length};
 await fs.writeFile(`.local/drill-${result.backup_id}-expected.json`,JSON.stringify(expected,null,2),{flag:'wx'});
 phase=performance.now();
 ok(await client.rpc('restore_database',{target_ref:target,confirmation:`RESTORE ${target}`,datasets:Object.fromEntries(TABLES.map(t=>[t,[]])),fingerprint:preflight.schema_fingerprint}));
 if(ok(await client.from('groups').select('id')).length!==0)throw Error('wipe_not_verified');
 for(const file of bundle.files)ok(await client.storage.from(file.bucket).remove([file.path]));
 phases.wipe_ms=performance.now()-phase;
 const report=await restoreBundle(client,bundle,{target,url:config.API_URL,key:config.SERVICE_ROLE_KEY,confirmation:`RESTORE ${target}`});
 phase=performance.now();
 for(const role of ['admin','a','suspect']){
  const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  ok(await c.auth.signInWithPassword(fixture.accounts[role]));ok(await c.from('profiles').select('id,role'));await c.auth.signOut();
 }
 phases.role_login_ms=performance.now()-phase;
 const credits=ok(await client.from('groups').select('credits').eq('id',fixture.groupA).single()).credits;
 if(credits!==142)throw Error('balance_mismatch');
 const reportFile=`.local/drill-${result.backup_id}-report.json`;
 await fs.writeFile(reportFile,JSON.stringify({...report,expected,phases,incident_to_api_login_ms:performance.now()-start,hosted,browser_smoke_pending:true},null,2),{flag:'wx'});
 if(values['smoke-url']){
  execFileSync(process.execPath,['scripts/recovery/drill-smoke.mjs','--target',target,'--report',reportFile,'--url',values['smoke-url'],...(values.state?['--state',values.state]:[])],{stdio:'inherit'});
  const completed=JSON.parse(await fs.readFile(reportFile,'utf8'));completed.incident_to_browser_ready_ms=performance.now()-start;
  await fs.writeFile(reportFile,JSON.stringify(completed,null,2));
 }
 console.log(`${report.summary}; three role logins verified; browser smoke ${values['smoke-url']?'passed':'still required'}. Report ID ${result.backup_id}`);
}
main().catch(()=>{console.error('Drill failed. Keep TEST closed, preserve artifacts, inspect backend logs.');process.exitCode=1;});
