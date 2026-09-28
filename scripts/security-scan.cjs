const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const files=[...new Set([...git('diff','--name-only','352808e1cec7365f2f3fecee2600966c0b3ffba7'),...git('ls-files','--others','--exclude-standard')])];
const findings=[];
for(const file of files){
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
 if(/(^|\/)(\.env(?!\.example)|\.local|node_modules|build|test-results)(\/|$)/.test(file))findings.push({file,reason:'unexpected artifact'});
 const text=fs.readFileSync(file,'utf8');
 if(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sb_secret_|ghp_|github_pat_|sk_live_)[a-zA-Z0-9_-]{16,}/.test(text))findings.push({file,reason:'credential pattern'});
 for(const m of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g))try{if(JSON.parse(Buffer.from(m[0].split('.')[1],'base64url')).role==='service_role')findings.push({file,reason:'service JWT'});}catch{}
}
console.log(JSON.stringify({files:files.length,findings},null,2));if(findings.length)process.exitCode=1;

