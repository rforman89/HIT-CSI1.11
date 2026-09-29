const assert=require('node:assert/strict');
const TEST='ksnagauoufsriwplvvtd',LOCAL='http://127.0.0.1:55421';
function validate(config,{target,profile='A',clients=5,seconds=60,allowHosted=false,writes=false}={}){
 assert(['local','hosted'].includes(target),'Explicit local/hosted target required');
 assert(['A','B','C','D'].includes(profile),'Unknown profile');
 assert(Number.isInteger(clients)&&clients>=1&&clients<=100,'Clients must be 1..100');
 assert(Number.isInteger(seconds)&&seconds>=10&&seconds<=1800,'Duration must be 10..1800 seconds');
 assert.equal(config.API_URL,target==='local'?LOCAL:`https://${TEST}.supabase.co`,'Only the exact isolated target is allowed');
 if(target==='hosted'){
  assert(allowHosted,'Hosted validation requires an explicit operator checkpoint');
  if(writes)assert(clients>=5&&seconds>=30,'Write mix requires all five roles and at least 30 seconds');
  assert.equal(config.PROJECT_REF,TEST);
  for(const key of [config.ANON_KEY,config.SERVICE_ROLE_KEY]){const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));assert.equal(claims.ref,TEST,'Credential project mismatch');}
 }else{assert(clients<=10,'Local simulation capped at 10; not a capacity stress test');assert(!writes,'Load writes require hosted TEST');assert(profile!=='D','Stress profile D is hosted TEST only');}
 return {origin:config.API_URL,marker:target==='local'?'csi-hit-reliability':TEST};
}
module.exports={validate,TEST,LOCAL};
