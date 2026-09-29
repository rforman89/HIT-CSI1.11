// Bounded application workload, not a generic HTTP flood. No Production mode exists.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import safety from './safety.cjs';
import {loadAppSnapshot} from '../../src/services/loadAppSnapshot.js';
import {createRefreshQueue} from '../../src/services/refreshQueue.js';
import {prepareWrites,writeStep,observeHotspot,verifyWrites} from './write-workload.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [key,...v]=x.replace(/^--/,'').split('=');return [key,v.length?v.join('='):true];}));
for(const key of Object.keys(args))assert(['target','profile','clients','seconds','allow-hosted','writes','reconnect','out'].includes(key),'Unknown option');
for(const key of ['allow-hosted','writes','reconnect'])assert(args[key]===undefined||args[key]===true,'Flags do not accept values');
const options={target:args.target,profile:args.profile||'A',clients:Number(args.clients||5),seconds:Number(args.seconds||60),allowHosted:args['allow-hosted']===true,writes:args.writes===true};
const config=JSON.parse(fs.readFileSync(options.target==='hosted'?'.local/hosted-backend.json':'.local/test-backend.json','utf8'));
const {origin,marker}=safety.validate(config,options);
const fixture=JSON.parse(fs.readFileSync(options.target==='hosted'?'.local/hosted-fixture.json':'.local/fixture.json','utf8'));
process.env.REACT_APP_SUPABASE_URL=origin;
const out=args.out||`load-${options.target}-${options.profile}-${options.clients}`;assert(/^[a-zA-Z0-9-]+$/.test(out));
const elapsed=()=>performance.now(),pause=ms=>new Promise(r=>setTimeout(r,ms));
const samples=[],clients=[],events=[],integrity=[],errors=[],pending=new Set();
let stopping=false,started=performance.now(),writeState,phase='setup';
const deadline=new AbortController();
const watchdog=setTimeout(()=>{stopping=true;errors.push({kind:'wall-clock-limit'});deadline.abort();},Math.min(1800,options.seconds+180)*1000);
const report={options,startedAt:new Date().toISOString(),scope:'API sessions + actual Realtime; not browser clients',runtime:{node:process.version},samples,events,integrity,errors};
const fetchChecked=async(input,init={})=>{
 const url=new URL(typeof input==='string'?input:input.url||input);assert.equal(url.origin,origin,'Cross-target fetch refused');
 return fetch(input,{...init,redirect:'error',signal:AbortSignal.any([deadline.signal,AbortSignal.timeout(10000),...(init.signal?[init.signal]:[])])});
};
const service=createClient(origin,config.SERVICE_ROLE_KEY,{global:{fetch:fetchChecked},auth:{persistSession:false,autoRefreshToken:false}});
const check=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const quantile=(values,q)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(q*values.length)-1)]:null;
async function measure(role,kind,fn){const t=elapsed();try{const result=await fn();samples.push({role,kind,phase,atMs:t-started,ms:elapsed()-t,ok:true});return result;}catch(e){samples.push({role,kind,phase,atMs:t-started,ms:elapsed()-t,ok:false});errors.push({role,kind,error:e.name||'Error'});if(kind==='integrity'||samples.filter(s=>!s.ok).length>=3)stopping=true;throw e;}}
async function connect(actor){
 const t=elapsed();actor.channel=actor.client.channel('performance-'+randomUUID());
 for(const table of ['groups','group_clues','notifications','credit_transactions','agenda_items','suspect_notes','suspect_statuses'])actor.channel.on('postgres_changes',{event:'*',schema:'public',table},()=>{events.push({role:actor.role,table,atMs:elapsed()-started});actor.queue.request([table]);});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Realtime join timeout')),10000);actor.channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);errors.push({role:actor.role,kind:'realtime',status});stopping=true;reject(Error('Realtime connection failed'));}});});
 samples.push({role:actor.role,kind:'realtime-join',phase,atMs:t-started,ms:elapsed()-t,ok:true});
}
async function snapshot(actor,tables=null){
 if(stopping)return;if(actor.busy)return actor.busy;
 const task=(async()=>{actor.snapshot=await measure(actor.role,tables?'targeted-refresh':'snapshot',()=>loadAppSnapshot(actor.client,fixture.users[actor.role],AbortSignal.any([deadline.signal,AbortSignal.timeout(30000)]),false,{previous:actor.snapshot,tables}));assert(actor.snapshot.access,'Fixture has no game access');if(!tables)actor.lastFull=elapsed();observeHotspot(writeState,actor,samples);
  const recent=samples.filter(s=>s.kind==='snapshot').slice(-10);if(recent.length===10&&quantile(recent.map(s=>s.ms),.95)>3000){errors.push({kind:'sustained-latency-budget'});stopping=true;}
 })();actor.busy=task;pending.add(task);
 try{return await task;}finally{pending.delete(task);actor.busy=null;}
}
try{
 const mark=check(await service.from('app_settings').select('value').eq('key','test_environment').single());assert.equal(mark.value,marker,'Database marker mismatch');
 for(const role of ['admin','jury','a','b','suspect'])assert(fixture.accounts[role]?.email.endsWith('@example.test'),'Only fictitious fixture accounts permitted');
 if(options.writes){assert.equal(check(await service.from('app_settings').select('value').eq('key','game_mode').single()).value,'test');writeState=await prepareWrites(service,fixture);}
 // All setup checks occur before load, and credentials/bodies never enter reports.
 started=elapsed();
 for(let i=0;i<options.clients;i++){
  if(stopping)throw Error('Stopped during setup');
  const role=i%10===0?'admin':i%10===1?'jury':i%10===2?'suspect':i%2?'a':'b';
  const actor={role,index:i};actor.client=createClient(origin,config.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
   const t=elapsed(),r=await fetchChecked(input,init);const bytes=(await r.clone().arrayBuffer()).byteLength;
   samples.push({role,kind:'request',phase,atMs:t-started,path:new URL(typeof input==='string'?input:input.url||input).pathname.replace(/\/object\/sign\/.*/, '/object/sign/[private]'),ms:elapsed()-t,bytes,status:r.status,ok:r.ok});
   if(r.status>=400){errors.push({role,kind:'http',status:r.status});stopping=true;}
   return r;
  }}});
  clients.push(actor);check(await actor.client.auth.signInWithPassword(fixture.accounts[role]));
  actor.queue=createRefreshQueue(t=>snapshot(actor,t).catch(()=>{}),()=>!stopping&&!actor.busy);
  await snapshot(actor);await connect(actor);await snapshot(actor,['groups','group_clues','notifications','credit_transactions','agenda_items','suspect_notes','suspect_statuses']);await pause(150);
 }
 const loadStarted=elapsed(),end=loadStarted+options.seconds*1000;
 phase='load';report.workloadStartMs=loadStarted-started;report.channelCounts=[];
 const interval={A:10000,B:5000,C:2500,D:1500}[options.profile];
 let reconnected=false;
 await Promise.all(clients.map(async actor=>{
  await pause(actor.index*71);let iteration=0;
  while(!stopping&&elapsed()<end){
   if(actor.reconnecting){await pause(100);continue;}
   try{
    const channels=actor.client.getChannels().length;report.channelCounts.push({client:actor.index,atMs:elapsed()-started,channels});assert.equal(channels,1,'Channel accumulation');
    await snapshot(actor,options.profile==='A'&&elapsed()-actor.lastFull<60000?['app_settings','groups','clues_base','suspects']:null);iteration++;
    if(writeState&&iteration===2)await writeStep(writeState,actor,clients,fixture,measure);
    if(args.reconnect&&!reconnected&&actor.index===0&&elapsed()-loadStarted>options.seconds*500){
     reconnected=true;for(const a of clients){a.reconnecting=true;try{a.queue.clear();await a.client.removeAllChannels();await connect(a);await snapshot(a);assert.equal(a.client.getChannels().length,1);}finally{a.reconnecting=false;}}
    }
   }catch(e){errors.push({role:actor.role,kind:'workload',error:e.name||'Error'});stopping=true;break;}
   await pause(Math.min(interval+actor.index*37,Math.max(0,end-elapsed())));
  }
 }));
 report.loadDurationSeconds=(elapsed()-loadStarted)/1000;
 if(writeState){
  integrity.push(await verifyWrites(writeState,service,clients,fixture));
  assert(quantile(samples.filter(s=>s.kind==='hotspot-convergence').map(s=>s.ms),.95)<=3000,'Hotspot convergence exceeds 3s budget');
 }
 report.passed=!stopping&&errors.length===0;
}catch(e){report.passed=false;report.failure=e.message;process.exitCode=1;}
finally{
 stopping=true;
 for(const a of clients)a.queue?.dispose();
 await Promise.allSettled([...pending]);
 phase='cleanup';
 for(const a of clients){try{await a.client.removeAllChannels();assert.equal(a.client.getChannels().length,0);await a.client.auth.signOut({scope:'local'});}catch(e){errors.push({role:a.role,kind:'cleanup',error:e.name||'Error'});}}
 await service.removeAllChannels();
 clearTimeout(watchdog);report.passed=report.passed===true&&errors.length===0;
 report.durationSeconds=(elapsed()-started)/1000;
 report.summary=Object.fromEntries([...new Set(samples.map(s=>s.kind))].map(kind=>{const x=samples.filter(s=>s.kind===kind);return [kind,{count:x.length,p50:quantile(x.map(s=>s.ms),.5),p95:quantile(x.map(s=>s.ms),.95),p99:quantile(x.map(s=>s.ms),.99),errorRate:x.filter(s=>!s.ok).length/x.length,bytes:x.reduce((n,s)=>n+(s.bytes||0),0),perSecond:x.length/report.durationSeconds}];}));
 report.minuteWindows=Array.from({length:Math.ceil(report.durationSeconds/60)},(_,minute)=>{const x=samples.filter(s=>s.phase==='load'&&Math.floor(s.atMs/60000)===minute);return {minute,requests:x.filter(s=>s.kind==='request').length,requestP95:quantile(x.filter(s=>s.kind==='request').map(s=>s.ms),.95),snapshotP95:quantile(x.filter(s=>s.kind==='snapshot').map(s=>s.ms),.95),errors:x.filter(s=>!s.ok).length};});
 fs.mkdirSync('.local/performance',{recursive:true});fs.writeFileSync(`.local/performance/${out}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,clients:clients.length,summary:report.summary,errors:errors.length,failure:report.failure}));
 if(!report.passed)process.exitCode=1;
}
