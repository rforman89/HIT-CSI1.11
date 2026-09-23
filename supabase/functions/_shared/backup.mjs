// Shared by the Edge worker, portable CLI and real database tests. No credentials in artifacts.
export const TABLES = ['suspects','groups','clue_categories','profiles','group_members','suspect_users','agenda_items','clues_base','group_clues','suspect_notes','suspect_statuses','notifications','credit_transactions','final_reports','settings','app_settings','operation_audit'];
export const DATASETS = [...TABLES, 'auth_users','storage_buckets','storage_objects'];
export const PROD = 'uhfcrskkgutlqqogahbr';
export const TEST = 'ksnagauoufsriwplvvtd';
export const LOCAL = 'csi-hit-reliability';
export const MAX_BYTES = 40 * 1024 * 1024;
export const canonical = value => JSON.stringify(sort(value));
function sort(v) { return Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k,sort(v[k])])) : v; }
export async function hash(value) {
 const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), b=>b.toString(16).padStart(2,'0')).join('');
}
export function ok(result) { if(result.error) throw new Error('backend_request_failed'); return result.data; }
export function base64(bytes) { let s=''; for(let i=0;i<bytes.length;i+=8192) s+=String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(s); }
export function bytes(encoded) { return Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)); }
export function assertTarget(ref,url,key) {
 const allowed = ref===LOCAL ? 'http://127.0.0.1:55421' : /^[a-z]{20}$/.test(ref||'') && ref!==PROD ? `https://${ref}.supabase.co` : null;
 if(!allowed || ref===PROD || url!==allowed) throw new Error('restore_target_forbidden');
 // Restore deliberately requires project-bound legacy service JWTs; opaque keys fail closed.
 let claims; try { claims=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch { throw new Error('restore_key_unverifiable'); }
 if(claims.role!=='service_role' || (ref!==LOCAL && claims.ref!==ref) || claims.ref===PROD) throw new Error('restore_key_mismatch');
}
export async function readPages(fetchPage, expected, size=500) {
 if(!Number.isSafeInteger(expected)||expected<0) throw new Error('invalid_row_count');
 const rows=[];
 while(rows.length<expected) {
  const page=await fetchPage(rows.length,size);
  if(!Array.isArray(page)||!page.length||page.length>size||rows.length+page.length>expected) throw new Error('incomplete_dataset');
  rows.push(...page);
 }
 const tail=await fetchPage(rows.length,size);
 if(!Array.isArray(tail)||tail.length) throw new Error('dataset_count_mismatch');
 return rows;
}
function sameKeys(actual,expected) { return canonical(Object.keys(actual).sort())===canonical([...expected].sort()); }
function safePath(path) { return typeof path==='string' && path.length>0 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(s=>!s||s==='.'||s==='..'); }
function reference(value,bucket,ref) {
 if(!value) return null;
 if(/^https?:/.test(value)) {
  const u=new URL(value);
  const expected=ref===LOCAL?'http://127.0.0.1:55421':`https://${ref}.supabase.co`;
  const prefix=`/storage/v1/object/public/${bucket}/`;
  if(u.origin!==expected || !u.pathname.startsWith(prefix) || u.search) throw new Error('external_asset_requires_migration');
  return decodeURIComponent(u.pathname.slice(prefix.length));
 }
 return value;
}
export function verifyReferences(datasets,ref) {
 const files=new Set(datasets.storage_objects.map(o=>`${o.bucket}/${o.path}`));
 for(const [table,cols,bucket] of [['clues_base',['file_url','pdf_url'],'clue-files'],['suspects',['photo_url'],'suspect-photos']]) {
  for(const row of datasets[table]) for(const col of cols) {
   const p=reference(row[col],bucket,ref);
   if(p && !files.has(`${bucket}/${p}`)) throw new Error('referenced_storage_missing');
  }
 }
 const users=new Set(datasets.auth_users.map(u=>u.id));
 for(const profile of datasets.profiles) if(!users.has(profile.id)) throw new Error('auth_mapping_incomplete');
}
export async function validateBundle(bundle) {
 const m=bundle?.manifest;
 if(!m||m.backup_format_version!==2||m.kind!=='csi-hit-portable'||m.status!=='complete'||m.schema_version!=='operations-v2'||!Array.isArray(m.errors)||m.errors.length) throw new Error('invalid_manifest');
 if(!/^[0-9a-f-]{36}$/.test(m.backup_id)||!m.project_ref||!Number.isFinite(Date.parse(m.created_at))) throw new Error('invalid_manifest');
 if(!sameKeys(bundle.datasets,DATASETS)||!sameKeys(m.datasets,DATASETS)) throw new Error('dataset_coverage_mismatch');
 for(const name of DATASETS) {
  const rows=bundle.datasets[name], info=m.datasets[name];
  if(!Array.isArray(rows)||rows.length!==info.row_count||await hash(canonical(rows))!==info.sha256) throw new Error(`dataset_integrity:${name}`);
  const ids=rows.map(r=>name==='storage_objects'?`${r.bucket}/${r.path}`:name==='app_settings'?r.key:r.id);
  if(ids.some(id=>!id)||new Set(ids).size!==ids.length) throw new Error('duplicate_or_missing_identity');
 }
 const buckets=bundle.datasets.storage_buckets;
 if(buckets.some(b=>!['clue-files','suspect-photos'].includes(b.id))) throw new Error('unknown_storage_bucket');
 if(bundle.datasets.auth_users.some(u=>!sameKeys(u,['id','email','email_confirmed'])||!u.email)) throw new Error('unsupported_auth_identity');
 if(!Array.isArray(bundle.files)||bundle.files.length!==m.storage_object_count||bundle.files.length!==bundle.datasets.storage_objects.length) throw new Error('storage_count_mismatch');
 const seen=new Set();
 for(const f of bundle.files) {
  const key=`${f.bucket}/${f.path}`;
  if(!safePath(f.path)||seen.has(key)) throw new Error('unsafe_storage_path'); seen.add(key);
  const inv=bundle.datasets.storage_objects.find(o=>o.bucket===f.bucket&&o.path===f.path);
  if(!inv || !buckets.some(b=>b.id===f.bucket) || inv.size!==f.size || inv.content_type!==f.content_type) throw new Error('storage_inventory_mismatch');
  const data=bytes(f.base64);
  if(data.length!==f.size||await hash(data)!==f.sha256) throw new Error('storage_integrity');
 }
 verifyReferences(bundle.datasets,m.project_ref);
 const {manifest_sha256,...unsigned}=m;
 if(await hash(canonical(unsigned))!==manifest_sha256) throw new Error('manifest_integrity');
 return bundle;
}
export async function buildBundle(client,start,{projectRef,release=null}={}) {
 const datasets={}, info={}, files=[];
 if(!sameKeys(start.row_counts,DATASETS)) throw new Error('snapshot_coverage_mismatch');
 for(const name of DATASETS) {
  datasets[name]=await readPages(async(offset,size)=>ok(await client.rpc('backup_page',{run_id:start.id,dataset:name,page_offset:offset,page_size:size})),start.row_counts[name]);
  info[name]={row_count:datasets[name].length,sha256:await hash(canonical(datasets[name]))};
 }
 verifyReferences(datasets,projectRef);
 let total=new TextEncoder().encode(canonical(datasets)).length;
 for(const o of datasets.storage_objects) {
  if(!safePath(o.path)||!['clue-files','suspect-photos'].includes(o.bucket)) throw new Error('unsupported_storage_object');
  total+=Math.ceil(o.size/3)*4;
  if(!Number.isSafeInteger(o.size)||o.size<0||total>MAX_BYTES) throw new Error('bundle_size_limit');
  const blob=ok(await client.storage.from(o.bucket).download(o.path));
  const data=new Uint8Array(await blob.arrayBuffer());
  if(data.length!==o.size) throw new Error('storage_changed_during_backup');
  files.push({...o,base64:base64(data),sha256:await hash(data)});
 }
 // Inventory changes fail the backup. Object bytes are not transactionally snapshotted by Storage.
 const inventory=ok(await client.rpc('backup_storage_inventory'));
 if(canonical(inventory)!==canonical(datasets.storage_objects)) throw new Error('storage_changed_during_backup');
 const manifest={backup_format_version:2,kind:'csi-hit-portable',backup_id:start.id,created_at:start.snapshot_at,
  completed_at:new Date().toISOString(),game_mode:start.game_mode,environment:projectRef===PROD?'production':'test',project_ref:projectRef,
  release,schema_version:start.schema_version,schema_fingerprint:start.schema_fingerprint,snapshot_id:start.snapshot_id,
  consistency:'database-mvcc; storage-inventory-checked-before-and-after',datasets:info,storage_object_count:files.length,
  auth_strategy:'email-confirmed-accounts-with-explicit-id-mapping; no-passwords-or-sessions',status:'complete',errors:[]};
 manifest.manifest_sha256=await hash(canonical(manifest));
 const bundle={manifest,datasets,files};
 await validateBundle(bundle);
 if(new TextEncoder().encode(JSON.stringify(bundle)).length>MAX_BYTES) throw new Error('bundle_size_limit');
 return bundle;
}
export async function runBackup(client,{source,actor=null,requestId=crypto.randomUUID(),projectRef,release=null,save=true}) {
 const start=ok(await client.rpc('backup_begin',{run_id:requestId,run_source:source,run_actor:actor}));
 if(start.replayed||start.status==='skipped_test') return {status:start.status,backup_id:requestId,replayed:!!start.replayed};
 if(start.status!=='running') throw new Error('snapshot_failed');
 try {
  const snapshot=ok(await client.rpc('backup_capture',{run_id:requestId}));
  const bundle=await buildBundle(client,snapshot,{projectRef,release});
  // Unique UUID key and upsert=false. Retry never overwrites a previous artifact.
  if(save) ok(await client.storage.from('backups').upload(`v2/${requestId}.json`,JSON.stringify(bundle),{contentType:'application/json',upsert:false}));
  ok(await client.rpc('backup_finish',{run_id:requestId,succeeded:true,object_count:bundle.files.length}));
  return {status:'success',backup_id:requestId,bundle};
 } catch(error) {
  try { ok(await client.rpc('backup_finish',{run_id:requestId,succeeded:false,failure_code:'export_or_upload_failed'})); } catch { /* timeout stays visible as running/expired */ }
  throw error;
 }
}
export async function listObjects(storage,prefix='') {
 const all=[];
 for(let offset=0;;) {
  const page=ok(await storage.list(prefix,{limit:500,offset,sortBy:{column:'name',order:'asc'}}));
  if(!Array.isArray(page)) throw new Error('storage_list_failed');
  if(!page.length) break;
  for(const item of page) {
   const path=prefix?`${prefix}/${item.name}`:item.name;
   if(item.id===null) all.push(...await listObjects(storage,path)); else all.push({...item,path});
  }
  offset+=page.length;
 }
 return all;
}
export async function maintenance(client,now=Date.now()) {
 ok(await client.rpc('backup_maintenance'));
 const storage=client.storage.from('backups');
 const items=await listObjects(storage);
 const latest=ok(await client.from('backup_runs').select('path').eq('status','success').order('finished_at',{ascending:false}).limit(1))[0]?.path;
 const stale=items.filter(o=>o.path!==latest&&/^(v2\/[0-9a-f-]+\.json|daily\/csi-hit-backup-\d{4}-\d{2}-\d{2}\.json)$/.test(o.path)&&Date.parse(o.created_at)<now-30*86400000).map(o=>o.path);
 for(let i=0;i<stale.length;i+=100) ok(await storage.remove(stale.slice(i,i+100)));
 return stale.length;
}
