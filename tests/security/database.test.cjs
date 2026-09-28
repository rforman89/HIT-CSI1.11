const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID}=require('node:crypto');
const {service,sql,ok,client,login,config,fixtureFile,verify,hosted}=require('../backend/target.cjs');
const f=JSON.parse(fs.readFileSync(fixtureFile));
let actors={};
const tables=['groups','suspects','clues','clue_categories','group_members','group_clues','suspect_notes','suspect_statuses','notifications','credit_transactions','agenda_items','app_settings','final_reports','operation_audit','backup_runs','restore_checks'];

test('Realtime delivers own-group changes but not cross-group, unassigned or inactive rows',async()=>{
 const events={a:[],b:[],unassigned:[],inactive:[]},channels=[];
 const beforeName=ok(await service.from('groups').select('name').eq('id',f.groupA).single()).name;
 try{
  for(const role of Object.keys(events)){
   let ready=false;
   const channel=actors[role].channel('security-'+role+'-'+randomUUID()).on('system',{},p=>{if(p.extension==='postgres_changes'&&p.status==='ok')ready=true;}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'groups',filter:'id=eq.'+f.groupA},p=>events[role].push(p));
   channels.push([actors[role],channel]);
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Realtime subscription timeout')),8000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(Error(status));}});});
   const deadline=Date.now()+15000;while(!ready&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));assert.ok(ready,'Postgres subscription ready');
  }
  ok(await service.from('groups').update({name:beforeName+' [security]'}).eq('id',f.groupA));
  const end=Date.now()+8000;while(!events.a.length&&Date.now()<end)await new Promise(r=>setTimeout(r,100));
  assert.ok(events.a.length>0,'authorized control receives event');
  await new Promise(r=>setTimeout(r,400));
  for(const role of ['b','unassigned','inactive'])assert.equal(events[role].length,0,role);
  ok(await service.from('profiles').update({is_active:false}).eq('id',f.users.a));events.a.length=0;
  ok(await service.from('groups').update({name:beforeName+' [revoked]'}).eq('id',f.groupA));
  await new Promise(r=>setTimeout(r,600));assert.equal(events.a.length,0,'old channel stops delivering after deactivation');
 }finally{
  for(const [actor,channel]of channels)await actor.removeChannel(channel);
  ok(await service.from('profiles').update({is_active:true}).eq('id',f.users.a));
  ok(await service.from('groups').update({name:beforeName}).eq('id',f.groupA));
 }
});
test('jury cannot fetch unreferenced storage objects; admin may clean them',async()=>{
 const path='security/orphan-'+randomUUID()+'.pdf';
 ok(await actors.admin.storage.from('clue-files').upload(path,Buffer.from('%PDF-1.4 test'),{contentType:'application/pdf'}));
 try{assert.ok((await actors.jury.storage.from('clue-files').download(path)).error);assert.ok((await actors.admin.storage.from('clue-files').download(path)).data);
 ok(await actors.admin.storage.from('clue-files').upload(path,Buffer.from('%PDF-1.4 replaced'),{contentType:'application/pdf',upsert:true}));
 }finally{ok(await actors.admin.storage.from('clue-files').remove([path]));}
 const {data:{session}}=await actors.admin.auth.getSession();
 const fresh=await fetch(config.API_URL+'/storage/v1/object/authenticated/clue-files/'+path+'?deleted='+randomUUID(),{headers:{apikey:config.ANON_KEY,Authorization:'Bearer '+session.access_token}});assert.notEqual(fresh.status,200,'fresh download after deletion');
});

const denied=result=>{if(!result.error)assert.equal(result.data?.length||0,0)};
before(async()=>{
 await verify();
 for(const role of ['admin','a','b','suspect','jury','unassigned','inactive','no_profile']) actors[role]=await login(role);
 actors.anon=client();
 sql("DELETE FROM public.profiles WHERE id='"+f.users.no_profile+"'");
});
after(async()=>{
 ok(await service.from('profiles').upsert({id:f.users.no_profile,email:f.accounts.no_profile.email,role:'participant',is_active:true}));
 for(const c of Object.values(actors)){await c.removeAllChannels();await c.auth.signOut();c.realtime.disconnect();}
});
for(const role of ['anon','unassigned','inactive','no_profile'])test(role+': no private rows across application and operations',async()=>{
 for(const table of tables)denied(await actors[role].from(table).select('*').limit(2));
});
for(const role of ['a','b'])test(role+': own group only, no escalation or privileged RPC',async()=>{
 const c=actors[role],own=role==='a'?f.groupA:f.groupB,other=role==='a'?f.groupB:f.groupA;
 assert.equal(ok(await c.from('groups').select('id')).some(g=>g.id===own),true);
 denied(await c.from('groups').select().eq('id',other));
 denied(await c.from('suspect_notes').select().eq('group_id',other));
 denied(await c.from('profiles').update({role:'admin'}).eq('id',f.users[role]).select());
 assert.equal(ok(await service.from('profiles').select('role').eq('id',f.users[role]).single()).role,'participant');
 for(const [fn,args]of [['mutate_group_credits',{target_group_id:own,amount_change:1,mutation_reason:'abuse',action_id:randomUUID()}],['release_group_clue',{target_purchase_id:randomUUID()}],['reset_test_data',{}],['backup_health',{}],['backup_begin',{run_id:randomUUID(),run_source:'manual'}],['restore_preflight',{target_ref:'csi-hit-reliability'}]]) assert.ok((await c.rpc(fn,args)).error,fn);
 denied(await c.from('operation_audit').select());
});
test('cross-group note INSERT/UPDATE and forged author blocked',async()=>{
 for(const row of [{group_id:f.groupB,user_id:f.users.a},{group_id:f.groupA,user_id:f.users.b}])assert.ok((await actors.a.from('suspect_notes').insert({...row,suspect_id:f.suspect,note:'forged'})).error);
 const note=ok(await actors.a.from('suspect_notes').insert({group_id:f.groupA,user_id:f.users.a,suspect_id:f.suspect,note:'own'}).select().single());
 assert.ok((await actors.a.from('suspect_notes').update({group_id:f.groupB}).eq('id',note.id)).error);
 ok(await actors.a.from('suspect_notes').delete().eq('id',note.id));
});
test('membership removal and inactive group revoke reads and purchase immediately with old token',async()=>{
 await service.from('groups').update({is_active:false}).eq('id',f.groupA).then(ok);
 try {for(const table of ['groups','clues','suspects','suspect_notes','agenda_items'])denied(await actors.a.from(table).select());assert.ok((await actors.a.rpc('purchase_clue',{target_group_id:f.groupA,target_clue_id:f.securityClue})).error);}
 finally {ok(await service.from('groups').update({is_active:true}).eq('id',f.groupA));}
 ok(await service.from('group_members').delete().eq('user_id',f.users.a));
 try{denied(await actors.a.from('clues').select());assert.ok((await actors.a.rpc('purchase_clue',{target_group_id:f.groupA,target_clue_id:f.securityClue})).error);}
 finally{ok(await service.from('group_members').insert({group_id:f.groupA,user_id:f.users.a}));}
});
test('inactive admin loses technical rights immediately',async()=>{
 ok(await service.from('profiles').update({is_active:false}).eq('id',f.users.admin));
 try{assert.ok((await actors.admin.rpc('backup_health')).error);denied(await actors.admin.from('clue_categories').insert({name:'forged'}).select());}
 finally{ok(await service.from('profiles').update({is_active:true}).eq('id',f.users.admin));}
});
test('suspect reads only own dossier, cannot act as participant even with stale membership',async()=>{
 assert.deepEqual(ok(await actors.suspect.from('suspects').select('id')).map(x=>x.id),[f.suspect]);
 denied(await actors.suspect.from('suspect_notes').select().eq('suspect_id',f.securitySuspect));
 ok(await service.from('group_members').insert({user_id:f.users.suspect,group_id:f.groupA}));
 try{assert.ok((await actors.suspect.rpc('purchase_clue',{target_group_id:f.groupA,target_clue_id:f.securityClue})).error);}
 finally{ok(await service.from('group_members').delete().eq('user_id',f.users.suspect));}
});
test('jury sees dossiers without user emails, audit or account administration',async()=>{
 assert.ok(ok(await actors.jury.from('suspect_notes').select()).length>0);
 assert.ok(ok(await actors.jury.from('groups').select()).length>=2);
 assert.equal(ok(await actors.jury.from('profiles').select()).length,1);
 denied(await actors.jury.from('group_members').select());
 for(const table of ['operation_audit','backup_runs','restore_checks','client_diagnostics'])denied(await actors.jury.from(table).select());
 for(const fn of ['reset_test_data','delete_demo_data','backup_health'])assert.ok((await actors.jury.rpc(fn)).error);
 denied(await actors.jury.from('app_settings').update({value:'live'}).eq('key','game_mode').select());
 denied(await actors.jury.from('profiles').update({role:'admin'}).eq('id',f.users.jury).select());
 denied(await actors.jury.from('suspect_notes').update({note:'forged'}).eq('group_id',f.groupB).select());
});
test('jury credit RPC is authorized, audited and idempotent, requires reason',async()=>{
 const id=randomUUID(),params={target_group_id:f.groupB,amount_change:2,mutation_reason:'Jury lokale correctie',action_id:id};
 const before=ok(await service.from('groups').select('credits').eq('id',f.groupB).single()).credits;
 ok(await actors.jury.rpc('mutate_group_credits',params));assert.equal(ok(await actors.jury.rpc('mutate_group_credits',params)).replayed,true);
 assert.equal(ok(await service.from('groups').select('credits').eq('id',f.groupB).single()).credits,before+2);
 const row=ok(await service.from('credit_transactions').select().eq('action_id',id).single());assert.equal(row.created_by,f.users.jury);
 assert.ok((await actors.jury.rpc('mutate_group_credits',{...params,action_id:randomUUID(),mutation_reason:''})).error);
 assert.ok(ok(await service.from('operation_audit').select('id').eq('action_id',id)).length>0);
 denied(await actors.jury.from('groups').update({credits:99999}).eq('id',f.groupB).select());
});
test('jury release changes only status and time, repeated release preserves timestamp',async()=>{
 const row=ok(await service.from('group_clues').select().eq('group_id',f.groupB).eq('clue_id',f.securityClue).single());
 ok(await actors.jury.rpc('release_group_clue',{target_purchase_id:row.id}));
 const first=ok(await service.from('group_clues').select().eq('id',row.id).single());
 ok(await actors.jury.rpc('release_group_clue',{target_purchase_id:row.id}));
 assert.deepEqual(ok(await service.from('group_clues').select().eq('id',row.id).single()),first);assert.equal(first.status,'released');
 assert.equal(first.group_id,row.group_id);assert.equal(first.clue_id,row.clue_id);
 denied(await actors.jury.from('group_clues').update({group_id:f.groupA}).eq('id',row.id).select());
});
test('public/anon/unassigned photo reads denied, own participant and jury allowed',async()=>{
 const pub=await fetch(config.API_URL+'/storage/v1/object/public/suspect-photos/security/own.png');assert.notEqual(pub.status,200);
 for(const r of ['anon','unassigned','inactive'])assert.ok((await actors[r].storage.from('suspect-photos').download('security/own.png')).error);
 for(const r of ['a','jury','admin','suspect'])assert.ok((await actors[r].storage.from('suspect-photos').download('security/own.png')).data);
 assert.ok((await actors.suspect.storage.from('suspect-photos').download('security/other.png')).error);
});
test('guessed clue path, paid-content and backup paths do not bypass entitlement',async()=>{
 for(const r of ['anon','unassigned','a','suspect']) assert.ok((await actors[r].storage.from('clue-files').download('security/other.pdf')).error);
 for(const r of ['b','jury','admin'])assert.ok((await actors[r].storage.from('clue-files').download('security/other.pdf')).data);
 for(const r of ['anon','a','jury']){const result=await actors[r].storage.from('backups').list();denied(result);}
 const clue=ok(await actors.a.from('clues').select().eq('id',f.securityClue).single());assert.equal(clue.description,null);assert.equal(clue.file_url,null);
});
test('Storage forbids nonadmin uploads/upserts/deletes, enforces MIME and size',async()=>{
 for(const r of ['anon','a','suspect','jury','unassigned']){
  assert.ok((await actors[r].storage.from('suspect-photos').upload('security/attack.png',Buffer.from('bad'),{contentType:'image/png',upsert:true})).error);
  await actors[r].storage.from('suspect-photos').remove(['security/own.png']);
  assert.ok((await service.storage.from('suspect-photos').download('security/own.png')).data);
 }
 assert.ok((await actors.admin.storage.from('suspect-photos').upload('security/attack.svg',Buffer.from('<svg/>'),{contentType:'image/svg+xml'})).error);
 assert.ok((await actors.admin.storage.from('suspect-photos').upload('security/large.png',Buffer.alloc(10*1024*1024+1),{contentType:'image/png'})).error);
});
test('signed URL works and expires',async()=>{
 const {signedUrl}=ok(await actors.b.storage.from('clue-files').createSignedUrl('security/other.pdf',1));
 assert.equal((await fetch(signedUrl)).status,200);
 await new Promise(r=>setTimeout(r,2200));
 assert.notEqual((await fetch(signedUrl)).status,200);
});
test('signup cannot assign role through metadata and sees no game data before assignment',async()=>{
 const c=client(),email='signup-'+randomUUID()+'@example.test';
 const password=randomUUID()+'A!9';let user;
 if(hosted){
  // Hosted default mailer rejects reserved .test addresses; generate a real signup token without sending email.
  assert.ok((await c.auth.signUp({email,password})).error);
  const generated=ok(await service.auth.admin.generateLink({type:'signup',email,password,options:{data:{role:'admin',is_active:true}}}));user=generated.user;
  const confirmed=ok(await c.auth.verifyOtp({type:'signup',token_hash:generated.properties.hashed_token}));assert.ok(confirmed.session);
 }else({user}=ok(await c.auth.signUp({email,password,options:{data:{role:'admin',is_active:true}}})));
 try{assert.equal(ok(await service.from('profiles').select('role').eq('id',user.id).single()).role,'participant');denied(await c.from('clues').select());}
 finally{await c.auth.signOut();ok(await service.auth.admin.deleteUser(user.id));}
});
test('SQL grants and invoker views remain closed; no new unrestricted definers',()=>{
 assert.equal(sql("SELECT count(*) FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated') AND privilege_type IN ('TRUNCATE','TRIGGER','REFERENCES')"),'0');
 assert.equal(sql("SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND NOT relrowsecurity"),'0');
 assert.equal(sql("SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='v' AND NOT coalesce(reloptions @> ARRAY['security_invoker=true'],false)"),'0');
 assert.equal(sql("SELECT count(*) FROM pg_proc p WHERE p.pronamespace IN ('public'::regnamespace,'private'::regnamespace) AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE')"),'0');
});

test('backup handler denies jury and inactive admin for start AND signed download',async()=>{
 const {createHandler}=await import('../../supabase/functions/_shared/handler.mjs');
 const {createClient}=require('@supabase/supabase-js'),{config}=require('../backend/target.cjs');
 const env={SUPABASE_URL:config.API_URL,SUPABASE_ANON_KEY:config.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:config.SERVICE_ROLE_KEY};
 const handler=createHandler(createClient,key=>env[key]);
 ok(await service.from('profiles').update({is_active:false}).eq('id',f.users.admin));
 try{for(const role of ['jury','admin'])for(const body of [{request_id:randomUUID()},{action:'download',backup_id:randomUUID()}]){
  const {data:{session}}=await actors[role].auth.getSession();
  const send=hosted?fetch:handler;
  const response=await send(new Request(config.API_URL+'/functions/v1/csi-hit-nightly-backup',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  assert.equal(response.status,403);
 }}finally{ok(await service.from('profiles').update({is_active:true}).eq('id',f.users.admin));}
});
