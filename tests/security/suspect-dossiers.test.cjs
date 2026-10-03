const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID}=require('node:crypto');
if(process.env.CSI_BACKEND && process.env.CSI_BACKEND!=='local')throw Error('Cross-dossier validation is LOCAL only');
const {service,client,login,ok}=require('../backend/local.cjs');
const f=JSON.parse(fs.readFileSync('.local/fixture.json'));
let a,b,user;
const denied=r=>{if(!r.error)assert.equal(r.data?.length||0,0);};
before(async()=>{
 a=await login('suspect');b=client();
 const credentials={email:'suspect-b-'+randomUUID()+'@example.test',password:randomUUID()+'A!9'};
 ({user}=ok(await service.auth.admin.createUser({...credentials,email_confirm:true})));
 ok(await service.from('profiles').update({role:'suspect',suspect_id:f.securitySuspect,is_active:true}).eq('id',user.id));
 ok(await b.auth.signInWithPassword(credentials));
});
after(async()=>{for(const c of [a,b])await c?.auth.signOut();if(user)ok(await service.auth.admin.deleteUser(user.id));});
for(const role of ['A','B'])test('suspect '+role+': reads both profiles/photos; cannot write or read foreign research',async()=>{
 const c=role==='A'?a:b,own=role==='A'?f.suspect:f.securitySuspect,other=role==='A'?f.securitySuspect:f.suspect;
 for(const id of [own,other]){
  const row=ok(await c.from('suspects').select('*').eq('id',id).single());
  assert.deepEqual(Object.keys(row).sort(),['id','name','description','photo_url','is_active','sort_order','created_at'].sort());
  assert.ok((await c.storage.from('suspect-photos').download(row.photo_url)).data);
 }
 const original=ok(await service.from('suspects').select('*').eq('id',other).single());
 denied(await c.from('suspects').update({description:'forged'}).eq('id',other).select());
 denied(await c.from('suspects').delete().eq('id',other).select());
 assert.deepEqual(ok(await service.from('suspects').select('*').eq('id',other).single()),original);
 for(const table of ['suspect_notes','suspect_statuses','clues'])denied(await c.from(table).select('*').eq('suspect_id',other));
 // Positive own-note control, plus an actual foreign row for both mirrored checks.
 const note=ok(await service.from('suspect_notes').insert({group_id:f.groupA,user_id:f.users.a,suspect_id:own,note:'Cross-dossier own control'}).select().single());
 try{
  assert.equal(ok(await c.from('suspect_notes').select('id').eq('id',note.id)).length,1);
  const otherActor=role==='A'?b:a;
  denied(await otherActor.from('suspect_notes').select('*').eq('id',note.id));
  denied(await otherActor.from('suspect_notes').update({note:'forged'}).eq('id',note.id).select());
  assert.equal(ok(await service.from('suspect_notes').select('note').eq('id',note.id).single()).note,'Cross-dossier own control');
 }finally{ok(await service.from('suspect_notes').delete().eq('id',note.id));}
 for(const table of ['group_members','credit_transactions','final_reports','operation_audit'])denied(await c.from(table).select('*'));
 const purchases=ok(await c.from('group_clues').select('clue_id'));
 const otherClues=ok(await service.from('clues_base').select('id').eq('suspect_id',other)).map(row=>row.id);
 assert.equal(purchases.some(row=>otherClues.includes(row.clue_id)),false);
 assert.equal(ok(await c.from('profiles').select('id')).length,1);
 denied(await c.from('app_settings').update({value:'live'}).eq('key','game_mode').select());
 denied(await c.from('profiles').update({role:'admin'}).eq('id',role==='A'?f.users.suspect:user.id).select());
 for(const [fn,args] of [['mutate_group_credits',{target_group_id:f.groupA,amount_change:1,mutation_reason:'forged',action_id:randomUUID()}],['release_group_clue',{target_purchase_id:randomUUID()}],['purchase_clue',{target_group_id:f.groupA,target_clue_id:f.securityClue}],['reset_test_data',{}]])assert.ok((await c.rpc(fn,args)).error,fn);
});
test('suspects cannot read an unreferenced photo',async()=>{
 const path='security/unreferenced-'+randomUUID()+'.png';
 const bytes=Buffer.from(await ok(await service.storage.from('suspect-photos').download('security/own.png')).arrayBuffer());
 ok(await service.storage.from('suspect-photos').upload(path,bytes,{contentType:'image/png'}));
 try{for(const c of [a,b])assert.ok((await c.storage.from('suspect-photos').download(path)).error);}
 finally{ok(await service.storage.from('suspect-photos').remove([path]));}
});
test('inactive dossiers and their photos stay hidden; account deactivation or unlink revokes access with existing token',async()=>{
 ok(await service.from('suspects').update({is_active:false}).eq('id',f.securitySuspect));
 try{
  denied(await a.from('suspects').select('*').eq('id',f.securitySuspect));
  assert.ok((await a.storage.from('suspect-photos').download('security/other.png')).error);
  denied(await b.from('suspects').select('*'));
 }finally{ok(await service.from('suspects').update({is_active:true}).eq('id',f.securitySuspect));}
 for(const change of [{is_active:false},{suspect_id:null}]){
  ok(await service.from('profiles').update(change).eq('id',user.id));
  try{denied(await b.from('suspects').select('*'));assert.ok((await b.storage.from('suspect-photos').download('security/own.png')).error);}
  finally{ok(await service.from('profiles').update({is_active:true,suspect_id:f.securitySuspect}).eq('id',user.id));}
 }
});
