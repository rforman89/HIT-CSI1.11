import test, {before,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import local from '../backend/target.cjs';
import {createHandler} from '../../supabase/functions/_shared/handler.mjs';
import {validateBundle} from '../../supabase/functions/_shared/backup.mjs';
before(local.verify);beforeEach(local.verify);
const fixture=JSON.parse(await fs.readFile(local.fixtureFile,'utf8'));
const preview=local.hosted?JSON.parse(await fs.readFile('.local/preview.json','utf8')):null;
const base=preview?.url||'http://127.0.0.1:3100';
if(preview&&(preview.branch!=='hardening/backup-restore-operations'||new URL(base).protocol!=='https:'||!new URL(base).hostname.endsWith('.vercel.app')))throw Error('verified_preview_required');
const storageState=local.hosted?'.local/preview-browser-state.json':undefined;
const targetRef=local.hosted?'ksnagauoufsriwplvvtd':'csi-hit-reliability';
const env={SUPABASE_URL:local.config.API_URL,SUPABASE_ANON_KEY:local.config.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:local.config.SERVICE_ROLE_KEY};
const handler=createHandler(createClient,key=>env[key]);
test('admin browser -> actual handler -> database/storage -> portable download',async()=>{
 local.sql("UPDATE public.clues_base SET file_url=null,pdf_url=null; UPDATE public.suspects SET photo_url=null; UPDATE public.app_settings SET value='test' WHERE key='game_mode';");
 const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,storageState});
 const errors=[];let calls=0;
 try {
  await context.route('**/*',route=>{const origin=new URL(route.request().url()).origin;return [new URL(base).origin,local.config.API_URL].includes(origin)?route.continue():route.abort();});
  // LOCAL edge_runtime is disabled. Only transport is adapted; production handler and real DB/Storage execute unchanged.
  if(!local.hosted)await context.route('**/functions/v1/csi-hit-nightly-backup',async route=>{
   calls++;const req=route.request();const res=await handler(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()}));
   await route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:await res.text()});
  });
  const page=await context.newPage();if(local.hosted)page.on('request',r=>{if(r.url().endsWith('/functions/v1/csi-hit-nightly-backup')&&r.method()==='POST')calls++;});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts.admin.email);
  await page.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts.admin.password);
  await page.getByRole('button',{name:'Inloggen',exact:true}).click();
  await page.getByRole('button',{name:/Klaar/}).click();
  const panel=page.getByRole('region',{name:'Systeem / Backupstatus'});
  await panel.getByText('TEST: nachtbackup overgeslagen').waitFor();
  page.on('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'Nu backup maken'}).evaluate(b=>{b.click();b.click();});
  await panel.getByText('Backup opgeslagen.',{exact:false}).waitFor({timeout:30000});
  assert.equal(calls,1);
  const downloadPromise=page.waitForEvent('download');
  await panel.getByRole('button',{name:'Portable backup downloaden'}).click();
  const download=await downloadPromise;const data=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  await validateBundle(data);assert.equal(data.manifest.project_ref,targetRef);
  await panel.screenshot({path:'.local/operations-admin.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
 } finally {await context.close();await browser.close();}
});
test('frontend error records only category, screen and release on actual backend',async()=>{
 local.sql('DELETE FROM public.client_diagnostics');
 const browser=await chromium.launch();try{
  const page=await browser.newPage({storageState});
  await page.route('**/*',r=>[new URL(base).origin,local.config.API_URL].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
  await page.goto(base);
  await page.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts.a.email);
  await page.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts.a.password);
  await page.getByRole('button',{name:'Inloggen',exact:true}).click();await page.getByRole('button',{name:'Uitloggen'}).waitFor();
  const response=page.waitForResponse(r=>r.url().includes('/rpc/record_client_diagnostic'));
  await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{message:'secret-note-do-not-export',error:Error('token=not-a-real-secret')})));
  assert.equal((await response).status(),204);
  const rows=local.ok(await local.service.from('client_diagnostics').select('*'));assert.equal(rows.length,1);assert.equal(rows[0].screen,'participant');
  assert.ok(!JSON.stringify(rows).includes('secret-note'));assert.equal(await page.getByRole('region',{name:'Systeem / Backupstatus'}).count(),0);
 } finally{await browser.close();}
});
