const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const assert = require('node:assert/strict');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = walk('build');
assert(files.every(f => !/\.map$|(?:^|[\\/])\.env|[\\/]\.local[\\/]/.test(f)), 'No private artifacts/source maps');
const code = files.filter(f=>/\.(js|css|html|json)$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n');
assert(!code.includes('CSI_SERVER_SECRET_SENTINEL'), 'Secret sentinel leaked');
assert(!code.includes('process.env.REACT_APP_'), 'Unreplaced client environment');
assert(!code.includes('sourceMappingURL='), 'Public source map reference');
for (const match of code.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
  const claims=JSON.parse(Buffer.from(match[0].split('.')[1],'base64url'));
  assert.notEqual(claims.role,'service_role');
}
const metrics=files.map(file=>({path:file.replaceAll('\\','/'),bytes:fs.statSync(file).size,gzip:zlib.gzipSync(fs.readFileSync(file)).length}));
console.log(JSON.stringify({totalBytes:metrics.reduce((a,f)=>a+f.bytes,0),files:metrics},null,2));
