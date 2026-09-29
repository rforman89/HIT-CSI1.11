// Explicit isolated backend only; no credentials, bodies or query values in reports.
const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {chromium}=require('playwright');
const {config,hosted,fixtureFile,verify}=require('../backend/target.cjs');
const fixture=JSON.parse(fs.readFileSync(fixtureFile,'utf8'));
const preview=hosted?JSON.parse(fs.readFileSync('.local/preview.json','utf8')):null;
const base=preview?.url||'http://127.0.0.1:3100';
if(hosted){
 require('./safety.cjs').validate(config,{target:'hosted',allowHosted:process.argv.includes('--allow-hosted')});
 assert.equal(preview.branch,'hardening/performance-scale');
 assert.equal(new URL(base).protocol,'https:');assert(new URL(base).hostname.endsWith('.vercel.app'));
}
const label=process.argv[2]||'baseline',network=process.argv[3]||'normal';
assert(/^[a-z0-9-]+$/.test(label));assert(['normal','4g','slow'].includes(network));
const roles=process.argv[4]?.split(',')||['landing','login','a','suspect','jury','admin'];
assert(roles.length&&roles.every(r=>['landing','login','a','suspect','jury','admin'].includes(r)));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await verify();
 const browser=await chromium.launch(),report={label,network,viewport:[390,844],roles:[]};
 if(hosted){const c=await browser.newContext({storageState:'.local/preview-browser-state.json'});try{
  const metadata=await(await c.request.get(base+'/build-meta.json')).json();assert.equal(metadata.environment,'test');assert.equal(metadata.release,preview.commit);
  const html=await(await c.request.get(base)).text();let code='';for(const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)){const u=new URL(match[1],base);assert.equal(u.origin,base);code+=await(await c.request.get(u.href)).text();}
  assert(code.includes(config.API_URL));assert(!code.includes(config.SERVICE_ROLE_KEY));report.metadata=metadata;
 }finally{await c.close();}}
 try{for(const role of roles){
  const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',storageState:hosted?'.local/preview-browser-state.json':undefined});
  await c.addInitScript(()=>{window.__profile={commits:0,longTasks:[]};window.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,inject:()=>1,onCommitFiberRoot:()=>window.__profile.commits++,onCommitFiberUnmount:()=>{}};new PerformanceObserver(list=>window.__profile.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});});
  await c.route('**/*',async r=>{const u=new URL(r.request().url());if(role==='landing'&&u.origin==='https://www.csi-hit.nl')return r.fulfill({response:await c.request.get(base+u.pathname)});if(![base,config.API_URL].includes(u.origin))throw Error('Unexpected target refused');return r.continue();});
  const page=await c.newPage(),cdp=await c.newCDPSession(page);await cdp.send('Performance.enable');
  if(network!=='normal'){await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:network==='4g'?80:200,downloadThroughput:network==='4g'?200000:50000,uploadThroughput:100000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  let phase='initial';const requests=[],pending=new Map(),sockets={opened:0,closed:0,joins:0,leaves:0},errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('websocket',ws=>{sockets.opened++;ws.on('close',()=>sockets.closed++);ws.on('framesent',f=>{if(typeof f.payload==='string'){if(f.payload.includes('phx_join'))sockets.joins++;if(f.payload.includes('phx_leave'))sockets.leaves++;}});});
  page.on('request',r=>{const u=new URL(r.url());pending.set(r,{phase,method:r.method(),fingerprint:createHash('sha256').update(r.method()+r.url()+(r.postData()||'')).digest('hex'),path:u.pathname.replace(/\/object\/sign\/.*/, '/object/sign/[private]'),start:Date.now(),backend:u.origin===config.API_URL});});
  page.on('requestfinished',async r=>{const row=pending.get(r);if(!row)return;const response=await r.response();row.ms=Date.now()-row.start;row.status=response.status();try{row.bytes=(await response.body()).length;}catch{row.bytes=0;}requests.push(row);pending.delete(r);});
  page.on('requestfailed',r=>{const row=pending.get(r);if(row){requests.push({...row,aborted:true,ms:Date.now()-row.start,bytes:0});pending.delete(r);}});
  const start=Date.now();await page.goto(role==='landing'?'https://www.csi-hit.nl/':base);
  if(!['landing','login'].includes(role)){await page.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts[role].email);await page.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts[role].password);await page.getByRole('button',{name:'Inloggen',exact:true}).click();await page.getByRole('button',{name:'Uitloggen',exact:true}).waitFor({timeout:30000});}
  else await (role==='login'?page.getByRole('button',{name:'Inloggen',exact:true}):page.getByText('Los de zaak op voordat de tijd om is.',{exact:true})).waitFor();
  const usableMs=Date.now()-start;await pause(2500);
  const navigation=[];phase='navigation';
  if(['a','admin'].includes(role))for(const name of [/Verdachten/,/Clues/,/Dashboard/]){const button=page.getByRole('button',{name}).first();if(await button.count()){const t=Date.now();await button.click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));navigation.push({screen:String(name),ms:Date.now()-t});}}
  phase='idle';const idleMs=['landing','login'].includes(role)?1000:22000;await pause(idleMs);
  const profile=await page.evaluate(()=>({...window.__profile,domNodes:document.querySelectorAll('*').length,resources:performance.getEntriesByType('resource').map(r=>({type:r.initiatorType,transfer:r.transferSize,decoded:r.decodedBodySize}))}));
  const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m=>['TaskDuration','ScriptDuration','LayoutDuration','JSHeapUsedSize'].includes(m.name)).map(m=>[m.name,m.value]));
  if(await page.getByText('Verversen mislukt.',{exact:false}).count())errors.push('Visible snapshot refresh failure');
  if(await page.locator('img[src*="/object/sign/suspect-photos/"]').evaluateAll(images=>images.some(i=>!i.complete||i.naturalWidth===0)))errors.push('Private photo did not load');
  const duplicates=requests.filter((r,i)=>r.backend&&requests.slice(0,i).some(p=>p.path===r.path&&p.method===r.method&&r.start-p.start>=0&&r.start-p.start<1500)).length;
  const identical=requests.filter((r,i)=>r.backend&&requests.slice(0,i).some(p=>p.fingerprint===r.fingerprint&&r.start-p.start>=0&&r.start-p.start<1500)).length;
  await c.close();report.roles.push({role,usableMs,idleMs,navigation,metrics,profile,requests,sockets,duplicateEndpointRequestsWithin1500ms:duplicates,identicalRequestsWithin1500ms:identical,errors});console.log(role+': usable '+usableMs+'ms, backend requests '+requests.filter(r=>r.backend).length);
 }}finally{await browser.close();fs.mkdirSync('.local/performance',{recursive:true});fs.writeFileSync(`.local/performance/${label}-${network}.json`,JSON.stringify(report,null,2));}
 assert(report.roles.every(r=>r.errors.length===0),'Browser profile contains page/sync errors');
})().catch(e=>{console.error(e.message);process.exitCode=1});
