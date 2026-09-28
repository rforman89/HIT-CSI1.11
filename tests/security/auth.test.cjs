const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {client,service,ok}=require('../backend/local.cjs');
async function account(confirmed=true){const credentials={email:'auth-'+randomUUID()+'@example.test',password:randomUUID()+'Aa9!'};const {user}=ok(await service.auth.admin.createUser({...credentials,email_confirm:confirmed}));return {credentials,user};}
test('unconfirmed account cannot login; verified email permits login without granting game access',async()=>{
 const {credentials,user}=await account(false),c=client();
 try{assert.ok((await c.auth.signInWithPassword(credentials)).error);ok(await service.auth.admin.updateUserById(user.id,{email_confirm:true}));ok(await c.auth.signInWithPassword(credentials));assert.deepEqual(ok(await c.from('clues').select()),[]);}
 finally{await c.auth.signOut();ok(await service.auth.admin.deleteUser(user.id));}
});
test('password recovery token is verified, password changes, old password fails',async()=>{
 const {credentials,user}=await account(),c=client();
 try{const link=ok(await service.auth.admin.generateLink({type:'recovery',email:credentials.email}));
  ok(await c.auth.verifyOtp({type:'recovery',token_hash:link.properties.hashed_token}));
  const password=randomUUID()+'New!9';ok(await c.auth.updateUser({password}));await c.auth.signOut();
  assert.ok((await c.auth.signInWithPassword(credentials)).error);ok(await c.auth.signInWithPassword({...credentials,password}));
 }finally{await c.auth.signOut();ok(await service.auth.admin.deleteUser(user.id));}
});
test('refresh succeeds before logout and refresh token cannot renew after logout',async()=>{
 const {credentials,user}=await account(),c=client();
 try{ok(await c.auth.signInWithPassword(credentials));const {session}=ok(await c.auth.refreshSession());await c.auth.signOut();assert.ok((await c.auth.refreshSession({refresh_token:session.refresh_token})).error);}
 finally{ok(await service.auth.admin.deleteUser(user.id));}
});
test('anonymous sign-in and too-short password are rejected by Auth',async()=>{
 const c=client();assert.ok((await c.auth.signInAnonymously()).error);assert.ok((await c.auth.signUp({email:'short-'+randomUUID()+'@example.test',password:'x'})).error);
});
test('user-editable metadata cannot change database role or game entitlement',async()=>{
 const {credentials,user}=await account(),c=client();
 try{ok(await c.auth.signInWithPassword(credentials));ok(await c.auth.updateUser({data:{role:'admin',is_active:true}}));
  assert.equal(ok(await c.rpc('is_admin')),false);
  assert.equal(ok(await c.from('profiles').select('role').eq('id',user.id).single()).role,'participant');
  assert.deepEqual(ok(await c.from('clues').select()),[]);
 }finally{await c.auth.signOut();ok(await service.auth.admin.deleteUser(user.id));}
});
