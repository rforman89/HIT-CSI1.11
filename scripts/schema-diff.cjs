// Offline comparison of two read-only schema-catalog.sql captures, never a DB mutation.
const fs = require('node:fs');
function read(file) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const rows = value.rows || (Array.isArray(value) ? value : null);
  const catalog = rows ? JSON.parse(rows[0].catalog) : value;
  // Normalize only transport line endings, never SQL whitespace/privileges/definitions.
  const normalize = x => typeof x === 'string' ? x.replace(/\r\n/g, '\n') : Array.isArray(x) ? x.map(normalize) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, normalize(x[k])])) : x;
  return normalize(catalog);
}
const [expectedFile, actualFile] = process.argv.slice(2);
if (!expectedFile || !actualFile) throw Error('Usage: node scripts/schema-diff.cjs expected.json actual.json');
const expected = read(expectedFile), actual = read(actualFile);
const changes = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort().flatMap(key =>
  JSON.stringify(expected[key]) === JSON.stringify(actual[key]) ? [] : [{ key, kind: !(key in actual) ? 'missing' : !(key in expected) ? 'unexpected' : 'different' }]);
console.log(JSON.stringify({ expectedObjects: Object.keys(expected).length, actualObjects: Object.keys(actual).length, changes }, null, 2));
if (changes.length) process.exitCode = 1;
