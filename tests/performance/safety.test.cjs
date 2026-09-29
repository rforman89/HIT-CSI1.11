const {test}=require('node:test'),assert=require('node:assert/strict');
const {validate,TEST,LOCAL}=require('./safety.cjs');
const jwt=ref=>'header.'+Buffer.from(JSON.stringify({ref})).toString('base64url')+'.signature';
test('load harness rejects Production, custom hosts, URL credentials and redirects at configuration boundary',()=>{
 for(const url of ['https://uhfcrskkgutlqqogahbr.supabase.co','https://app.csi-hit.nl',LOCAL+'/',LOCAL+'?target=production','http://localhost:55421','https://evil.invalid'])assert.throws(()=>validate({API_URL:url},{target:'local'}));
});
test('local load has hard limits and cannot execute writes or stress',()=>{
 for(const options of [{clients:11},{seconds:0},{seconds:1801},{profile:'D'},{writes:true}])assert.throws(()=>validate({API_URL:LOCAL},{target:'local',...options}));
 assert.equal(validate({API_URL:LOCAL},{target:'local'}).origin,LOCAL);
});
test('hosted requires explicit checkpoint, exact project and matching credentials',()=>{
 const config={API_URL:`https://${TEST}.supabase.co`,PROJECT_REF:TEST,ANON_KEY:jwt(TEST),SERVICE_ROLE_KEY:jwt(TEST)};
 assert.throws(()=>validate(config,{target:'hosted'}));
 assert.throws(()=>validate({...config,SERVICE_ROLE_KEY:jwt('uhfcrskkgutlqqogahbr')},{target:'hosted',allowHosted:true}));
 for(const options of [{clients:4},{seconds:10}])assert.throws(()=>validate(config,{target:'hosted',allowHosted:true,writes:true,...options}));
 assert.equal(validate(config,{target:'hosted',allowHosted:true}).marker,TEST);
});
