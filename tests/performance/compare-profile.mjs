// Sequential, identical fixture/network comparison; never checks out or edits source.
// Run with the loopback static server up and no other tests mutating the local DB.
import {build} from 'vite';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const network=process.argv[2]||'normal';
if(!['normal','4g','slow'].includes(network))throw Error('Unknown network profile');
const originals=new Map(['src/App.jsx','src/components/shared/AppBlocks.jsx','src/components/admin/AdminClues.jsx','src/components/participant/ParticipantClues.jsx','src/services/loadAppSnapshot.js'].map(file=>[path.resolve(file).replaceAll('\\','/'),execFileSync('git',['show','8ef8bee:'+file],{encoding:'utf8'})]));
try{
 await build({plugins:[{name:'local-baseline-source',enforce:'pre',load(id){return originals.get(id.replaceAll('\\','/'))??null;}}]});
 execFileSync(process.execPath,['tests/performance/browser-profile.cjs','matched-before',network],{stdio:'inherit',timeout:360000});
}finally{
 await build(); // Always restore the current branch's local build.
}
execFileSync(process.execPath,['tests/performance/browser-profile.cjs','matched-after',network],{stdio:'inherit',timeout:360000});
