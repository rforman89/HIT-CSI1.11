const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
process.chdir(path.resolve(__dirname,'..'));
const target=process.argv[2];
if (!['local','production'].includes(target)) throw Error('Usage: npm run schema:capture -- local|production (read-only)');
fs.mkdirSync('.local/build-hardening',{recursive:true});
let result;
if(target==='local') result=execFileSync(process.env.CSI_DOCKER||'docker',['exec','-i','supabase_db_csi-hit-reliability','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input:fs.readFileSync('scripts/schema-catalog.sql','utf8'),encoding:'utf8',maxBuffer:16*1024*1024});
else {
 const response=execFileSync(process.env.CSI_SUPABASE_CLI||'supabase',['db','query','--linked','--project-ref','uhfcrskkgutlqqogahbr','--file','scripts/schema-catalog.sql','-o','json'],{encoding:'utf8',maxBuffer:16*1024*1024});
 const parsed=JSON.parse(response); result=(parsed.rows||parsed)[0].catalog;
}
const catalog=JSON.parse(result);
const file='.local/build-hardening/schema-'+target+'.json';
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
console.log(`Read-only ${target} catalog: ${Object.keys(catalog).length} entries written to ${file}`);
