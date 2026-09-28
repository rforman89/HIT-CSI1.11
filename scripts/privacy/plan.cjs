// Pure, read-only planning. Paths are reported for operator review; never deleted here.
function objectPath(value,bucket) {
 if(!value)return null;
 if(value.startsWith('http')) {
  const u=new URL(value),prefix='/storage/v1/object/public/'+bucket+'/';
  if(!u.pathname.startsWith(prefix))return null;
  return decodeURIComponent(u.pathname.slice(prefix.length));
 }
 return value;
}
function storageReport({objects,clues,suspects}) {
 const references=new Set(),invalidReferences=[];
 for(const [rows,fields,bucket] of [[clues,['file_url','pdf_url'],'clue-files'],[suspects,['photo_url'],'suspect-photos']])
 for(const row of rows)for(const field of fields)if(row[field]){
  const path=objectPath(row[field],bucket);
  if(path)references.add(bucket+'/'+path);else invalidReferences.push({id:row.id,field});
 }
 const stored=new Set(objects.filter(o=>['clue-files','suspect-photos'].includes(o.bucket_id)).map(o=>o.bucket_id+'/'+o.name));
 return {readOnly:true,missing:[...references].filter(p=>!stored.has(p)).sort(),orphanCandidates:[...stored].filter(p=>!references.has(p)).sort(),invalidReferences};
}
function removalPlan({profile,counts,foreignKeys}) {
 if(!profile)return {readOnly:true,exists:false};
 return {readOnly:true,exists:true,accountId:profile.id,role:profile.role,active:profile.is_active,counts,foreignKeys,
  steps:['Deactivate profile first (RLS revokes game access with existing JWT).','Revoke Auth refresh sessions; access JWTs can live to expiry.','Detach group/suspect memberships after review.','Review/anonymize authored free text; retain game totals and attribution as a pseudonymous tombstone.','Null nullable actor foreign keys in an explicit reviewed transaction before deleting Auth user; do not cascade notes blindly.','Delete Storage objects only after full reference scan and explicit per-object confirmation.','Remove/restrict retained backups only under approved retention; old bundles can reintroduce removed identities.'],
  destructiveExecutionAvailable:false};
}
module.exports={storageReport,removalPlan};
