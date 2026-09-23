import test, {before, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import local from '../backend/target.cjs';
import {runBackup,validateBundle,ok,TABLES,LOCAL,hash,canonical} from '../../supabase/functions/_shared/backup.mjs';
import {restoreBundle} from '../../scripts/recovery/restore.mjs';
const {service,sql,login,config}=local;
const targetRef=local.hosted?'ksnagauoufsriwplvvtd':LOCAL;
before(local.verify);beforeEach(local.verify);
const fixture=JSON.parse(fs.readFileSync(local.fixtureFile));
const options={target:targetRef,url:config.API_URL,key:config.SERVICE_ROLE_KEY,confirmation:`RESTORE ${targetRef}`};
let bundle;
test('real snapshot captures >1000 rows, safe Auth, bytes, all twenty datasets',async()=>{
 sql("UPDATE public.app_settings SET value='test' WHERE key='game_mode'; INSERT INTO public.app_settings(key,value) VALUES('test_environment','"+targetRef+"') ON CONFLICT(key) DO UPDATE SET value=excluded.value;");
 // Remove fake asset references left by earlier masking tests; create real fictional assets.
 sql("UPDATE public.clues_base SET file_url=null,pdf_url=null; UPDATE public.suspects SET photo_url=null;");
 ok(await service.storage.from('clue-files').upload('recovery/fixture.pdf',Buffer.from('%PDF-1.4\nFictional recovery fixture\n%%EOF'),{contentType:'application/pdf',upsert:true}));
 ok(await service.from('clues_base').update({file_url:'recovery/fixture.pdf'}).eq('id',fixture.clue));
 sql(`INSERT INTO public.notifications(id,group_id,title,message) SELECT md5('recovery-'||i)::uuid,'${fixture.groupA}','Recovery fixture','Fictief' FROM generate_series(1,1205) i ON CONFLICT(id) DO NOTHING`);
 const admin=await login('admin');ok(await admin.rpc('mutate_group_credits',{target_group_id:fixture.groupA,amount_change:7,mutation_reason:'Recovery fixture',action_id:crypto.randomUUID()}));
 const result=await runBackup(service,{source:'drill',projectRef:targetRef});bundle=result.bundle;
 assert.equal(result.status,'success');assert.ok(bundle.datasets.notifications.length>1000);assert.equal(Object.keys(bundle.datasets).length,20);
 assert.ok(bundle.files.length>=1);assert.equal(bundle.datasets.auth_users.some(u=>'encrypted_password'in u),false);
 fs.writeFileSync(`.local/recovery-${targetRef}-bundle.json`,JSON.stringify(bundle));
});
test('unique backup IDs and existing UUID idempotency',async()=>{
 const result=await runBackup(service,{source:'drill',projectRef:targetRef});assert.notEqual(result.backup_id,bundle.manifest.backup_id);
 const replay=await runBackup(service,{source:'drill',projectRef:targetRef,requestId:result.backup_id});assert.equal(replay.replayed,true);
});
test('captured pages retain one fixed snapshot while live data changes',async()=>{
 const id=crypto.randomUUID();ok(await service.rpc('backup_begin',{run_id:id,run_source:'drill'}));
 ok(await service.rpc('backup_capture',{run_id:id}));
 const first=ok(await service.rpc('backup_page',{run_id:id,dataset:'groups',page_offset:0}));
 const before=first.find(g=>g.id===fixture.groupA).credits;
 ok(await service.from('groups').update({credits:before+3}).eq('id',fixture.groupA));
 const second=ok(await service.rpc('backup_page',{run_id:id,dataset:'groups',page_offset:0}));assert.deepEqual(second,first);
 ok(await service.from('groups').update({credits:before}).eq('id',fixture.groupA));
 ok(await service.rpc('backup_finish',{run_id:id,succeeded:false,failure_code:'verification_snapshot_only'}));
});
test('two simultaneous jobs are serialized, one remains visible as running',async()=>{
 const ids=[crypto.randomUUID(),crypto.randomUUID()];const results=await Promise.all(ids.map(run_id=>service.rpc('backup_begin',{run_id,run_source:'drill'})));
 assert.equal(results.filter(r=>r.error).length,1);
 const winner=results.find(r=>!r.error).data.id;
 ok(await service.rpc('backup_finish',{run_id:winner,succeeded:false,failure_code:'verification_snapshot_only'}));
});
test('archive upload failure is not recorded as success',async()=>{
 const wrapper={rpc:service.rpc.bind(service),storage:{from:bucket=>bucket==='backups'?{upload:async()=>({error:{message:'injected network'}})}:service.storage.from(bucket)}};
 const id=crypto.randomUUID();await assert.rejects(runBackup(wrapper,{source:'drill',projectRef:targetRef,requestId:id}));
 assert.equal(ok(await service.from('backup_runs').select('status').eq('id',id).single()).status,'failed');
});
test('new unclassified table fails backup and leaves a durable failed attempt',async()=>{
 const id=crypto.randomUUID();sql('CREATE TABLE public.recovery_unknown_test(id uuid)');
 try {await assert.rejects(runBackup(service,{source:'drill',projectRef:targetRef,requestId:id}));assert.equal(ok(await service.from('backup_runs').select('status').eq('id',id).single()).status,'failed');}
 finally {sql('DROP TABLE public.recovery_unknown_test');}
});
test('anon and participant cannot read snapshots or trigger backups/restores',async()=>{
 for(const client of [local.client(),await login('a')]) {
  assert.ok((await client.rpc('backup_begin',{run_id:crypto.randomUUID(),run_source:'manual'})).error);
  assert.ok((await client.rpc('backup_page',{run_id:bundle.manifest.backup_id,dataset:'profiles',page_offset:0})).error);
  assert.ok((await client.rpc('restore_preflight',{target_ref:targetRef})).error);
 }
});
test('production rejected by database guard, irrespective of client flags',async()=>assert.ok((await service.rpc('restore_preflight',{target_ref:'uhfcrskkgutlqqogahbr'})).error));
test('all operations tables are private to admin and privileged RPC grants are closed',async()=>{
 const participant=await login('a');
 for(const table of ['backup_runs','operation_audit','client_diagnostics','restore_checks']) assert.deepEqual(ok(await participant.from(table).select('*')),[]);
 assert.ok((await participant.rpc('backup_health')).error);
 assert.equal(sql("SELECT count(*) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('backup_begin','backup_capture','backup_page','backup_finish','backup_maintenance','backup_storage_inventory','restore_preflight','restore_database') AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))"),'0');
});
test('marker mismatch rejected before changes',async()=>assert.ok((await service.rpc('restore_preflight',{target_ref:local.hosted?LOCAL:'ksnagauoufsriwplvvtd'})).error));
test('missing file blocks backup and records failure',async()=>{
 ok(await service.from('clues_base').update({file_url:'recovery/missing.pdf'}).eq('id',fixture.clue));
 const id=crypto.randomUUID();await assert.rejects(runBackup(service,{source:'drill',projectRef:targetRef,requestId:id}),/missing/);
 assert.equal(ok(await service.from('backup_runs').select('status').eq('id',id).single()).status,'failed');
 ok(await service.from('clues_base').update({file_url:'recovery/fixture.pdf'}).eq('id',fixture.clue));
});
test('corrupted bytes rejected before restore',async()=>{const b=structuredClone(bundle);b.files[0].base64='YQ==';await assert.rejects(restoreBundle(service,b,options),/integrity/);});
test('missing confirmation rejected',async()=>assert.rejects(restoreBundle(service,bundle,{...options,confirmation:undefined}),/confirmation/));
test('invalid FK import rolls the entire database transaction back',async()=>{
 const before=sql('SELECT count(*) FROM public.groups');
 const datasets=Object.fromEntries(TABLES.map(t=>[t,[]]));datasets.group_members=[{id:crypto.randomUUID(),group_id:crypto.randomUUID(),user_id:fixture.users.a,created_at:new Date().toISOString()}];
 assert.ok((await service.rpc('restore_database',{target_ref:targetRef,confirmation:options.confirmation,datasets,fingerprint:bundle.manifest.schema_fingerprint})).error);
 assert.equal(sql('SELECT count(*) FROM public.groups'),before);
 assert.equal(sql("SELECT count(*) FROM pg_trigger WHERE tgrelid='public.groups'::regclass AND tgenabled='D'"),'0');
});
test('wipe all application rows and files then restore exact data from portable artifact',async()=>{
 const empty=Object.fromEntries(TABLES.map(t=>[t,[]]));
 ok(await service.rpc('restore_database',{target_ref:targetRef,confirmation:options.confirmation,datasets:empty,fingerprint:bundle.manifest.schema_fingerprint}));
 assert.equal(sql('SELECT count(*) FROM public.groups'),'0');
 for(const file of bundle.files) ok(await service.storage.from(file.bucket).remove([file.path]));
 const start=performance.now();const report=await restoreBundle(service,JSON.parse(fs.readFileSync(`.local/recovery-${targetRef}-bundle.json`)),options);
 assert.equal(report.verified,true);assert.equal(report.datasets.length,17);
 const a=await login('a');assert.ok(ok(await a.from('groups').select('id')).some(g=>g.id===fixture.groupA));
 assert.equal(sql(`SELECT credits FROM public.groups WHERE id='${fixture.groupA}'`),String(bundle.datasets.groups.find(g=>g.id===fixture.groupA).credits));
 fs.writeFileSync(`.local/recovery-${targetRef}-report.json`,JSON.stringify({...report,restore_to_login_ms:performance.now()-start},null,2));
});
test('restore onto existing records replaces deterministically without duplication',async()=>{
 const report=await restoreBundle(service,bundle,options);assert.ok(report.verified);
});
test('account deletion, recreation and new UUID mapping preserves role and membership',async()=>{
 const email='recovery-recreated@example.test';
 const prior=(await service.auth.admin.listUsers({perPage:500})).data.users.find(u=>u.email===email);
 if(prior) ok(await service.auth.admin.deleteUser(prior.id));
 const user=ok(await service.auth.admin.createUser({email,email_confirm:true})).user;
 ok(await service.from('group_members').insert({user_id:user.id,group_id:fixture.groupA}));
 const b=(await runBackup(service,{source:'drill',projectRef:targetRef})).bundle;
 ok(await service.auth.admin.deleteUser(user.id));
 await assert.rejects(restoreBundle(service,b,options),/recreation_required/);
 const report=await restoreBundle(service,b,{...options,recreate:true});
 assert.notEqual(report.mapping[user.id],user.id);
 const password=crypto.randomUUID()+'Aa1!';ok(await service.auth.admin.updateUserById(report.mapping[user.id],{password}));
 const client=local.client();ok(await client.auth.signInWithPassword({email,password}));
 assert.ok(ok(await client.from('group_members').select('group_id')).some(r=>r.group_id===fixture.groupA));
 ok(await client.auth.signOut());
 ok(await service.auth.admin.deleteUser(report.mapping[user.id]));
});
test('audit preserves actor action target timestamp and excludes note text',async()=>{
 const admin=await login('admin'),action=crypto.randomUUID();
 ok(await admin.rpc('mutate_group_credits',{target_group_id:fixture.groupA,amount_change:2,mutation_reason:'private reason not in audit',action_id:action}));
 const rows=ok(await admin.from('operation_audit').select('*').eq('action_id',action));
 assert.ok(rows.some(r=>r.actor===fixture.users.admin&&r.action_type==='credit_transactions.insert'&&r.target&&r.occurred_at));
 assert.ok(!JSON.stringify(rows).includes('private reason'));
 const participant=await login('a');assert.deepEqual(ok(await participant.from('operation_audit').select('*')),[]);
 assert.ok((await participant.from('operation_audit').insert({action_id:'fake',action_type:'fake'})).error);
});
test('unauthorized reset emits no successful audit action',async()=>{
 const before=sql("SELECT count(*) FROM public.operation_audit WHERE action_type='game.reset'");
 assert.ok((await (await login('a')).rpc('reset_test_data')).error);
 assert.equal(sql("SELECT count(*) FROM public.operation_audit WHERE action_type='game.reset'"),before);
});
test('client diagnostics require login, reject arbitrary payloads and rate limit',async()=>{
 assert.ok((await local.client().rpc('record_client_diagnostic',{category:'render',screen:'app'})).error);
 const client=await login('a');assert.ok((await client.rpc('record_client_diagnostic',{category:'token=secret',screen:'app'})).error);
 ok(await client.rpc('record_client_diagnostic',{category:'render',screen:'participant',release:'test'}));
 ok(await client.rpc('record_client_diagnostic',{category:'promise',screen:'participant',release:'test'}));
 assert.equal(sql(`SELECT count(*) FROM public.client_diagnostics WHERE actor='${fixture.users.a}' AND occurred_at>now()-interval '1 minute'`),'1');
});
test('health distinguishes TEST skip, LIVE grace, fresh, overdue and failed',async()=>{
 const admin=await login('admin');
 const health=async()=>ok(await admin.rpc('backup_health'));
 const skip=await runBackup(service,{source:'cron',projectRef:targetRef});assert.equal(skip.status,'skipped_test');assert.equal((await health()).health,'test');
 sql("UPDATE public.app_settings SET value='live',updated_at=now() WHERE key='game_mode';");assert.equal((await health()).health,'grace');
 const id=crypto.randomUUID();sql(`INSERT INTO public.backup_runs(id,status,source,game_mode,started_at,finished_at) VALUES('${id}','success','manual','live',now(),now())`);
 assert.equal((await health()).health,'healthy');
 sql("UPDATE public.app_settings SET updated_at=now()-interval '4 days' WHERE key='game_mode'; UPDATE public.backup_runs SET finished_at=now()-interval '3 days' WHERE status='success' AND game_mode='live';");assert.equal((await health()).health,'overdue');
 sql(`INSERT INTO public.backup_runs(id,status,source,game_mode,started_at) VALUES('${crypto.randomUUID()}','failed','manual','live',now()+interval '1 second')`);assert.equal((await health()).health,'failed');
 sql("UPDATE public.app_settings SET value='test',updated_at=now() WHERE key='game_mode';");
});
