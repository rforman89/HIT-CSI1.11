// Read-only built-client check. No login, Auth mutation or backend request is permitted.
const { chromium }=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.CSI_READONLY_PREVIEW||'http://127.0.0.1:3100';
const origin=new URL(base).origin;
assert(origin==='http://127.0.0.1:3100'||(new URL(base).protocol==='https:'&&new URL(base).hostname.endsWith('.vercel.app')));
const sizes=[[360,800],[375,812],[390,844],[393,873],[412,915],[430,932],[844,390],[390,500]];
(async()=>{
 const browser=await chromium.launch();
 const report={origin,layouts:0,pages:[],errors:[],blockedRequests:[]};
 try{
  for(const landing of [false,true]){
   const context=await browser.newContext({serviceWorkers:'block'});
   await context.addInitScript(()=>{window.cspViolations=[];document.addEventListener('securitypolicyviolation',e=>window.cspViolations.push(e.violatedDirective));});
   await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()!=='GET'||!([origin,...(landing?['https://www.csi-hit.nl']:[])].includes(url.origin))){report.blockedRequests.push({host:url.hostname,method:request.method()});return route.abort();}
    if(url.origin==='https://www.csi-hit.nl'){
     const response=await context.request.get(origin+url.pathname+url.search);
     return route.fulfill({response});
    }
    return route.continue();
   });
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${new URL(r.url()).pathname}`);});
   const url=landing?'https://www.csi-hit.nl/':origin+'/direct-load';
   await page.goto(url);
   if(!landing)await page.getByRole('button',{name:'Inloggen',exact:true}).waitFor();
   else await page.getByText('Los de zaak op voordat de tijd om is.',{exact:true}).waitFor();
   for(const [width,height]of sizes){
    await page.setViewportSize({width,height});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    report.layouts++;
   }
   await page.reload();assert(await page.locator('#root').innerText());
   assert.deepEqual(await page.evaluate(()=>window.cspViolations),[]);
   fs.mkdirSync('.local/build-hardening',{recursive:true});
   await page.screenshot({path:`.local/build-hardening/${landing?'landing':'login'}-smoke.png`});
   report.pages.push({landing,hardRefresh:true,directLoad:!landing});
   await context.close();
  }
  const request=await browser.newContext();
  const response=await request.request.get(origin), html=await response.text();
  assert.equal(response.status(),200);assert.match(response.headers()['content-security-policy'],/script-src 'self';/);
  const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);assert(scripts.length);
  for(const src of scripts){assert.match(src,/\/assets\/.*-[a-zA-Z0-9_-]+\.js$/);const asset=await request.request.get(new URL(src,origin).href);assert.equal(asset.status(),200);assert.match(asset.headers()['content-type'],/javascript/);}
  const metadata=await (await request.request.get(origin+'/build-meta.json')).json();report.metadata=metadata;
  if(origin.startsWith('https:')){
   assert.equal((await request.request.get(origin+'/api/keep-alive')).status(),401);
   assert.equal((await request.request.get(origin+'/assets/definitely-missing.js')).status(),404);
   assert.equal((await request.request.get(origin+'/.local/fixture.json')).status(),404);
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.blockedRequests,[]);
  fs.writeFileSync('.local/build-hardening/build-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
