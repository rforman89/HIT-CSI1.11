// Supplemental real-browser release proof, while a separately bounded API run is active.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import safety from './safety.cjs';
import {acceptanceBrowsers} from './acceptance-browser.mjs';
const resume=process.argv.includes('--resume');assert.deepEqual(process.argv.slice(2),resume?['--allow-hosted','--resume']:['--allow-hosted']);
const config=JSON.parse(fs.readFileSync('.local/hosted-backend.json'));
const {origin,marker}=safety.validate(config,{target:'hosted',allowHosted:true});
const projects=JSON.parse(execFileSync(process.env.CSI_SUPABASE_CLI||'supabase',['projects','list','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert.equal(projects.find(p=>p.id===safety.TEST||p.ref===safety.TEST)?.status,'ACTIVE_HEALTHY');
const fixture=JSON.parse(fs.readFileSync('.local/hosted-fixture.json'));
for(const role of ['a','jury'])assert(fixture.accounts[role].email.endsWith('@example.test'));
const ok=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const service=createClient(origin,config.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{assert.equal(new URL(typeof input==='string'?input:input.url||input).origin,origin);return fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(10000)});}}});
let browsers;const report={startedAt:new Date().toISOString(),applicationCommit:'453a5e03f1bfa92b8fe29421c7d8c96d6ec3a648',backgroundClients:20,browserClients:2,passed:false};
try{
 assert.equal(ok(await service.from('app_settings').select('value').eq('key','test_environment').single()).value,marker);
 assert.equal(ok(await service.from('app_settings').select('value').eq('key','game_mode').single()).value,'test');
 const metrics=await fetch(origin+'/customer/v1/privileged/metrics',{headers:{authorization:'Basic '+Buffer.from('service_role:'+config.SERVICE_ROLE_KEY).toString('base64')},redirect:'error',signal:AbortSignal.timeout(10000)});assert.equal(metrics.status,200);
 const bindings=(await metrics.text()).split('\n').filter(line=>line.startsWith('realtime_postgres_changes_client_subscriptions{')||line.startsWith('realtime_postgres_changes_client_subscriptions ')).reduce((n,line)=>n+Number(line.slice(line.lastIndexOf(' ')+1)),0);
 assert.equal(bindings,140,'Exactly twenty background API clients with seven bindings each must be verified before opening browsers');
 report.observedBackgroundBindings=bindings;
 const before=ok(await service.from('groups').select('id,credits').in('id',[fixture.groupA,fixture.groupB]));
 let state;
 if(resume){state=JSON.parse(fs.readFileSync('.local/performance/acceptance-browser-release-state.json'));assert(state.clues[2].title.startsWith('PERF browser release '));const pending=ok(await service.from('group_clues').select('status,group_id,clue_id').eq('id',state.assignment.id).single());assert.equal(pending.status,'requested');assert.equal(pending.group_id,fixture.groupA);assert.equal(pending.clue_id,state.clues[2].id);}
 else{const clue={id:randomUUID(),title:'PERF browser release '+randomUUID(),description:'Fictieve browserbewijsproef',price:1,suspect_id:fixture.suspect,is_visible:true,is_active:true,is_free:false,is_global:false};
 ok(await service.from('clues_base').insert(clue));
 const assignment=ok(await service.from('group_clues').insert({group_id:fixture.groupA,clue_id:clue.id,source:'manual',status:'requested'}).select('id').single());state={clues:[null,null,clue],assignment};}
 const {assignment}=state;
 fs.writeFileSync('.local/performance/acceptance-browser-release-state.json',JSON.stringify(state,null,2));
 browsers=await acceptanceBrowsers(config,fixture,state,service);
 await browsers.prepareHotspot();const start=performance.now();await browsers.releaseViaJury();await browsers.hotspot();report.releaseToBothBrowsersMs=performance.now()-start;
 await browsers.check(0);await new Promise(r=>setTimeout(r,5000));await browsers.check(5);
 const row=ok(await service.from('group_clues').select('status,released_at,group_id').eq('id',assignment.id).single());assert.equal(row.status,'released');assert(row.released_at);assert.equal(row.group_id,fixture.groupA);
 const audit=ok(await service.from('operation_audit').select('id').eq('target',assignment.id).eq('action_type','group_clues.update'));assert.equal(audit.length,1);
 const after=ok(await service.from('groups').select('id,credits').in('id',[fixture.groupA,fixture.groupB]));assert.deepEqual(after.sort((a,b)=>a.id.localeCompare(b.id)),before.sort((a,b)=>a.id.localeCompare(b.id)));
 report.integrity={released:true,auditCount:1,balancesUnchanged:true};report.browser=browsers.report;report.passed=true;
}catch(e){report.failure=e.message;process.exitCode=1;}
finally{if(browsers)await browsers.close();service.realtime.disconnect();report.finishedAt=new Date().toISOString();fs.writeFileSync('.local/performance/acceptance-browser-release.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,releaseToBothBrowsersMs:report.releaseToBothBrowsersMs,failure:report.failure}));}
