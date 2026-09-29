// Build analysis only; no output overwrite and no instrumentation in the shipped app.
import {build} from 'vite';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
const result=await build({build:{write:false}});
const outputs=(Array.isArray(result)?result:[result]).flatMap(r=>r.output);
const chunks=outputs.filter(x=>x.type==='chunk').map(x=>({file:x.fileName,bytes:Buffer.byteLength(x.code),gzipBytes:gzipSync(x.code).length,modules:Object.entries(x.modules).map(([id,m])=>({module:id.replaceAll('\\','/').replace(process.cwd().replaceAll('\\','/')+'/','').replace(/^.*\/(node_modules|src)\//,'$1/'),renderedLength:m.renderedLength})).sort((a,b)=>b.renderedLength-a.renderedLength)}));
fs.mkdirSync('.local/performance',{recursive:true});fs.writeFileSync('.local/performance/bundle.json',JSON.stringify(chunks,null,2));
const actual=fs.readdirSync('build/assets').filter(f=>/\.(js|css)$/.test(f)).map(file=>{const data=fs.readFileSync('build/assets/'+file);return {file,bytes:data.length,gzipBytes:gzipSync(data).length};});
fs.writeFileSync('.local/performance/bundle-built.json',JSON.stringify(actual,null,2));
console.log(JSON.stringify(chunks.map(c=>({...c,modules:c.modules.slice(0,12)})),null,2));
