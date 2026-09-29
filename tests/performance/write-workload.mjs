// Imported only after the harness has verified the exact hosted TEST target.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const ok=r=>{if(r.error)throw Error(r.error.message);return r.data;};
export async function prepareWrites(service,fixture){
 const run=randomUUID(), groups=[fixture.groupA,fixture.groupB];
 const before=ok(await service.from('groups').select('id,credits').in('id',groups));
 assert.equal(before.length,2);assert(before.every(g=>g.credits>=1),'Fixture requires positive balances');
 const clues=['a','b','hotspot'].map(role=>({id:randomUUID(),title:`PERF ${run} ${role}`,description:'Fictieve hosted loadtest',price:1,suspect_id:fixture.suspect,is_visible:true,is_active:true,is_free:false,is_global:false}));
 ok(await service.from('clues_base').insert(clues));
 const assignment=ok(await service.from('group_clues').insert({group_id:fixture.groupA,clue_id:clues[2].id,source:'manual',status:'requested'}).select('id').single());
 return {run,before,clues,assignment,done:new Set(),credits:[],notes:[],purchases:[],hotspotAt:null,observed:new Set()};
}
export async function writeStep(state,actor,clients,fixture,measure){
 // One writer per role, at most six logical writes per run. Many readers, few writes.
 if(clients.find(a=>a.role===actor.role)!==actor||state.done.has(actor.role))return;
 state.done.add(actor.role);
 if(actor.role==='a'||actor.role==='b'){
  const group=actor.role==='a'?fixture.groupA:fixture.groupB,clue=state.clues[actor.role==='a'?0:1],id=randomUUID();
  ok(await measure(actor.role,'note-write',()=>actor.client.from('suspect_notes').insert({id,group_id:group,suspect_id:fixture.suspect,user_id:fixture.users[actor.role],note:`PERF ${state.run}`})));
  state.notes.push({id,group});
  ok(await measure(actor.role,'purchase-write',()=>actor.client.rpc('purchase_clue',{target_group_id:group,target_clue_id:clue.id})));
  state.purchases.push({group,clue});
 }else if(actor.role==='jury'){
  const action_id=randomUUID(),params={target_group_id:fixture.groupA,amount_change:1,mutation_reason:`PERF ${state.run}`,action_id};
  const first=ok(await measure(actor.role,'credit-write',()=>actor.client.rpc('mutate_group_credits',params)));
  const retry=ok(await measure(actor.role,'credit-retry',()=>actor.client.rpc('mutate_group_credits',params)));
  assert.equal(first.transaction_id,retry.transaction_id,'Credit retry created another transaction');
  state.credits.push({action_id,transaction:first.transaction_id});
 }else if(actor.role==='admin'){
  // A group_clues event is RLS-filtered to entitled group A, jury, admin and suspect.
  state.hotspotAt=performance.now();
  ok(await measure(actor.role,'clue-release',()=>actor.client.rpc('release_group_clue',{target_purchase_id:state.assignment.id})));
 }
}
export function observeHotspot(state,actor,samples){
 if(!state?.hotspotAt||state.observed.has(actor.index))return;
 if(actor.snapshot.groupClues.some(c=>c.id===state.assignment.id&&c.status==='released')){
  state.observed.add(actor.index);samples.push({role:actor.role,kind:'hotspot-convergence',ms:performance.now()-state.hotspotAt,ok:true});
 }
}
export async function verifyWrites(state,service,clients,fixture){
 for(const actor of clients.filter(a=>a.role==='b'))assert(!actor.snapshot.groupClues.some(c=>c.id===state.assignment.id),'Group B received the group A hotspot');
 for(const old of state.before){
  const now=ok(await service.from('groups').select('credits').eq('id',old.id).single());
  const expected=old.credits+(old.id===fixture.groupA?state.credits.length:0)-state.purchases.filter(p=>p.group===old.id).length;
  assert.equal(now.credits,expected,'Unexpected balance: isolate the write stage from other mutating tests');
 }
 for(const credit of state.credits){
  const rows=ok(await service.from('credit_transactions').select('id,amount').eq('action_id',credit.action_id));
  assert.equal(rows.length,1);assert.equal(rows[0].id,credit.transaction);assert.equal(rows[0].amount,1);
  const audit=ok(await service.from('operation_audit').select('id').eq('action_id',credit.action_id).eq('action_type','credit_transactions.insert'));assert.equal(audit.length,1);
 }
 for(const note of state.notes){const rows=ok(await service.from('suspect_notes').select('id,group_id').eq('id',note.id));assert.equal(rows.length,1);assert.equal(rows[0].group_id,note.group);}
 for(const p of state.purchases){
  const rows=ok(await service.from('group_clues').select('id,source').eq('group_id',p.group).eq('clue_id',p.clue.id));assert.equal(rows.length,1);assert.equal(rows[0].source,'purchase');
  const tx=ok(await service.from('credit_transactions').select('id,amount').eq('group_id',p.group).eq('reason','Aanwijzing gekocht: '+p.clue.title));assert.equal(tx.length,1);assert.equal(tx[0].amount,-1);
  const audit=ok(await service.from('operation_audit').select('id').eq('target',rows[0].id).eq('action_type','group_clues.insert'));assert.equal(audit.length,1);
 }
 const converged=!!state.hotspotAt&&clients.filter(a=>['a','admin','jury','suspect'].includes(a.role)).every(a=>state.observed.has(a.index));
 const complete=state.notes.length===2&&state.purchases.length===2&&state.credits.length===1&&converged;
 return {complete,balances:true,transactions:true,notes:state.notes.length,purchases:state.purchases.length,creditRetries:state.credits.length,audit:true,hotspotRecipients:state.observed.size};
}
