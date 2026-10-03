const fs=require('node:fs'),{randomBytes,randomUUID}=require('node:crypto');
const {sql,service,ok,root,fixtureFile,verify,hosted}=require('../backend/target.cjs');
(async()=>{
 await verify();
 for(const [migration,probe] of [
  ['20260928182236_security_roles_product.sql','private.has_game_access()'],
  ['20260928192617_security_advisor_refinements.sql','private.release_group_clue(uuid)']
 ])if(['t','true'].includes(sql("SELECT to_regprocedure('"+probe+"') IS NULL"))){
  if(hosted)throw Error('Apply the reviewed migrations to verified TEST first');
  sql(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 }
 const file=root+'/'+fixtureFile,f=JSON.parse(fs.readFileSync(file,'utf8'));
 if(sql("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='suspects' AND policyname='suspect cross dossier read'")==='0'){
  if(hosted)throw Error('Apply the reviewed cross-dossier migration to verified TEST first');
  sql(fs.readFileSync('supabase/migrations/20261003173654_suspect_cross_dossier_read.sql','utf8'));
 }
 for(const role of ['jury','unassigned','inactive','no_profile']) {
  if(!f.accounts[role]) {
   f.accounts[role]={email:`security-${role}@example.test`,password:randomBytes(24).toString('base64url')};
   const {user}=ok(await service.auth.admin.createUser({...f.accounts[role],email_confirm:true,user_metadata:{role:'admin'}}));
   f.users[role]=user.id;fs.writeFileSync(file,JSON.stringify(f,null,2));
  }
  ok(await service.from('profiles').upsert({id:f.users[role],email:f.accounts[role].email,role:role==='jury'?'jury':'participant',is_active:role!=='inactive',display_name:`Security ${role}`}));
 }
 if(!f.securityClue)f.securityClue=randomUUID();
 if(!f.securitySuspect)f.securitySuspect=randomUUID();
 ok(await service.from('suspects').upsert({id:f.securitySuspect,name:'TEST - Ander beveiligd dossier',description:'Fictief profiel van de andere verdachte.',photo_url:'security/other.png',is_active:true}));
 ok(await service.from('clues_base').upsert({id:f.securityClue,title:'TEST - Afgeschermd bestand',description:'TEST SECRET B',suspect_id:f.securitySuspect,price:5,file_url:'security/other.pdf',is_active:true,is_visible:true}));
 ok(await service.from('group_clues').upsert({group_id:f.groupB,clue_id:f.securityClue,status:'requested'},{onConflict:'group_id,clue_id'}));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6SAAAAABJRU5ErkJggg==','base64');
 for(const path of ['security/own.png','security/other.png'])ok(await service.storage.from('suspect-photos').upload(path,png,{contentType:'image/png',upsert:true}));
 ok(await service.from('suspects').update({photo_url:'security/own.png',is_active:true}).eq('id',f.suspect));
 ok(await service.storage.from('clue-files').upload('security/other.pdf',Buffer.from('%PDF-1.4 TEST'),{contentType:'application/pdf',upsert:true}));
 ok(await service.from('suspect_notes').insert({group_id:f.groupB,suspect_id:f.securitySuspect,user_id:f.users.b,note:'TEST SECRET B'}));
 fs.writeFileSync(file,JSON.stringify(f,null,2));
 sql("NOTIFY pgrst,'reload schema'");
 console.log('Verified security fixtures prepared; no credentials printed.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
