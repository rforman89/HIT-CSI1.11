const {sql}=require('../../tests/backend/local.cjs'); // Fixed isolated backend; no production mode.
const {storageReport,removalPlan}=require('./plan.cjs');
const arg=process.argv[2];if(arg&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg))throw Error('Expected account UUID only; no destructive flags.');
const inventory=JSON.parse(sql("BEGIN READ ONLY; SELECT json_build_object('objects',(SELECT coalesce(json_agg(json_build_object('bucket_id',bucket_id,'name',name)),'[]') FROM storage.objects),'clues',(SELECT coalesce(json_agg(json_build_object('id',id,'file_url',file_url,'pdf_url',pdf_url)),'[]') FROM public.clues_base),'suspects',(SELECT coalesce(json_agg(json_build_object('id',id,'photo_url',photo_url)),'[]') FROM public.suspects)); COMMIT;"));
const report={storage:storageReport(inventory)};
if(arg) {
 const data=JSON.parse(sql(`BEGIN READ ONLY; SELECT json_build_object('profile',(SELECT json_build_object('id',id,'role',role,'is_active',is_active) FROM public.profiles WHERE id='${arg}'),'counts',json_build_object('notes',(SELECT count(*) FROM public.suspect_notes WHERE user_id='${arg}'),'transactions',(SELECT count(*) FROM public.credit_transactions WHERE created_by='${arg}'),'audit',(SELECT count(*) FROM public.operation_audit WHERE actor='${arg}')),'foreignKeys',(SELECT json_agg(json_build_object('table',conrelid::regclass::text,'constraint',pg_get_constraintdef(oid))) FROM pg_constraint WHERE contype='f' AND confrelid IN ('public.profiles'::regclass,'auth.users'::regclass))); COMMIT;`));
 report.account=removalPlan(data);
}
console.log(JSON.stringify(report,null,2));

