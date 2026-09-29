// Fresh control-plane verification before every bounded TEST workload.
const assert=require('node:assert/strict'),{execFileSync,spawn}=require('node:child_process');
const {TEST}=require('./safety.cjs');
const args=process.argv.slice(2);
assert(args.includes('--target=hosted')&&args.includes('--allow-hosted'),'Explicit hosted checkpoint required');
const projects=JSON.parse(execFileSync(process.env.CSI_SUPABASE_CLI||'supabase',['projects','list','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert.equal(projects.find(p=>p.id===TEST||p.ref===TEST)?.status,'ACTIVE_HEALTHY','TEST is not healthy; no load permitted');
console.log('Control plane: TEST ACTIVE_HEALTHY');
const child=spawn(process.execPath,['tests/performance/load.mjs',...args],{stdio:'inherit'});
child.on('error',()=>{process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code===0?0:1;});
