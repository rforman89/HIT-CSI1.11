const {spawnSync}=require('node:child_process'),fs=require('node:fs');
if(process.argv.length!==3||process.argv[2]!=='--allow-hosted')throw Error('Hosted checkpoint required; no local stress mode');
for(const clients of [5,10,25,50,75,100]){
 const label='hosted-ramp-'+clients;
 const result=spawnSync(process.execPath,['tests/performance/hosted-stage.cjs','--target=hosted','--allow-hosted','--profile='+ (clients>50?'D':'B'),'--clients='+clients,'--seconds=120','--out='+label],{stdio:'inherit',timeout:330000});
 if(result.status!==0)throw Error('Ramp stopped: workload failed at '+clients);
 const r=JSON.parse(fs.readFileSync('.local/performance/'+label+'.json'));
 if(!r.passed||r.summary.snapshot.p95>3000||r.summary.request.errorRate>0.01)throw Error('Ramp stopped: latency/error budget at '+clients);
}
console.log('Bounded read ramp complete; separate writes, E2E and soak still required.');
