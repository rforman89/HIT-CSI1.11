const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {chromium}=require('playwright'),{service,ok,config}=require('../backend/local.cjs');
const f=JSON.parse(fs.readFileSync('.local/fixture.json')),base='http://127.0.0.1:3100';let browser;
before(async()=>{browser=await chromium.launch();});after(async()=>browser?.close());
async function pageFor(t,role){
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),page=await context.newPage(),errors=[];
 await context.addInitScript(()=>{window.cspViolations=[];document.addEventListener('securitypolicyviolation',e=>window.cspViolations.push(e.violatedDirective));});
 await context.route('**/*',r=>[base,config.API_URL].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 t.after(async()=>{assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.cspViolations),[]);await context.close();});
 await page.goto(base);if(role)await login(page,role);
 return page;
}
async function login(p,role){await p.getByPlaceholder('E-mail',{exact:true}).fill(f.accounts[role].email);await p.getByPlaceholder('Wachtwoord',{exact:true}).fill(f.accounts[role].password);await p.getByRole('button',{name:'Inloggen',exact:true}).click();await p.getByRole('button',{name:'Uitloggen',exact:true}).waitFor();}
test('CSP headers present, login loads, no inline script/eval permission',async t=>{
 const p=await pageFor(t);assert.ok(await p.getByRole('button',{name:'Inloggen',exact:true}).isVisible());
 const r=await p.request.get(base),h=r.headers();assert.match(h['content-security-policy'],/frame-ancestors 'none'/);assert.match(h['content-security-policy'],/script-src 'self';/);assert.equal(h['x-content-type-options'],'nosniff');assert.equal(h['referrer-policy'],'no-referrer');
});
for(const role of ['unassigned','inactive'])test(role+' sees explicit access explanation, no dossiers',async t=>{
 const p=await pageFor(t,role);await p.getByRole('heading',{name:'Nog geen speltoegang'}).waitFor();assert.equal(await p.getByText('TEST SECRET B',{exact:true}).count(),0);
});
test('jury browser -> limited credit/release RPC -> real database and signed photos',async t=>{
 const p=await pageFor(t,'jury');await p.getByRole('heading',{name:'CSI HIT Jury',exact:true}).waitFor();
 assert.equal(await p.getByRole('button',{name:/Beheer|Reset|backup/i}).count(),0);
 const before=ok(await service.from('groups').select('credits').eq('id',f.groupB).single()).credits;
 await p.getByLabel('Groep voor pegelcorrectie').selectOption(f.groupB);await p.getByLabel('Aantal pegels').fill('3');await p.getByLabel('Reden pegelcorrectie').fill('Fictieve jurycorrectie');
 await p.getByRole('button',{name:'Pegels verwerken'}).click();await p.getByText('Pegels bijgewerkt.',{exact:true}).waitFor();
 assert.equal(ok(await service.from('groups').select('credits').eq('id',f.groupB).single()).credits,before+3);
 const release=p.getByRole('button',{name:'Vrijgeven',exact:true}).first();if(await release.count()){await release.click();await p.waitForTimeout(500);}
 const photos=p.locator('img[src*="/object/sign/suspect-photos/"]');assert.ok(await photos.count()>0);await photos.first().waitFor();assert.equal(await photos.first().evaluate(i=>i.complete&&i.naturalWidth>0),true);
 await photos.first().click();await p.getByRole('button',{name:'Sluiten',exact:true}).click();
 for(const [width,height]of [[360,800],[390,500],[844,390]]){await p.setViewportSize({width,height});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>scrollTo(0,0));
 await p.screenshot({path:'.local/security-jury.png',fullPage:false});
});
test('admin access controls and CSV download are available with CSP',async t=>{
 const p=await pageFor(t,'admin');await p.getByRole('button',{name:/Beheer/}).first().click();await p.getByRole('heading',{name:'Rollen en toegang'}).waitFor();
 assert.ok(await p.getByLabel('Rol van Security jury').count()>0);
 await p.screenshot({path:'.local/security-admin-access.png',fullPage:true});
 await p.getByRole('button',{name:/Klaar/}).first().click();
 const download=p.waitForEvent('download');
 await p.getByRole('button',{name:'CSV-overzichten downloaden',exact:true}).click();
 const file=await download;assert.match(file.suggestedFilename(),/\.csv$/);
 const contents=fs.readFileSync(await file.path(),'utf8');assert.equal(contents.charCodeAt(0),0xfeff);
 // Complete CSV batch before capturing the separate JSON download.
 await p.waitForTimeout(2600);
 const jsonDownload=p.waitForEvent('download');await p.getByRole('button',{name:'JSON-schermoverzicht downloaden',exact:true}).click();
 const jsonFile=await jsonDownload;const json=fs.readFileSync(await jsonFile.path(),'utf8');
 assert.ok(!json.includes('/object/sign/'));assert.ok(!json.includes('photo_path'));
});
test('logout and account switch erase jury drafts and private modal state',async t=>{
 const p=await pageFor(t,'jury');await p.getByLabel('Reden pegelcorrectie').fill('CONFIDENTIAL UNSAVED DRAFT');
 await p.getByRole('button',{name:'Uitloggen',exact:true}).click();await p.getByRole('button',{name:'Inloggen',exact:true}).waitFor();
 assert.equal(await p.getByPlaceholder('Wachtwoord',{exact:true}).inputValue(),'');
 await login(p,'unassigned');await p.getByRole('heading',{name:'Nog geen speltoegang'}).waitFor();assert.equal(await p.getByText('CONFIDENTIAL UNSAVED DRAFT').count(),0);
 await p.getByRole('button',{name:'Uitloggen',exact:true}).click();await login(p,'jury');assert.equal(await p.getByLabel('Reden pegelcorrectie').inputValue(),'');
});
test('cross-origin framing is blocked by actual browser enforcement',async()=>{
 const server=http.createServer((req,res)=>res.end('<iframe src="'+base+'"></iframe>'));await new Promise(r=>server.listen(3101,'127.0.0.1',r));
 const page=await browser.newPage();const events=[];page.on('console',m=>events.push(m.text()));
 try{await page.goto('http://127.0.0.1:3101');await page.waitForTimeout(600);assert.ok(events.some(e=>/frame-ancestors|X-Frame-Options/i.test(e)));assert.equal(await page.frameLocator('iframe').getByRole('button',{name:'Inloggen',exact:true}).count(),0);}
 finally{await page.close();await new Promise(r=>server.close(r));}
});
test('note content stays escaped in jury dossier; no injected HTML executes',async t=>{
 const text='<img src=x onerror="window.noteXss=true"> TEST XSS';
 const note=ok(await service.from('suspect_notes').insert({group_id:f.groupB,suspect_id:f.securitySuspect,user_id:f.users.b,note:text}).select('id').single());
 try{const p=await pageFor(t,'jury');await p.getByText(text,{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.noteXss),undefined);assert.equal(await p.locator('img[src="x"]').count(),0);}
 finally{ok(await service.from('suspect_notes').delete().eq('id',note.id));}
});
