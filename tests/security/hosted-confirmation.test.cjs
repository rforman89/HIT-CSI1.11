const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID}=require('node:crypto');
const {chromium}=require('playwright');
const {service,verify,ok,config}=require('../backend/hosted.cjs');
test('hosted signup confirmation redirects only to TEST Preview and grants no game access',async()=>{
 await verify();
 const preview=JSON.parse(fs.readFileSync('.local/preview.json'));
 assert.equal(preview.branch,'hardening/security-roles-product');
 assert.ok(new URL(preview.url).hostname.endsWith('.vercel.app'));
 const email='confirmation-'+randomUUID()+'@example.test',password=randomUUID()+'Aa9!';
 const link=ok(await service.auth.admin.generateLink({type:'signup',email,password,options:{redirectTo:'https://example.org/untrusted',data:{role:'admin'}}}));
 const action=new URL(link.properties.action_link);
 assert.equal(action.origin,config.API_URL);
 assert.equal(action.searchParams.get('redirect_to'),preview.url);
 const browser=await chromium.launch(),context=await browser.newContext({storageState:'.local/preview-browser-state.json'});
 try{
  await context.route('**/*',r=>[preview.url,config.API_URL].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
  const page=await context.newPage();
  await page.goto(action.href);
  await page.getByRole('button',{name:'Inloggen',exact:true}).waitFor();
  assert.equal(new URL(page.url()).hash,'','unused Auth bearer fragment is removed');
  assert.ok(ok(await service.auth.admin.getUserById(link.user.id)).user.email_confirmed_at);
  await page.getByPlaceholder('E-mail',{exact:true}).fill(email);
  await page.getByPlaceholder('Wachtwoord',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Inloggen',exact:true}).click();
  await page.getByRole('heading',{name:'Nog geen speltoegang'}).waitFor();
  assert.equal(new URL(page.url()).origin,preview.url);
  const profile=ok(await service.from('profiles').select('role').eq('id',link.user.id).single());
  assert.equal(profile.role,'participant');
  await page.getByRole('button',{name:'Uitloggen',exact:true}).click();
  await page.getByRole('button',{name:'Inloggen',exact:true}).waitFor();
 }finally{await context.close();await browser.close();ok(await service.auth.admin.deleteUser(link.user.id));}
});
