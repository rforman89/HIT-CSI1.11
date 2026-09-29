import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import local from '../backend/local.cjs';
import large from './large-data.cjs';
import {loadAppSnapshot} from '../../src/services/loadAppSnapshot.js';
import {readAllRows} from '../../src/services/readAllRows.js';
const fixture=JSON.parse(fs.readFileSync('.local/fixture.json','utf8'));
process.env.REACT_APP_SUPABASE_URL=local.config.API_URL;
test('LOCAL >1000 datasets remain complete, ordered and balanced; targeted refresh preserves scope',async()=>{
 large.seed();const admin=await local.login('admin');
 try{
  const controller=new AbortController(),snapshot=await loadAppSnapshot(admin,fixture.users.admin,controller.signal);
  for(const [key,kind,n]of [['transactions','transaction',1500],['suspectNotes','note',1200],['clues','clue',1100]]){
   const ids=new Set(snapshot[key].map(x=>x.id));for(let i=1;i<=n;i++)assert(ids.has(large.id(kind,i)),`${key} missing ${i}`);
  }
  assert.equal(snapshot.transactions.filter(x=>x.reason==='PERF fixture').reduce((n,x)=>n+x.amount,0),0);
  const dates=snapshot.transactions.map(x=>x.created_at);assert.deepEqual(dates,[...dates].sort().reverse());
  const audit=await readAllRows(first=>admin.from('operation_audit').select('*',first?{count:'exact'}:undefined).eq('action_type','performance.fixture'));
  const ids=new Set(audit.map(x=>x.id));for(let i=1;i<=2500;i++)assert(ids.has(large.id('audit',i)));
  const partial=await loadAppSnapshot(admin,fixture.users.admin,controller.signal,false,{previous:snapshot,tables:['app_settings']});
  assert.equal(partial.transactions,snapshot.transactions);assert.equal(partial.suspectNotes,snapshot.suspectNotes);
  const a=await local.login('a');try{const own=await loadAppSnapshot(a,fixture.users.a,controller.signal,false,{previous:snapshot,tables:['app_settings']});assert(own.groups.every(g=>g.id===fixture.groupA));assert(own.transactions.every(t=>t.group_id===fixture.groupA));assert.notEqual(own._scope,snapshot._scope);}finally{await a.auth.signOut();}
 }finally{await admin.auth.signOut();large.cleanup();}
});
