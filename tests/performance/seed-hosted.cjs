// Prepared for the explicit hosted checkpoint. Never used during local validation.
const fs=require('node:fs'),{createHash}=require('node:crypto'),{createClient}=require('@supabase/supabase-js');
const {validate,TEST}=require('./safety.cjs');
if(process.argv.length!==3||process.argv[2]!=='--allow-hosted')throw Error('Explicit hosted checkpoint required');
const config=JSON.parse(fs.readFileSync('.local/hosted-backend.json','utf8'));
validate(config,{target:'hosted',allowHosted:true});
const fixture=JSON.parse(fs.readFileSync('.local/hosted-fixture.json','utf8'));
for(const role of ['admin','jury','a','b','suspect'])if(!fixture.accounts[role]?.email.endsWith('@example.test'))throw Error('Only provisioned fictitious TEST accounts permitted');
const service=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{global:{fetch:async(input,init={})=>{
 const u=new URL(typeof input==='string'?input:input.url||input);if(u.origin!==config.API_URL)throw Error('Cross-target refused');return fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(10000)});
}},auth:{persistSession:false,autoRefreshToken:false}});
const ok=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const id=(kind,i)=>{const h=createHash('md5').update(`csi-performance-${kind}-${i}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const make=(n,fn)=>Array.from({length:n},(_,i)=>fn(i+1));
async function upsert(table,rows){for(let i=0;i<rows.length;i+=100)ok(await service.from(table).upsert(rows.slice(i,i+100),{onConflict:'id',ignoreDuplicates:true}));}
(async()=>{
 const marker=ok(await service.from('app_settings').select('key,value').in('key',['test_environment','game_mode']));
 if(!marker.some(r=>r.key==='test_environment'&&r.value===TEST)||!marker.some(r=>r.key==='game_mode'&&r.value==='test'))throw Error('TEST marker/mode mismatch');
 const time=i=>new Date(Date.UTC(2026,0,1)+i*1000).toISOString();
 await upsert('groups',make(6,i=>({id:id('group',i),name:'PERF fictieve groep '+i,credits:100,is_active:true})));
 await upsert('credit_transactions',make(1500,i=>({id:id('transaction',i),group_id:fixture.groupA,amount:i%2?-1:1,reason:'PERF fixture',created_by:fixture.users.admin,created_at:time(i),action_id:id('transaction',i)})));
 await upsert('suspect_notes',make(1200,i=>({id:id('note',i),group_id:fixture.groupA,suspect_id:fixture.suspect,user_id:fixture.users.a,note:'PERF fictieve notitie '+i,created_at:time(i)})));
 await upsert('clues_base',make(1100,i=>({id:id('clue',i),title:'PERF aanwijzing '+i,description:'Fictieve performancefixture',price:0,suspect_id:fixture.suspect,is_active:true,is_visible:true,is_free:true,sort_order:i})));
 await upsert('operation_audit',make(2500,i=>({id:id('audit',i),action_id:'perf-'+i,action_type:'performance.fixture',target:'fictief',occurred_at:time(i)})));
 console.log('Verified hosted TEST seeded; no production records copied. No secrets printed.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
