const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const {config,service,ok,sql}=require('../backend/local.cjs');
const fixture=JSON.parse(fs.readFileSync('.local/fixture.json','utf8'));
let browser;const pause=ms=>new Promise(r=>setTimeout(r,ms));
before(async()=>{browser=await chromium.launch();});after(async()=>{await browser?.close();});
async function screen(t){
 const c=await browser.newContext({viewport:{width:390,height:844}});t.after(()=>c.close());
 await c.route('**/*',r=>{assert(['http://127.0.0.1:3100',config.API_URL].includes(new URL(r.request().url()).origin));return r.continue();});
 const p=await c.newPage();await p.goto('http://127.0.0.1:3100');return {p,c};
}
async function login(p,role='a'){await p.getByPlaceholder('E-mail',{exact:true}).fill(fixture.accounts[role].email);await p.getByPlaceholder('Wachtwoord',{exact:true}).fill(fixture.accounts[role].password);await p.getByRole('button',{name:'Inloggen',exact:true}).click();await p.getByRole('button',{name:'Uitloggen',exact:true}).waitFor();}
test('LOCAL repeated account changes remove channels and blur alone causes no reload',async t=>{
 const {p}=await screen(t);let joins=0,leaves=0;const requests=[];
 p.on('websocket',ws=>ws.on('framesent',f=>{const s=String(f.payload);if(s.includes('phx_join'))joins++;if(s.includes('phx_leave'))leaves++;}));
 p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/rest/'))requests.push(r);});
 for(let i=0;i<5;i++){await login(p,i%2?'b':'a');await pause(600);assert.equal(joins-leaves,1);await p.getByRole('button',{name:'Uitloggen',exact:true}).click();await p.getByRole('button',{name:'Inloggen',exact:true}).waitFor();await pause(100);assert.equal(joins-leaves,0);}
 await login(p,'jury');await pause(800);requests.length=0;
 await p.getByRole('spinbutton',{name:'Aantal pegels'}).focus();await p.getByRole('textbox',{name:'Reden pegelcorrectie'}).focus();await p.locator('h2').first().click();await pause(800);
 assert.equal(requests.length,0,'Unchanged form navigation must not fetch the full app');
});
test('LOCAL burst of five group events converges with a coalesced targeted refresh',async t=>{
 const {p}=await screen(t);await login(p);await pause(1000);
 const old=ok(await service.from('groups').select('credits').eq('id',fixture.groupA).single()).credits;
 let reads=0;p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/rest/'))reads++;});
 try{
  sql(`BEGIN; UPDATE public.groups SET credits=credits+1 WHERE id='${fixture.groupA}'; UPDATE public.groups SET credits=credits+1 WHERE id='${fixture.groupA}'; UPDATE public.groups SET credits=credits+1 WHERE id='${fixture.groupA}'; UPDATE public.groups SET credits=credits+1 WHERE id='${fixture.groupA}'; UPDATE public.groups SET credits=credits+1 WHERE id='${fixture.groupA}'; COMMIT;`);
  await p.getByText(`💰 ${old+5} pegels`,{exact:false}).first().waitFor({timeout:8000});
  await pause(500);assert(reads<=6,`Five events produced ${reads} reads`);
 }finally{ok(await service.from('groups').update({credits:old}).eq('id',fixture.groupA));}
});
test('LOCAL offline/reconnect retains data and restores a bounded number of requests',async t=>{
 const {p,c}=await screen(t);await login(p);await pause(800);let reads=0;
 p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/rest/'))reads++;});
 await c.setOffline(true);await pause(300);await c.setOffline(false);
 await p.getByText('Geen verbinding.',{exact:false}).waitFor({state:'hidden',timeout:15000});
 await pause(1000);assert(reads<40,`Reconnect request burst ${reads}`);assert(await p.getByRole('button',{name:'Uitloggen',exact:true}).isVisible());
});

test('LOCAL large transaction and admin clue lists show 50 rows initially and more on demand',async t=>{
 const large=require('./large-data.cjs');large.seed();
 try{
  const {p,c}=await screen(t);await login(p,'admin');await p.getByRole('button',{name:/^💰 Pegels$/}).click();
  const more=p.getByRole('button',{name:/Meer pegelgeschiedenis tonen \(50 van/});await more.waitFor();
  assert(await p.locator('*').count()<1500,'Initial list must remain bounded despite >1500 transactions');
  await more.click();await p.getByRole('button',{name:/Meer pegelgeschiedenis tonen \(100 van/}).waitFor();
  await p.getByRole('button',{name:/^📄 Aanwijzingen$/}).click();
  const cluesMore=p.getByRole('button',{name:/Meer aanwijzingen tonen \(50 van/}).first();await cluesMore.waitFor();
  assert(await p.locator('*').count()<3000,'Admin clue cards must remain bounded despite >1100 clues');
  await cluesMore.click();await p.getByRole('button',{name:/Meer aanwijzingen tonen \(100 van/}).first().waitFor();
  await p.getByRole('button',{name:'Uitloggen',exact:true}).click();await p.getByRole('button',{name:'Inloggen',exact:true}).waitFor();await login(p,'a');
  await p.getByRole('button',{name:/^📄 Aanwijzingen$/}).click();
  const ownMore=p.getByRole('button',{name:/Meer aanwijzingen tonen \(50 van/}).first();await ownMore.waitFor();
  assert(await p.locator('*').count()<2000,'Participant clue lists must remain bounded while totals stay complete');
  await ownMore.click();await p.getByRole('button',{name:/Meer aanwijzingen tonen \(100 van/}).first().waitFor();
  await c.close();
 }finally{large.cleanup();}
});

test('LOCAL a focused participant draft does not indefinitely suppress balance/access polling',async t=>{
 const {p}=await screen(t);await login(p,'a');await pause(800);
 await p.getByRole('button',{name:/^🕵️ Verdachten$/}).click();
 await p.locator('select').filter({has:p.locator(`option[value="${fixture.suspect}"]`)}).first().selectOption(fixture.suspect);
 await p.getByRole('button',{name:'Notitie toevoegen',exact:true}).click();
 const draft=p.locator('textarea').last();await draft.fill('Niet opslaan: fictief concept');
 const old=ok(await service.from('groups').select('credits').eq('id',fixture.groupA).single()).credits;
 try{
  ok(await service.from('groups').update({credits:old+1}).eq('id',fixture.groupA));
  await p.getByText(`💰 ${old+1}`,{exact:true}).waitFor({timeout:15000});
  assert.equal(await draft.inputValue(),'Niet opslaan: fictief concept');assert(await draft.evaluate(e=>document.activeElement===e));
 }finally{ok(await service.from('groups').update({credits:old}).eq('id',fixture.groupA));}
});
