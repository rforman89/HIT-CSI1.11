const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../../api/keep-alive.js');
async function invoke(req,env={}){
 const old={...process.env},originalFetch=global.fetch;
 process.env.CRON_SECRET='test-only-cron-secret';Object.assign(process.env,env);
 let status,body,calls=0;
 global.fetch=async()=>{calls++;throw Error('unexpected_request');};
 const res={status(value){status=value;return this;},json(value){body=value;return this;}};
 try{await handler({headers:{},...req},res);return{status,body,calls};}
 finally{process.env=old;global.fetch=originalFetch;}
}
test('cron rejects unsupported methods',async()=>assert.equal((await invoke({method:'POST'})).status,405));
test('cron rejects query-string credentials',async()=>{const r=await invoke({method:'GET',query:{secret:'test-only-cron-secret'}});assert.equal(r.status,401);assert.equal(r.calls,0);});
test('Preview cron refuses Production before any outbound request',async()=>{
 const r=await invoke({method:'GET',headers:{authorization:'Bearer test-only-cron-secret'}},{VERCEL_ENV:'preview',SUPABASE_URL:'https://uhfcrskkgutlqqogahbr.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only'});
 assert.equal(r.status,500);assert.equal(r.calls,0);
});
