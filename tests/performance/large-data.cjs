// Deterministic LOCAL-only fixtures. Never reads or copies production data.
const fs=require('node:fs'),{createHash}=require('node:crypto');
const {sql}=require('../backend/local.cjs');
const fixture=JSON.parse(fs.readFileSync('.local/fixture.json','utf8'));
function id(kind,i){const h=createHash('md5').update(`csi-performance-${kind}-${i}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
function seed(){
 sql(`BEGIN;
 SELECT set_config('request.jwt.claims','${JSON.stringify({sub:fixture.users.admin,role:'authenticated'})}',true);
 INSERT INTO public.groups(id,name,credits,is_active) SELECT md5('csi-performance-group-'||i)::uuid,'PERF fictieve groep '||i,100,true FROM generate_series(1,6) i ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.credit_transactions(id,group_id,amount,reason,created_by,created_at,action_id)
 SELECT md5('csi-performance-transaction-'||i)::uuid,'${fixture.groupA}',CASE WHEN i%2=0 THEN 1 ELSE -1 END,'PERF fixture', '${fixture.users.admin}', '2026-01-01'::timestamptz+i*interval '1 second',md5('csi-performance-transaction-'||i)::uuid FROM generate_series(1,1500) i ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.suspect_notes(id,group_id,suspect_id,user_id,note,created_at)
 SELECT md5('csi-performance-note-'||i)::uuid,'${fixture.groupA}','${fixture.suspect}','${fixture.users.a}','PERF fictieve notitie '||i,'2026-01-01'::timestamptz+i*interval '1 second' FROM generate_series(1,1200) i ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.clues_base(id,title,description,price,suspect_id,is_active,is_visible,is_free,sort_order)
 SELECT md5('csi-performance-clue-'||i)::uuid,'PERF aanwijzing '||i,'Fictieve performancefixture',0,'${fixture.suspect}',true,true,true,i FROM generate_series(1,1100) i ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.operation_audit(id,action_id,action_type,target,occurred_at)
 SELECT md5('csi-performance-audit-'||i)::uuid,'perf-'||i,'performance.fixture','fictief','2026-01-01'::timestamptz+i*interval '1 second' FROM generate_series(1,2500) i ON CONFLICT(id) DO NOTHING;
 COMMIT;`);
 console.log('LOCAL fixture: 1500 transactions, 2500 audit rows, 1200 notes, 1100 clues, 6 additional groups');
}
function cleanup(){
 sql(`BEGIN;
 SELECT set_config('request.jwt.claims','${JSON.stringify({sub:fixture.users.admin,role:'authenticated'})}',true);
 DELETE FROM public.credit_transactions WHERE id IN (SELECT md5('csi-performance-transaction-'||i)::uuid FROM generate_series(1,1500) i);
 DELETE FROM public.suspect_notes WHERE id IN (SELECT md5('csi-performance-note-'||i)::uuid FROM generate_series(1,1200) i);
 DELETE FROM public.clues_base WHERE id IN (SELECT md5('csi-performance-clue-'||i)::uuid FROM generate_series(1,1100) i);
 DELETE FROM public.groups WHERE id IN (SELECT md5('csi-performance-group-'||i)::uuid FROM generate_series(1,6) i);
 DELETE FROM public.operation_audit WHERE id IN (SELECT md5('csi-performance-audit-'||i)::uuid FROM generate_series(1,2500) i);
 DELETE FROM public.operation_audit WHERE target IN (
   SELECT md5('csi-performance-transaction-'||i)::uuid::text FROM generate_series(1,1500) i
   UNION ALL SELECT md5('csi-performance-clue-'||i)::uuid::text FROM generate_series(1,1100) i
   UNION ALL SELECT md5('csi-performance-group-'||i)::uuid::text FROM generate_series(1,6) i
 );
 COMMIT;`);
 console.log('Own deterministic LOCAL fixtures removed');
}
module.exports={seed,cleanup,id};
if(require.main===module){if(process.argv[2]==='seed')seed();else if(process.argv[2]==='cleanup')cleanup();else throw Error('Choose seed or cleanup; LOCAL only');}
