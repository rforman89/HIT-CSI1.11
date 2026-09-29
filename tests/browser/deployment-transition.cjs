// Read-only deploy-skew rehearsal: load old Production frontend, then route reloads to Preview.
// No origin is changed externally; the switch exists only in this browser context.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const preview=process.env.CSI_READONLY_PREVIEW;
assert(preview&&new URL(preview).protocol==='https:'&&new URL(preview).hostname.endsWith('.vercel.app'));
(async()=>{
 const browser=await chromium.launch(),context=await browser.newContext({serviceWorkers:'block'});
 const origin='https://app.csi-hit.nl',newOrigin=new URL(preview).origin,errors=[];
 let switched=false;
 try{
  await context.request.get(preview);
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.method()!=='GET'||url.origin!==origin){errors.push('Unexpected request: '+req.method()+' '+url.hostname);return route.abort();}
   if(!switched)return route.continue();
   const response=await context.request.get(newOrigin+url.pathname+url.search);
   return route.fulfill({response});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.getByRole('button',{name:'Inloggen',exact:true}).waitFor();await page.waitForLoadState('networkidle');
  const before=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
  assert(before.some(src=>src.startsWith('/static/js/')),'Expected old CRA entry');
  switched=true;
  // The already-loaded client still accepts interaction; do not submit Auth or gameplay.
  await page.getByPlaceholder('E-mail',{exact:true}).fill('fictief@example.test');
  assert.equal(await page.getByPlaceholder('E-mail',{exact:true}).inputValue(),'fictief@example.test');
  await page.reload();await page.getByRole('button',{name:'Inloggen',exact:true}).waitFor();await page.waitForLoadState('networkidle');
  const after=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
  assert(after.some(src=>src.startsWith('/assets/')),'Expected new Vite entry');assert.notDeepEqual(before,after);
  assert.deepEqual(errors,[]);
  const result={oldEntry:before,newEntry:after,loadedClientUsable:true,refreshLoadsNewBuild:true,backendRequests:0,errors};
  fs.mkdirSync('.local/build-hardening',{recursive:true});fs.writeFileSync('.local/build-hardening/deployment-transition.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  await context.unrouteAll({behavior:'wait'});
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
