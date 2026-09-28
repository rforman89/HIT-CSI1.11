import {safeCsvValue,buildCsvContent,snapshotJson,storagePath,validateUpload} from './security';
test('JSON exports original paths, never temporary signed photo URLs, including nested joins',()=>{
 const photo={photo_url:'https://backend/object/sign/token',photo_path:'photos/private.png'};
 const out=JSON.parse(snapshotJson({suspects:[photo],clues:[{suspects:photo}]}));
 expect(out.suspects[0]).toEqual({photo_url:'photos/private.png'});expect(out.clues[0].suspects).toEqual(out.suspects[0]);expect(photo.photo_url).toContain('/sign/');
});
test.each(['=1+1','+SUM(A1)','-1+2','@SUM(A1)',' =1','\t=1','\r=1','\n@x','\uFEFF=1','\u0000=1','\u200b=1'])('CSV neutralizes formula %p',value=>expect(safeCsvValue(value)).toBe('"\''+value+'"'));
test('CSV preserves quoting, separators, embedded lines, unicode and BOM',()=>expect(buildCsvContent(['a'],[{a:'é;"x"\ny'}])).toBe('\ufeff"a"\r\n"é;""x""\ny"'));
test('CSV numbers and null remain valid cells',()=>{expect(safeCsvValue(null)).toBe('""');expect(safeCsvValue(42)).toBe('"42"');expect(safeCsvValue(-2)).toBe('"\'-2"');});
const endpoint='https://ksnagauoufsriwplvvtd.supabase.co';
test('legacy same-origin photo URL becomes raw object path',()=>expect(storagePath(endpoint+'/storage/v1/object/public/suspect-photos/f/a.png','suspect-photos',endpoint)).toBe('f/a.png'));
test.each(['../x','/x','x/../a','x\\a','javascript:alert(1)','https://evil.example/a','x/%2e%2e/a','x?a=b'])('rejects unsafe storage source %p',path=>expect(()=>storagePath(path,'suspect-photos',endpoint)).toThrow());
test('upload enforces type and size before network call',()=>{expect(()=>validateUpload('suspect-photos',{type:'image/svg+xml',size:10})).toThrow();expect(()=>validateUpload('suspect-photos',{type:'image/png',size:11*1024*1024})).toThrow();expect(()=>validateUpload('clue-files',{type:'application/pdf',size:100})).not.toThrow();});
