import test from 'node:test';
import assert from 'node:assert/strict';
import {readPages,listObjects,assertTarget,TEST,LOCAL,PROD,canonical,hash,DATASETS,validateBundle,base64} from '../../supabase/functions/_shared/backup.mjs';
const jwt=claims=>`x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.x`;
test('pagination exports 1507 records even when server caps a page at 200',async()=>{
 const rows=Array.from({length:1507},(_,id)=>({id})); let calls=0;
 assert.deepEqual(await readPages(async offset=>{calls++;return rows.slice(offset,offset+200);},1507),rows); assert.equal(calls,9);
});
test('empty dataset is verified with a terminal page',async()=>assert.deepEqual(await readPages(async()=>[],0),[]));
test('query failure never produces a successful partial dataset',async()=>assert.rejects(readPages(async offset=>{if(offset)throw Error('network');return Array(500).fill({});},1001)));
test('short dataset fails closed',async()=>assert.rejects(readPages(async()=>[],1),/incomplete/));
test('unexpected additional records fail closed',async()=>assert.rejects(readPages(async()=>[{}],0),/count_mismatch/));
test('invalid expected count rejected',async()=>assert.rejects(readPages(async()=>[],NaN)));
test('production target cannot be forced',()=>assert.throws(()=>assertTarget(PROD,`https://${PROD}.supabase.co`,jwt({role:'service_role',ref:PROD})),/forbidden/));
test('wrong endpoint rejected',()=>assert.throws(()=>assertTarget(TEST,`https://${PROD}.supabase.co`,jwt({role:'service_role',ref:TEST})),/forbidden/));
test('production key rejected on test URL',()=>assert.throws(()=>assertTarget(TEST,`https://${TEST}.supabase.co`,jwt({role:'service_role',ref:PROD})),/mismatch/));
test('anon key rejected',()=>assert.throws(()=>assertTarget(TEST,`https://${TEST}.supabase.co`,jwt({role:'anon',ref:TEST})),/mismatch/));
test('opaque key rejected',()=>assert.throws(()=>assertTarget(TEST,`https://${TEST}.supabase.co`,'sb_secret_x'),/unverifiable/));
test('exact TEST and local targets accepted',()=>{assertTarget(TEST,`https://${TEST}.supabase.co`,jwt({role:'service_role',ref:TEST}));assertTarget(LOCAL,'http://127.0.0.1:55421',jwt({role:'service_role'}));});
test('canonical hash stable for object key order',async()=>assert.equal(await hash(canonical({b:1,a:2})),await hash(canonical({a:2,b:1}))));
async function emptyBundle() {
 const datasets=Object.fromEntries(DATASETS.map(t=>[t,[]])); const metadata={};
 for(const name of DATASETS) metadata[name]={row_count:0,sha256:await hash('[]')};
 const manifest={backup_format_version:2,kind:'csi-hit-portable',status:'complete',schema_version:'operations-v2',backup_id:crypto.randomUUID(),project_ref:LOCAL,created_at:new Date().toISOString(),errors:[],datasets:metadata,storage_object_count:0};
 manifest.manifest_sha256=await hash(canonical(manifest));return {manifest,datasets,files:[]};
}
test('valid empty bundle accepted',async()=>assert.ok(await validateBundle(await emptyBundle())));
test('legacy version-two JSON without new manifest rejected',async()=>assert.rejects(validateBundle({format_version:2,tables:{}}),/manifest/));
test('corrupt manifest rejected',async()=>{const b=await emptyBundle();b.manifest.created_at='2020-01-01';await assert.rejects(validateBundle(b),/manifest_integrity/);});
test('missing dataset rejected',async()=>{const b=await emptyBundle();delete b.datasets.suspect_users;await assert.rejects(validateBundle(b),/coverage/);});
test('corrupted row rejected',async()=>{const b=await emptyBundle();b.datasets.groups.push({id:'fake'});await assert.rejects(validateBundle(b),/integrity/);});
test('partial status rejected',async()=>{const b=await emptyBundle();b.manifest.status='partial';await assert.rejects(validateBundle(b),/manifest/);});
test('unlisted file rejected',async()=>{const b=await emptyBundle();b.files.push({base64:base64(new Uint8Array([1]))});await assert.rejects(validateBundle(b),/count/);});
test('Storage recursively paginates beyond 1000 files and lists before deleting',async()=>{
 const objects=Array.from({length:1107},(_,i)=>({id:String(i),name:`f${i}`}));
 const storage={list:async(prefix,{offset,limit})=>({data:prefix==='nested'?objects.slice(offset,offset+limit):offset?[]:[{id:null,name:'nested'}]})};
 const result=await listObjects(storage);assert.equal(result.length,1107);assert.equal(result[1106].path,'nested/f1106');
});
test('Storage listing error aborts without treating it as an empty bucket',async()=>assert.rejects(listObjects({list:async()=>({error:{message:'network'}})}),/failed/));
