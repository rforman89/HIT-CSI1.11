// One real admin browser alongside a separately bounded hosted API workload.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {config,fixtureFile,verify}=require('../backend/hosted.cjs');
require('./safety.cjs').validate(config,{target:'hosted',allowHosted:process.argv.includes('--allow-hosted')});
const preview=JSON.parse(fs.readFileSync('.local/preview.json')),fixture=JSON.parse(fs.readFileSync(fixtureFile));
assert.equal(preview.branch,'hardening/performance-scale');assert.equal(new URL(preview.url).protocol,'https:');assert(new URL(preview.url).hostname.endsWith('.vercel.app'));
const seconds=Number(process.argv.find(a=>a.startsWith('--seconds='))?.split('=')[1]||900);
assert(Number.isInteger(seconds)&&seconds>=60&&seconds<=900);
(async()=>{
 await verify();const browser=await chromium.launch(),report={seconds,startedAt:new Date().toISOString(),samples:[],errors:[],sockets:{opened:0,closed:0},passed:false};
 const context=await browser.newContext({storageState:'.local/preview-browser-state.json',viewport:{width:390,height:844}});
 try{
  const meta=await(await context.request.get(preview.url+'/build-meta.json')).json();assert.equal(meta.environment,'test');assert.equal(meta.release,preview.commit);
  await context.route('**/*',r=>[preview.url,config.API_URL].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
  const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  page.on('pageerror',()=>report.errors.push('pageerror'));
  page.on('response',r=>{if(r.status()>=400)report.errors.push('http-'+r.status());});
  page.on('websocket',ws=>{report.sockets.opened++;ws.on('close',()=>report.sockets.closed++);});
  await page.goto(preview.url);await page.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts.admin.email);await page.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts.admin.password);await page.getByRole('button',{name:'Inloggen',exact:true}).click();await page.getByRole('button',{name:'Uitloggen',exact:true}).waitFor();
  const start=Date.now();
  do{
   await cdp.send('HeapProfiler.collectGarbage');
   const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m=>['JSHeapUsedSize','Nodes','Documents','TaskDuration'].includes(m.name)).map(m=>[m.name,m.value]));
   report.samples.push({elapsedSeconds:(Date.now()-start)/1000,...metrics,sockets:report.sockets.opened-report.sockets.closed});
   assert.equal(report.errors.length,0);assert.equal(await page.getByText('Verversen mislukt.',{exact:false}).count(),0);assert(report.sockets.opened-report.sockets.closed<=1,'Socket accumulation');
   console.log('Browser soak sample '+report.samples.length);
   if(Date.now()-start>=seconds*1000)break;await page.waitForTimeout(Math.min(60000,seconds*1000-(Date.now()-start)));
  }while(true);
  report.passed=true;
 }catch(e){report.failure=e.message;process.exitCode=1;}
 finally{await context.close();await browser.close();fs.writeFileSync('.local/performance/hosted-browser-soak.json',JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1});
