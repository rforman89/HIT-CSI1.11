// Local evidence generator. Run sequentially with the loopback build server active.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright'),local=require('../backend/local.cjs'),large=require('./large-data.cjs');
const fixture=JSON.parse(fs.readFileSync('.local/fixture.json','utf8'));
(async()=>{
 large.seed();const browser=await chromium.launch(),admin=await local.login('admin'),out={};
 try{
  process.env.REACT_APP_SUPABASE_URL=local.config.API_URL;
  const old=execFileSync('git',['show','8ef8bee:src/services/loadAppSnapshot.js'],{encoding:'utf8'}).replace("'../utils/security'",JSON.stringify(pathToFileURL(path.resolve('src/utils/security.js')).href));
  const modules=[['before',await import('data:text/javascript;base64,'+Buffer.from(old).toString('base64'))],['after',await import(pathToFileURL(path.resolve('src/services/loadAppSnapshot.js')).href)]];
  for(const [label,module] of modules){const start=performance.now(),s=await module.loadAppSnapshot(admin,fixture.users.admin,AbortSignal.timeout(30000));out[label]={ms:performance.now()-start,transactions:s.transactions.length,notes:s.suspectNotes.length,clues:s.clues.length};}
  const p=await browser.newPage({viewport:{width:390,height:844}});
  await p.route('**/*',r=>['http://127.0.0.1:3100',local.config.API_URL].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
  await p.goto('http://127.0.0.1:3100');await p.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts.admin.email);await p.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts.admin.password);await p.getByRole('button',{name:'Inloggen',exact:true}).click();await p.getByRole('button',{name:'Uitloggen',exact:true}).waitFor();
  const t=performance.now();await p.getByRole('button',{name:/^💰 Pegels$/}).click();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));out.render={transactionScreenMs:performance.now()-t,domNodes:await p.locator('*').count()};
  out.otherScreens=[];
  for(const name of [/^📄 Clues$/,/Verdachten/]){const button=p.getByRole('button',{name}).first();if(await button.count()){const start=performance.now();await button.click();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));out.otherScreens.push({screen:String(name),ms:performance.now()-start,domNodes:await p.locator('*').count()});}}
  for(const role of ['a','suspect']){
   const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('**/*',r=>['http://127.0.0.1:3100',local.config.API_URL].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
   const started=performance.now();await page.goto('http://127.0.0.1:3100');await page.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts[role].email);await page.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts[role].password);await page.getByRole('button',{name:'Inloggen',exact:true}).click();await page.getByRole('button',{name:'Uitloggen',exact:true}).waitFor();
   const usableMs=performance.now()-started,nav=performance.now();if(role==='a')await page.getByRole('button',{name:/^📄 Clues$/}).click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));out.otherScreens.push({screen:role,usableMs,ms:performance.now()-nav,domNodes:await page.locator('*').count()});await page.close();
  }
  const plans={};
  for(const [name,query] of Object.entries({transactions:`select * from public.credit_transactions where group_id='${fixture.groupA}' order by id limit 250`,notes:`select * from public.suspect_notes where group_id='${fixture.groupA}' order by id limit 250`,audit:'select * from public.operation_audit order by id limit 250'})){
   plans[name]=JSON.parse(local.sql(`BEGIN; SELECT set_config('request.jwt.claims','${JSON.stringify({sub:fixture.users.admin,role:'authenticated'})}',true); SET LOCAL ROLE authenticated; EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${query}; ROLLBACK;`).split('\n').slice(1).join('\n'));
  }
  fs.mkdirSync('.local/performance',{recursive:true});fs.writeFileSync('.local/performance/query-plans-current.json',JSON.stringify(plans,null,2));fs.writeFileSync('.local/performance/large-current.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));
 }finally{await browser.close();await admin.auth.signOut({scope:'local'});large.cleanup();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
