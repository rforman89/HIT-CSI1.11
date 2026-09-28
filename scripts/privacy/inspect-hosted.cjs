// Read-only inventory, exclusively on the verified CSI HIT TEST adapter.
const {sql,verify,projectRef}=require('../../tests/backend/hosted.cjs');
const {storageReport}=require('./plan.cjs');
(async()=>{
 await verify();
 const inventory=JSON.parse(sql("BEGIN READ ONLY; SELECT json_build_object('objects',(SELECT coalesce(json_agg(json_build_object('bucket_id',bucket_id,'name',name)),'[]') FROM storage.objects),'clues',(SELECT coalesce(json_agg(json_build_object('id',id,'file_url',file_url,'pdf_url',pdf_url)),'[]') FROM public.clues_base),'suspects',(SELECT coalesce(json_agg(json_build_object('id',id,'photo_url',photo_url)),'[]') FROM public.suspects))::text; COMMIT;"));
 console.log(JSON.stringify({projectRef,...storageReport(inventory)},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
