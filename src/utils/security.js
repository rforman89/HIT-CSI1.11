// CSV cells remain quoted after formula neutralization, including leading controls/space.
export function safeCsvValue(value) {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (/^[\s\u0000-\u001f\u007f\u200b-\u200f\ufeff]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function buildCsvContent(headers, rows) {
  return '\ufeff' + [headers.map(safeCsvValue).join(';'), ...rows.map(row => headers.map(h => safeCsvValue(row[h])).join(';'))].join('\r\n');
}
export function snapshotJson(value) {
  return JSON.stringify(value, function(key, item) {
    if (key === 'photo_path') return undefined;
    if (key === 'photo_url' && this.photo_path) return this.photo_path;
    return item;
  }, 2);
}
export function storagePath(value, bucket, endpoint) {
  if (!value) return '';
  let path = String(value);
  if (/^https?:/i.test(path)) {
    const url = new URL(path);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (url.origin !== new URL(endpoint).origin || !url.pathname.startsWith(prefix) || url.search || url.hash) throw new Error('Gebruik een bestand uit de eigen beveiligde opslag.');
    path = decodeURIComponent(url.pathname.slice(prefix.length));
  }
  if (!path || path.startsWith('/') || /[\\?#:\u0000-\u001f]/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..') || /%2e|%2f|%5c/i.test(path)) throw new Error('Ongeldig bestandspad.');
  return path;
}
export function validateUpload(bucket, file) {
  const photos = ['image/jpeg', 'image/png', 'image/webp'];
  const types = bucket === 'suspect-photos' ? photos : [...photos, 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!['suspect-photos','clue-files'].includes(bucket) || !types.includes(file.type)) throw new Error('Dit bestandstype is niet toegestaan.');
  if (file.size <= 0 || file.size > (bucket === 'suspect-photos' ? 10 : 25) * 1024 * 1024) throw new Error('Het bestand is leeg of te groot.');
}
