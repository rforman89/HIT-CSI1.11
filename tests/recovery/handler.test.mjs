import test, {before,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createHandler} from '../../supabase/functions/_shared/handler.mjs';
import {validateBundle,ok} from '../../supabase/functions/_shared/backup.mjs';
import local from '../backend/target.cjs';
before(local.verify);beforeEach(local.verify);
const env={SUPABASE_URL:local.config.API_URL,SUPABASE_ANON_KEY:local.config.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:local.config.SERVICE_ROLE_KEY,CSI_RELEASE:'local-test'};
const handler=local.hosted ? request=>fetch(local.config.API_URL+"/functions/v1/csi-hit-nightly-backup",{method:request.method,headers:request.headers,body:request.body,duplex:"half"}) : createHandler(createClient,key=>env[key]);
const request=(token,body={})=>new Request('http://localhost/backup',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
const token=async role=>(await (await local.login(role)).auth.getSession()).data.session.access_token;
test('Edge handler rejects missing/forged bearer, participant and suspect',async()=>{
 assert.equal((await handler(request())).status,401);assert.equal((await handler(request('forged'))).status,401);
 assert.equal((await handler(request(env.SUPABASE_ANON_KEY))).status,401);
 const forged='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role:'service_role',ref:'ksnagauoufsriwplvvtd'})).toString('base64url')+'.invalid';
 assert.equal((await handler(request(forged))).status,401);
 for(const role of ['a','suspect'])assert.equal((await handler(request(await token(role)))).status,403);
});
test('Edge cron records TEST skip and still performs maintenance',async()=>{
 const res=await handler(request(env.SUPABASE_SERVICE_ROLE_KEY));assert.equal(res.status,200);assert.equal((await res.json()).status,'skipped_test');
});
let id;
test('admin backup works in TEST and downloadable bundle has validated bytes',async()=>{
 local.sql("UPDATE public.clues_base SET file_url=null,pdf_url=null; UPDATE public.suspects SET photo_url=null;");
 id=crypto.randomUUID();const auth=await token('admin');
 const response=await handler(request(auth,{request_id:id,requested_by:crypto.randomUUID()}));assert.equal(response.status,200);assert.equal((await response.json()).status,'success');
 const run=ok(await local.service.from('backup_runs').select('actor').eq('id',id).single());
 assert.equal(run.actor,(await (await local.login('admin')).auth.getUser()).data.user.id);
 const link=await handler(request(auth,{action:'download',backup_id:id}));assert.equal(link.status,200);
 const bundle=await (await fetch((await link.json()).url)).json();await validateBundle(bundle);
});
test('same manual action is replayed without a second artifact',async()=>{
 const response=await handler(request(await token('admin'),{request_id:id}));assert.equal((await response.json()).replayed,true);
});
test('download requires admin and existing successful UUID',async()=>{
 assert.equal((await handler(request(await token('a'),{action:'download',backup_id:id}))).status,403);
 assert.equal((await handler(request(await token('admin'),{action:'download',backup_id:'../../other'}))).status,403);
});
test('retention runs in TEST and preserves latest successful artifact',async()=>{
 // Real storage deletion tested only on this isolated backend.
 const old=crypto.randomUUID();ok(await local.service.storage.from('backups').upload(`v2/${old}.json`,'{}',{contentType:'application/json'}));
 local.sql(`UPDATE storage.objects SET created_at=now()-interval '40 days' WHERE bucket_id='backups' AND name='v2/${old}.json'`);
 await handler(request(env.SUPABASE_SERVICE_ROLE_KEY));
 assert.ok((await local.service.storage.from('backups').download(`v2/${old}.json`)).error);
 assert.ok(!(await local.service.storage.from('backups').download(`v2/${id}.json`)).error);
});
