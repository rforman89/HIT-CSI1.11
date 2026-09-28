const {test}=require('node:test'),assert=require('node:assert/strict'),{storageReport,removalPlan}=require('../../scripts/privacy/plan.cjs');
test('orphan detector finds missing and unreferenced objects, excludes backups and deduplicates',()=>{
 const r=storageReport({objects:[{bucket_id:'clue-files',name:'found.pdf'},{bucket_id:'clue-files',name:'orphan.pdf'},{bucket_id:'backups',name:'v2/archive.json'}],clues:[{id:'a',file_url:'found.pdf',pdf_url:'found.pdf'}],suspects:[{id:'s',photo_url:'https://test.supabase.co/storage/v1/object/public/suspect-photos/missing.png'}]});
 assert.deepEqual(r.missing,['suspect-photos/missing.png']);assert.deepEqual(r.orphanCandidates,['clue-files/orphan.pdf']);assert.equal(r.readOnly,true);
});
test('external references are reported for review, never deletion',()=>assert.deepEqual(storageReport({objects:[],clues:[],suspects:[{id:'s',photo_url:'https://external.example/p.png'}]}).invalidReferences,[{id:'s',field:'photo_url'}]));
test('removal plan preserves game integrity and has no destructive executor',()=>{const r=removalPlan({profile:{id:'u',role:'participant',is_active:true},counts:{notes:2},foreignKeys:['cascade']});assert.equal(r.destructiveExecutionAvailable,false);assert.equal(r.counts.notes,2);assert.ok(r.steps.some(s=>s.includes('do not cascade')));});
test('missing account is a read-only no-op',()=>assert.deepEqual(removalPlan({}),{readOnly:true,exists:false}));
