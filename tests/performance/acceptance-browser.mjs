// Two real Preview browsers. Called only after the hosted workload's target/marker checks.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const ok=r=>{if(r.error)throw Error(r.error.message);return r.data;};
export async function acceptanceBrowsers(config,fixture,state,service){
 const preview=JSON.parse(fs.readFileSync('.local/preview.json','utf8'));
 assert.equal(preview.branch,'hardening/performance-scale');
 assert.equal(preview.commit,'453a5e03f1bfa92b8fe29421c7d8c96d6ec3a648');
 assert.equal(new URL(preview.url).protocol,'https:');assert(new URL(preview.url).hostname.endsWith('.vercel.app'));
 const browser=await chromium.launch(),actors=[];
 const report={commit:preview.commit,clients:2,viewport:[390,844],mobile:{latencyMs:100,downloadBytesPerSecond:200000,cpuRate:4},roles:[],flows:[],errors:[],samples:[]};
 const measure=async(name,fn)=>{const start=performance.now();await fn();report.flows.push({name,ms:performance.now()-start});};
 try{
  for(const role of ['a','jury']){
   const context=await browser.newContext({storageState:'.local/preview-browser-state.json',viewport:{width:390,height:844},serviceWorkers:'block'});
   const meta=await(await context.request.get(preview.url+'/build-meta.json')).json();assert.equal(meta.release,preview.commit);assert.equal(meta.environment,'test');
   const page=await context.newPage(),actor={role,context,page,offline:false,sockets:0,requests:0};actors.push(actor);
   await context.route('**/*',r=>{const origin=new URL(r.request().url()).origin;if(origin==='https://vercel.live')return r.fulfill({contentType:'application/javascript',body:''});assert([preview.url,config.API_URL].includes(origin),'Unexpected browser destination');return r.continue();});
   page.on('pageerror',()=>report.errors.push(role+':pageerror'));
   page.on('console',m=>{if(m.type()==='error'&&!actor.offline)report.errors.push(role+':console');});
   page.on('response',r=>{if(r.status()>=400&&!actor.offline)report.errors.push(role+':http-'+r.status());});
   page.on('requestfailed',r=>{if(!actor.offline&&!String(r.failure()?.errorText).includes('ERR_ABORTED'))report.errors.push(role+':network');});
   page.on('request',r=>{if(new URL(r.url()).origin===config.API_URL)actor.requests++;});
   page.on('websocket',ws=>{actor.sockets++;ws.on('close',()=>actor.sockets--);});
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');actor.cdp=cdp;
   if(role==='a'){await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:200000,uploadThroughput:100000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
   await measure(role+':login',async()=>{await page.goto(preview.url);await page.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts[role].email);await page.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts[role].password);await page.getByRole('button',{name:'Inloggen',exact:true}).click();await page.getByRole('button',{name:'Uitloggen',exact:true}).waitFor();});
   if(role==='a')await page.getByRole('button',{name:/🕵️ Verdachten/}).click();
   const photos=page.locator('img[src*="/object/sign/suspect-photos/"]');assert(await photos.count()>0,'Private photo missing');
   await photos.first().evaluate(i=>new Promise((resolve,reject)=>{if(i.complete)return i.naturalWidth?resolve():reject(Error('Photo failed'));i.addEventListener('load',resolve,{once:true});i.addEventListener('error',()=>reject(Error('Photo failed')),{once:true});}));
   report.roles.push({role,photoDecoded:true});
  }
 }catch(e){await browser.close();throw e;}
 const participant=actors[0],jury=actors[1],p=participant.page,j=jury.page;
 const pendingRelease=()=>j.getByRole('heading',{name:'Aanwijzingen vrijgeven',exact:true}).locator('..').locator('strong').filter({hasText:state.clues[2].title});
 return {report,
  async note(){await measure('mobile:note-and-feedback',async()=>{
   await p.locator('select').filter({has:p.locator(`option[value="${fixture.suspect}"]`)}).first().selectOption(fixture.suspect);
   await p.getByRole('button',{name:'Notitie toevoegen',exact:true}).click();const text='ACCEPTANCE '+state.run;
   await p.locator('textarea').last().fill(text);await p.getByRole('button',{name:'Notitie opslaan',exact:true}).click();await p.getByText('Notitie opgeslagen.',{exact:true}).waitFor();
   const rows=ok(await service.from('suspect_notes').select('id,group_id').eq('note',text));assert.equal(rows.length,1);state.notes.push({id:rows[0].id,group:rows[0].group_id});
  });},
  async credit(){await measure('jury:credit-and-idempotent-retry',async()=>{
   const reason='ACCEPTANCE '+state.run;await j.getByLabel('Groep voor pegelcorrectie').selectOption(fixture.groupA);await j.getByLabel('Aantal pegels').fill('1');await j.getByLabel('Reden pegelcorrectie').fill(reason);
   const request=j.waitForRequest(r=>new URL(r.url()).pathname==='/rest/v1/rpc/mutate_group_credits'&&r.method()==='POST');await j.getByRole('button',{name:'Pegels verwerken',exact:true}).click();const params=(await request).postDataJSON();
   await j.getByText('Pegels bijgewerkt.',{exact:true}).waitFor();const rows=ok(await service.from('credit_transactions').select('id,action_id').eq('action_id',params.action_id));assert.equal(rows.length,1);
   // Retry using the same jury actor and original UI action ID; no extra credit.
   state.browserCredit={params,transaction:rows[0].id};state.credits.push({action_id:params.action_id,transaction:rows[0].id});
  });},
  async prepareHotspot(){await p.getByRole('button',{name:/📄 Clues/}).click();
   await pendingRelease().waitFor();
   // An assigned clue already has an unlocked badge. Require an actual refreshed
   // released row and the jury's pending card to disappear, not that static badge.
   participant.releaseResponse=p.waitForResponse(async r=>{if(new URL(r.url()).pathname!=='/rest/v1/group_clues'||!r.ok())return false;const rows=await r.json();return Array.isArray(rows)&&rows.some(row=>row.id===state.assignment.id&&row.status==='released');},{timeout:10000});
   participant.releaseResponse.catch(()=>{});
  },
  async releaseViaJury(){await pendingRelease().locator('..').getByRole('button',{name:'Vrijgeven',exact:true}).click();},
  async hotspot(){await measure('mobile:released-response-and-jury-update',async()=>{await participant.releaseResponse;await pendingRelease().waitFor({state:'hidden',timeout:10000});const card=p.getByRole('heading',{name:state.clues[2].title,exact:true}).locator('..');await card.getByText('✅ Ontgrendeld',{exact:true}).waitFor({timeout:10000});});},
  async reconnect(){await measure('mobile:offline-online',async()=>{participant.offline=true;await participant.context.setOffline(true);await p.getByText('⚠️ SPELMODUS ONBEKEND',{exact:true}).waitFor();await p.waitForTimeout(2000);await participant.context.setOffline(false);await p.getByText('🧪 TESTMODUS',{exact:true}).first().waitFor();await p.waitForTimeout(1000);participant.offline=false;});},
  async check(elapsedSeconds){for(const a of actors){assert.equal(await a.page.getByText('Verversen mislukt.',{exact:false}).count(),0,'Visible sync failure');assert(a.sockets<=1,'Browser socket accumulation');}
   assert.equal(report.errors.length,0,'Browser error');if(!report.samples.length||elapsedSeconds-report.samples.at(-1).seconds>=55){const rows=[];for(const a of actors){const metrics=Object.fromEntries((await a.cdp.send('Performance.getMetrics')).metrics.filter(m=>['JSHeapUsedSize','Nodes','Documents'].includes(m.name)).map(m=>[m.name,m.value]));rows.push({role:a.role,sockets:a.sockets,requests:a.requests,...metrics});}report.samples.push({seconds:elapsedSeconds,roles:rows});}
  },
  async close(){await browser.close();}
 };
}
