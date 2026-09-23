const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { root, service, ok, client, login, verify } = require('./hosted.cjs');
const fixture = JSON.parse(fs.readFileSync(root + '/.local/hosted-fixture.json'));
let admin, admin2, a, a2, b, suspect;
const pause = ms => new Promise(r => setTimeout(r, ms));
async function until(check) { const end = Date.now() + 15000; while (Date.now() < end) { if (check()) return; await pause(100); } throw new Error('Realtime event timeout'); }
before(async () => { await verify(); [admin, admin2, a, a2, b, suspect] = await Promise.all(['admin','admin2','a','a2','b','suspect'].map(login)); });
beforeEach(verify);
after(async () => { for (const c of [admin,admin2,a,a2,b,suspect]) { await c?.removeAllChannels(); await c?.auth.signOut(); c?.realtime.disconnect(); } await service.removeAllChannels(); service.realtime.disconnect(); });

test('hosted RPC security: second admin cannot replay another actor; invalid parameters and unauthorized destructive calls denied', async () => {
  const p = { target_group_id: fixture.groupA, amount_change: 5, mutation_reason: 'Hosted actor validation', action_id: randomUUID() };
  ok(await admin.rpc('mutate_group_credits', p));
  assert.ok((await admin2.rpc('mutate_group_credits', p)).error);
  for (const change of [{ target_group_id: randomUUID() }, { amount_change: 0 }, { amount_change: null }, { action_id: null }, { mutation_reason: ' ' }]) assert.ok((await admin.rpc('mutate_group_credits', { ...p, action_id: randomUUID(), ...change })).error);
  for (const actor of [a,b,suspect,client()]) {
    for (const [rpc, params] of [['reset_test_data',{}], ['delete_demo_data',{}], ['remove_group_clue',{target_assignment_id:randomUUID()}]]) assert.ok((await actor.rpc(rpc,params)).error);
  }
});
test('hosted RLS: metadata cannot grant admin and second group member sees only allowed notes', async () => {
  ok(await a.auth.updateUser({ data: { role: 'admin' } }));
  assert.equal(ok(await a.rpc('is_admin')), false);
  await a.from('profiles').update({ role:'admin' }).eq('id',fixture.users.a);
  assert.equal(ok(await service.from('profiles').select('role').eq('id',fixture.users.a).single()).role,'participant');
  assert.ok(ok(await a2.from('suspect_notes').select().eq('id',fixture.note)).length === 1);
  assert.equal(ok(await b.from('suspect_notes').select().eq('id',fixture.note)).length,0);
});
test('hosted Storage: private clue upload, replacement, purchase-gated download, and unauthorized denial', async t => {
  const bucket = 'clue-files', name = `clues/hosted-${randomUUID()}.pdf`;
  const c = ok(await service.from('clues_base').insert({ title:'TEST - Storage',description:'Fictief opslagbestand',price:5,is_visible:true,is_active:true,file_url:name }).select().single());
  t.after(async () => { ok(await admin.storage.from(bucket).remove([name])); ok(await admin.from('clues').delete().eq('id',c.id)); });
  const buckets = ok(await service.storage.listBuckets());
  assert.equal(buckets.find(x=>x.id===bucket).public,false); assert.equal(buckets.find(x=>x.id==='suspect-photos').public,true);
  ok(await admin.storage.from(bucket).upload(name,Buffer.from('%PDF-1.4 fictitious v1'),{contentType:'application/pdf'}));
  ok(await admin.storage.from(bucket).upload(name,Buffer.from('%PDF-1.4 fictitious v2'),{contentType:'application/pdf',upsert:true}));
  assert.ok((await a.storage.from(bucket).download(name)).error);
  assert.ok((await client().storage.from(bucket).download(name)).error);
  assert.ok((await a.storage.from(bucket).upload(name,Buffer.from('forbidden'),{contentType:'application/pdf',upsert:true})).error);
  ok(await a.rpc('purchase_clue',{target_group_id:fixture.groupA,target_clue_id:c.id}));
  assert.equal(await ok(await a.storage.from(bucket).download(name)).text(),'%PDF-1.4 fictitious v2');
  assert.ok((await b.storage.from(bucket).download(name)).error);
  assert.ok((await suspect.storage.from(bucket).download(name)).error);
});
test('hosted Storage: suspect photo upload and replacement preserve public access with admin-only writes', async t => {
  const bucket='suspect-photos',name=`hosted-${randomUUID()}.png`,bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrWQAAAAASUVORK5CYII=','base64');
  t.after(async()=>{ok(await service.storage.from(bucket).remove([name]));});
  ok(await admin.storage.from(bucket).upload(name,bytes,{contentType:'image/png'}));
  ok(await admin.storage.from(bucket).upload(name,bytes,{contentType:'image/png',upsert:true}));
  assert.ok((await b.storage.from(bucket).upload(name,bytes,{contentType:'image/png',upsert:true})).error);
  const {data}=admin.storage.from(bucket).getPublicUrl(name);
  assert.equal((await fetch(data.publicUrl)).status,200);
});
async function watch(actor,table,events) {
  let postgresReady = false;
  const channel=actor.channel(`test-${randomUUID()}`).on('system',{},payload=>{ if(payload.extension==='postgres_changes' && payload.status==='ok') postgresReady=true; }).on('postgres_changes',{event:'*',schema:'public',table},e=>events.push(e));
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Subscription timeout: '+table)),15000);channel.subscribe((status,error)=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(error||new Error(status));}});});
  await until(()=>postgresReady);
  return channel;
}
test('hosted Realtime: independent group clients receive own balance events and cannot observe foreign group',async t=>{
  const eventsA=[],eventsB=[];const ca=await watch(a,'groups',eventsA),cb=await watch(b,'groups',eventsB);
  t.after(async()=>{await a.removeChannel(ca);await b.removeChannel(cb);});
  const started=Date.now();const result=ok(await admin.rpc('mutate_group_credits',{target_group_id:fixture.groupA,amount_change:5,mutation_reason:'Realtime A/B',action_id:randomUUID()}));
  await until(()=>eventsA.some(e=>e.new.id===fixture.groupA&&e.new.credits===result.balance));
  await pause(500);assert.equal(eventsB.filter(e=>e.new.id===fixture.groupA).length,0);
  console.log('Own-group Realtime event received in '+(Date.now()-started)+'ms; foreign group withheld.');
});
test('hosted Realtime: reconnect receives fresh events and authoritative snapshot catches missed changes',async t=>{
  let events=[],channel=await watch(a,'groups',events);await a.removeChannel(channel);
  const change=()=>admin.rpc('mutate_group_credits',{target_group_id:fixture.groupA,amount_change:5,mutation_reason:'Realtime reconnect',action_id:randomUUID()}).then(ok);
  const missed=await change();events=[];channel=await watch(a,'groups',events);t.after(()=>a.removeChannel(channel));
  assert.equal(ok(await a.from('groups').select('credits').eq('id',fixture.groupA).single()).credits,missed.balance);
  const next=await change();await until(()=>events.some(e=>e.new.credits===next.balance));
});
test('hosted Realtime: server observer confirms admin clue update; participant receives no secret payload',async t=>{
  const secret='test-secret-'+randomUUID(),adminEvents=[],participantEvents=[];
  const ca=await watch(service,'clues_base',adminEvents);t.after(()=>service.removeChannel(ca));
  const cp=a.channel('denied-'+randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'clues_base'},e=>participantEvents.push(e)).subscribe();t.after(()=>a.removeChannel(cp));
  await pause(1500);ok(await admin.from('clues').update({file_url:secret}).eq('id',fixture.hiddenClue));
  t.after(()=>service.from('clues_base').update({file_url:'test/hidden.pdf'}).eq('id',fixture.hiddenClue).then(ok));
  await until(()=>adminEvents.some(e=>e.new.file_url===secret));await pause(1500);
  for (const event of participantEvents) { assert.deepEqual(event.new,{}); assert.deepEqual(event.old,{}); assert.ok(event.errors?.every(error=>error.includes('401'))); } assert.ok(!JSON.stringify(participantEvents).includes(secret));assert.ok((await a.from('clues_base').select()).error);
  const rows=ok(await a.from('clues').select().eq('id',fixture.hiddenClue));assert.ok(rows.every(r=>r.file_url===null));
});
