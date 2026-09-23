import fs from 'node:fs/promises';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {assertTarget,TEST,LOCAL,hash} from '../../supabase/functions/_shared/backup.mjs';
const {values}=parseArgs({options:{target:{type:'string'},report:{type:'string'},url:{type:'string'},state:{type:'string'}}});
async function main(){
 if(![LOCAL,TEST].includes(values.target)||!values.report||!values.url)throw Error('explicit_test_target_report_url_required');
 const config=JSON.parse(await fs.readFile(values.target===LOCAL?'.local/test-backend.json':'.local/hosted-backend.json','utf8'));
 assertTarget(values.target,config.API_URL,config.SERVICE_ROLE_KEY);
 const base=new URL(values.url);
 if(values.target===LOCAL&&base.origin!=='http://127.0.0.1:3100')throw Error('local_frontend_required');
 if(values.target===TEST&&base.origin!=='http://127.0.0.1:3100'&&(base.protocol!=='https:'||!base.hostname.endsWith('.vercel.app')))throw Error('test_frontend_required');
 const report=JSON.parse(await fs.readFile(values.report,'utf8'));if(report.target!==values.target||!report.verified)throw Error('verified_matching_report_required');
 const bundle=JSON.parse(await fs.readFile(values.report.replace('-report.json','.json'),'utf8'));
 const fixture=JSON.parse(await fs.readFile(values.target===LOCAL?'.local/fixture.json':'.local/hosted-fixture.json','utf8'));
 const started=performance.now(),browser=await chromium.launch(),roles=[];
 try{
  for(const role of ['admin','a','suspect']){
   const context=await browser.newContext({viewport:{width:390,height:844},storageState:values.state});const errors=[];
   try{
    await context.route('**/*',r=>[base.origin,config.API_URL].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base.href);
    const scripts=await page.locator('script[src]').evaluateAll(els=>els.map(e=>e.src));let code='';
    for(const src of scripts){assert.equal(new URL(src).origin,base.origin);code+=await(await context.request.get(src)).text();}
    assert.ok(code.includes(config.API_URL)&&code.includes(config.ANON_KEY)&&!code.includes(config.SERVICE_ROLE_KEY));
    await page.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts[role].email);
    await page.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts[role].password);
    await page.getByRole('button',{name:'Inloggen',exact:true}).click();await page.getByRole('button',{name:'Uitloggen'}).waitFor();
    if(role==='admin'){
     await page.getByRole('button',{name:/Klaar/}).click();await page.getByRole('region',{name:'Systeem / Backupstatus'}).getByText('TEST: nachtbackup overgeslagen').waitFor();
    }else if(role==='a'){
     await page.getByText('Team TEST - Groep A',{exact:true}).waitFor();
     assert.ok((await page.locator('body').innerText()).includes('142'));
     await page.getByRole('button',{name:/📄 Clues/}).click();
     await page.evaluate(()=>{window.open=url=>{window.__drillFile=url;return null;};});
     await page.getByRole('button',{name:'Aanwijzing openen',exact:true}).first().click();
     await page.waitForFunction(()=>Boolean(window.__drillFile));
     const signed=await page.evaluate(()=>window.__drillFile);assert.equal(new URL(signed).origin,config.API_URL);
     const response=await context.request.get(signed);assert.equal(response.status(),200);
     const expected=bundle.files.find(f=>f.path==='recovery/drill.pdf');assert.equal(await hash(await response.body()),expected.sha256);
     await page.getByRole('button',{name:/🕵️ Verdachten/}).click();await page.getByText(/Fictieve herstelnotitie/).first().waitFor();
    }else{await page.getByText('Dossier in het kort',{exact:true}).waitFor();await page.getByText(/Fictieve herstelnotitie/).first().waitFor();}
    assert.deepEqual(errors,[]);roles.push({role,passed:true});
   }finally{await context.close();}
  }
 }finally{await browser.close();}
 report.browser_smoke={roles,duration_ms:performance.now()-started,frontend:base.origin,checked_at:new Date().toISOString()};
 report.browser_smoke_pending=false;report.application_usable_verified=true;
 await fs.writeFile(values.report,JSON.stringify(report,null,2));
 console.log('Restored application smoke passed: admin, participant, suspect, balance, clue file, notes and backup status.');
}
main().catch(()=>{console.error('Restored application smoke failed; report remains pending.');process.exitCode=1;});
