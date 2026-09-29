const fs=require('node:fs');
const dir='.local/performance',read=file=>JSON.parse(fs.readFileSync(dir+'/'+file,'utf8').replace(/^\uFEFF/,''));
const q=(v,p)=>v.length?[...v].sort((a,b)=>a-b)[Math.min(v.length-1,Math.ceil(p*v.length)-1)]:null;
const stats=s=>({count:s.length,p50:q(s.map(x=>x.ms),.5),p95:q(s.map(x=>x.ms),.95),p99:q(s.map(x=>x.ms),.99),errors:s.filter(x=>!x.ok).length});
const runs=fs.readdirSync(dir).filter(f=>/^hosted-(normal|ramp|writes|large|reconnect|soak|e2e)[a-z0-9-]*\.json$/.test(f)).map(file=>{
 const r=read(file);if(!r.options)return null;
 return {file,startedAt:r.startedAt,options:r.options,passed:r.passed,failure:r.failure,durationSeconds:r.durationSeconds,loadDurationSeconds:r.loadDurationSeconds,reconnect:r.reconnect,summary:r.summary,errors:r.errors,integrity:r.integrity,events:r.events.length,maxChannelsPerClient:Math.max(0,...(r.channelCounts||[]).map(x=>x.channels)),minuteWindows:r.minuteWindows,roles:Object.fromEntries(['a','b','suspect','jury','admin'].map(role=>[role,stats(r.samples.filter(s=>s.phase==='load'&&s.kind==='snapshot'&&s.role===role))])),maxEventsPerSecond:Math.max(0,...Object.values(r.events.reduce((a,e)=>{const k=Math.floor(e.atMs/1000);a[k]=(a[k]||0)+1;return a;},{})))};
}).filter(Boolean).sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
const profiles=fs.readdirSync(dir).filter(f=>/^hosted-[a-z0-9-]+-(normal|4g|slow)\.json$/.test(f)).map(file=>{
 const r=read(file);return {file,network:r.network,metadata:r.metadata,roles:r.roles.map(x=>({role:x.role,usableMs:x.usableMs,navigation:x.navigation,metrics:x.metrics,domNodes:x.profile.domNodes,longTasks:x.profile.longTasks,requests:x.requests.length,backendRequests:x.requests.filter(y=>y.backend).length,decodedBytes:x.requests.reduce((n,y)=>n+y.bytes,0),sockets:x.sockets,errors:x.errors}))};
});
const metrics=fs.existsSync(dir+'/server-metrics.jsonl')?fs.readFileSync(dir+'/server-metrics.jsonl','utf8').trim().split('\n').map(JSON.parse):[];
const optional=file=>fs.existsSync(dir+'/'+file)?read(file):null;
const result={generatedAt:new Date().toISOString(),scope:'Hosted fictitious TEST only; API sessions are not unique users',runs,profiles,serverMetrics:metrics,usageBefore:read('usage-before.json'),usageAfter:optional('usage-after.json'),advisorsAfter:optional('advisors-after-summary.json'),replicationSoak:optional('replication-soak.json'),logsFinal:optional('logs-final.json'),browserSoak:optional('hosted-browser-soak.json'),dataCompleteness:optional('hosted-data-completeness.json'),partialWriteIntegrity:optional('partial-write-integrity.json')};
fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/hosted-measurements.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(runs.map(r=>({file:r.file,passed:r.passed,clients:r.options.clients,p95:r.summary.snapshot?.p95,errors:r.errors.length}))));
