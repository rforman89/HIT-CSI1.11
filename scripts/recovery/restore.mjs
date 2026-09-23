import { TABLES,TEST,LOCAL,ok,assertTarget,validateBundle,canonical,hash,bytes,listObjects } from '../../supabase/functions/_shared/backup.mjs';

export async function listUsers(client) {
 const result=[];
 for(let page=1;;page++) {
  const data=ok(await client.auth.admin.listUsers({page,perPage:500}));
  if(!data.users.length) break;
  result.push(...data.users);
 }
 return result;
}
const USER_COLUMNS={profiles:['id'],group_members:['user_id'],suspect_users:['user_id'],suspect_notes:['user_id'],
 notifications:['user_id','created_by'],credit_transactions:['created_by'],final_reports:['submitted_by'],app_settings:['updated_by'],operation_audit:['actor']};
export function mappedDatasets(bundle,mapping,target,url) {
 const datasets=structuredClone(Object.fromEntries(TABLES.map(t=>[t,bundle.datasets[t]])));
 for(const [table,cols] of Object.entries(USER_COLUMNS)) for(const row of datasets[table]) for(const col of cols) {
  if(row[col]) {
   // Audit actors have no FK: preserve historical UUIDs for already-deleted identities.
   if(table==='operation_audit'&&!mapping[row[col]]) continue;
   if(!mapping[row[col]]) throw new Error('account_mapping_missing'); row[col]=mapping[row[col]];
  }
 }
 for(const [table,cols,bucket] of [['clues_base',['file_url','pdf_url'],'clue-files'],['suspects',['photo_url'],'suspect-photos']]) {
  for(const row of datasets[table]) for(const col of cols) if(/^https?:/.test(row[col]||'')) {
   const old=new URL(row[col]); row[col]=url+old.pathname;
  }
 }
 // Infrastructure/history settings must not point to a previous project's archives.
 datasets.app_settings=datasets.app_settings.filter(r=>!['latest_auto_backup','test_environment'].includes(r.key));
 const mode=datasets.app_settings.find(r=>r.key==='game_mode');
 if(!mode) throw new Error('game_mode_missing'); mode.value='test'; mode.updated_by=null;
 datasets.app_settings.push({key:'test_environment',value:target,updated_at:null,updated_by:null});
 return datasets;
}
export async function prepareAccounts(client,identities,{recreate=false}={}) {
 const existing=await listUsers(client); const mapping={}; const created=[];
 for(const source of identities) {
  const byId=existing.find(u=>u.id===source.id);
  if(byId&&byId.email?.toLowerCase()!==source.email?.toLowerCase()) throw new Error('account_id_collision');
  const matches=existing.filter(u=>u.email?.toLowerCase()===source.email?.toLowerCase());
  if(matches.length>1) throw new Error('ambiguous_account_mapping');
  let account=byId||matches[0];
  if(!account) {
   if(!recreate||!source.email_confirmed) throw new Error('account_recreation_required');
   // No invitation/email is sent. Password, MFA, providers and sessions are never restored.
   account=ok(await client.auth.admin.createUser({email:source.email,email_confirm:true})).user;
   created.push(account.id); existing.push(account);
  }
  if(source.email_confirmed&&!account.email_confirmed_at) throw new Error('target_email_unconfirmed');
  mapping[source.id]=account.id;
 }
 if(new Set(Object.values(mapping)).size!==identities.length) throw new Error('account_mapping_not_bijective');
 return {mapping,created};
}
function comparable(table,rows) {
 return rows.map(row=>{
  const r={...row};
  if(table==='app_settings'&&['game_mode','test_environment'].includes(r.key)) { delete r.updated_at; r.updated_by=null; }
  return r;
 }).sort((a,b)=>String(a.id||a.key).localeCompare(String(b.id||b.key)));
}
export async function verifyRestore(client,bundle,datasets,mapping,target) {
 const report={backup_id:bundle.manifest.backup_id,target,datasets:[],storage:[],accounts:[],verified:false};
 // Capture readback through the same privileged, paginated snapshot (clues_base is not exposed to browser roles).
 const id=crypto.randomUUID();
 const start=ok(await client.rpc('backup_begin',{run_id:id,run_source:'drill'}));
 if(start.status!=='running') throw new Error('verification_snapshot_failed');
 try {
  ok(await client.rpc('backup_capture',{run_id:id}));
  for(const table of TABLES) {
   const rows=[]; for(let offset=0;;) {
    const page=ok(await client.rpc('backup_page',{run_id:id,dataset:table,page_offset:offset,page_size:500}));
    if(!page.length) break; rows.push(...page); offset+=page.length;
   }
   const expected=comparable(table,datasets[table]),actual=comparable(table,rows);
   const valid=actual.length===expected.length&&await hash(canonical(actual))===await hash(canonical(expected));
   report.datasets.push({name:table,expected:expected.length,actual:actual.length,verified:valid});
  }
 } finally { ok(await client.rpc('backup_finish',{run_id:id,succeeded:false,failure_code:'verification_snapshot_only'})); }
 for(const bucket of bundle.datasets.storage_buckets) {
  const actual=ok(await client.storage.getBucket(bucket.id));
  if(actual.public!==bucket.public) throw new Error('bucket_visibility_mismatch');
  const objects=await listObjects(client.storage.from(bucket.id));
  const expected=bundle.files.filter(f=>f.bucket===bucket.id);
  if(objects.length!==expected.length) throw new Error('unexpected_storage_objects');
 }
 for(const f of bundle.files) {
  const blob=ok(await client.storage.from(f.bucket).download(f.path));
  const data=new Uint8Array(await blob.arrayBuffer());
  report.storage.push({bucket:f.bucket,path:f.path,verified:data.length===f.size&&await hash(data)===f.sha256});
 }
 const users=await listUsers(client);
 for(const old of bundle.datasets.auth_users) report.accounts.push({old_id:old.id,new_id:mapping[old.id],verified:users.some(u=>u.id===mapping[old.id]&&u.email?.toLowerCase()===old.email.toLowerCase())});
 report.verified=[...report.datasets,...report.storage,...report.accounts].every(x=>x.verified);
 report.summary=`${report.datasets.filter(x=>x.verified).length}/${TABLES.length} datasets; ${report.storage.filter(x=>x.verified).length}/${bundle.files.length} storage; ${report.accounts.filter(x=>x.verified).length}/${bundle.datasets.auth_users.length} accounts`;
 if(!report.verified) { const error=new Error('restore_verification_failed'); error.report=report; throw error; }
 // PostgreSQL checked every FK during the atomic import; triggers/constraints remain enabled.
 report.foreign_keys='enforced by PostgreSQL during transaction';
 report.intentional_changes=['game_mode=test','target marker','Auth UUID mapping','project Storage URLs','legacy latest_auto_backup excluded'];
 return report;
}
export async function restoreBundle(client,bundle,{target,url,key,confirmation,recreate=false,onPhase=()=>{}}) {
 const started=performance.now(); const timings={};
 assertTarget(target,url,key);
 if(confirmation!==`RESTORE ${target}`) throw new Error('explicit_restore_confirmation_required');
 await validateBundle(bundle);
 const preflight=ok(await client.rpc('restore_preflight',{target_ref:target}));
 if(preflight.schema_version!==bundle.manifest.schema_version||preflight.schema_fingerprint!==bundle.manifest.schema_fingerprint) throw new Error('schema_migration_mismatch');
 timings.preflight_ms=performance.now()-started; onPhase('preflight');
 // Preflight all buckets before changing accounts/data. Never alter a bucket's visibility silently.
 for(const b of bundle.datasets.storage_buckets) {
  const existing=ok(await client.storage.getBucket(b.id));
  if(existing.public!==b.public||existing.file_size_limit!==b.file_size_limit||canonical(existing.allowed_mime_types)!==canonical(b.allowed_mime_types)) throw new Error('bucket_configuration_mismatch');
 }
 let phase=performance.now();
 const {mapping,created}=await prepareAccounts(client,bundle.datasets.auth_users,{recreate});
 timings.accounts_ms=performance.now()-phase; onPhase('accounts');
 const datasets=mappedDatasets(bundle,mapping,target,url);
 phase=performance.now();
 ok(await client.rpc('restore_database',{target_ref:target,confirmation,datasets,fingerprint:preflight.schema_fingerprint}));
 timings.database_ms=performance.now()-phase; onPhase('database');
 phase=performance.now();
 for(const b of bundle.datasets.storage_buckets) {
  const bucket=client.storage.from(b.id), expected=bundle.files.filter(f=>f.bucket===b.id);
  // Restored project is closed to players during this non-transactional phase.
  const extras=(await listObjects(bucket)).filter(o=>!expected.some(f=>f.path===o.path)).map(o=>o.path);
  for(let i=0;i<extras.length;i+=100) ok(await bucket.remove(extras.slice(i,i+100)));
  for(const f of expected) ok(await bucket.upload(f.path,bytes(f.base64),{contentType:f.content_type,upsert:true}));
 }
 timings.storage_ms=performance.now()-phase; onPhase('storage');
 phase=performance.now();
 const report=await verifyRestore(client,bundle,datasets,mapping,target);
 timings.verification_ms=performance.now()-phase; timings.total_ms=performance.now()-started;
 Object.assign(report,{timings,created_accounts:created,mapping,application_usable_verified:false});
 ok(await client.from('restore_checks').insert({backup_id:bundle.manifest.backup_id,target,report}));
 return report;
}
