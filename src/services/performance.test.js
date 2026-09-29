import {vi, test, expect} from 'vitest';
import {readAllRows} from './readAllRows';
import {createRefreshQueue} from './refreshQueue';
import {loadAppSnapshot} from './loadAppSnapshot';

function pages(records, cap=1000, failPage=-1) {
  let calls=0;
  const query=first=>{
    let cursor='',limit;
    const q={order:()=>q,limit:n=>{limit=n;return q;},gt:(_,v)=>{cursor=v;return q;},
      abortSignal:async signal=>{if(signal?.aborted)throw Error('aborted');if(calls++===failPage)return {error:{message:'page failed'}};return {data:records.filter(r=>r.id>cursor).slice(0,Math.min(cap,limit)),count:first?records.length:null};}};
    return q;
  };
  return {query,calls:()=>calls};
}
const records=n=>Array.from({length:n},(_,i)=>({id:String(i).padStart(6,'0'),value:i}));
test('all 1500 transactions and 2500 audit rows survive a 1000-row API limit',async()=>{
  for(const n of [1500,2500]){const p=pages(records(n));const result=await readAllRows(p.query);expect(result).toEqual(records(n));expect(new Set(result.map(x=>x.id)).size).toBe(n);}
});
test('a server cap below requested page size cannot silently truncate',async()=>{
  const p=pages(records(251),100);expect(await readAllRows(p.query)).toHaveLength(251);expect(p.calls()).toBe(3);
});
test('a later page failure rejects instead of publishing incomplete data',async()=>{
  const p=pages(records(1500),1000,2);await expect(readAllRows(p.query)).rejects.toThrow('page failed');
});
test('abort stops pagination',async()=>{
  const controller=new AbortController();controller.abort();await expect(readAllRows(pages(records(500)).query,controller.signal)).rejects.toThrow('aborted');
});
test('non-progressing API cursor fails closed',async()=>{
  const query=()=>{const q={order:()=>q,limit:()=>q,gt:()=>q,abortSignal:async()=>({data:[{id:'a'}],count:500})};return q;};
  await expect(readAllRows(query)).rejects.toThrow('Paginering');
});
test('five table events produce one refresh with the union of dirty tables',async()=>{
  vi.useFakeTimers();try{const run=vi.fn();const q=createRefreshQueue(run);for(const t of ['groups','credit_transactions','notifications','groups','notifications'])q.request([t]);await vi.advanceTimersByTimeAsync(300);expect(run).toHaveBeenCalledTimes(1);expect(run.mock.calls[0][0]).toEqual(['groups','credit_transactions','notifications']);q.dispose();}finally{vi.useRealTimers();}
});
test('typing retains dirty events until refresh is safe, without another event',async()=>{
  vi.useFakeTimers();try{let safe=false;const run=vi.fn(),q=createRefreshQueue(run,()=>safe);q.request(['suspect_notes']);await vi.advanceTimersByTimeAsync(1200);expect(run).not.toHaveBeenCalled();safe=true;await vi.advanceTimersByTimeAsync(300);expect(run).toHaveBeenCalledTimes(1);q.dispose();}finally{vi.useRealTimers();}
});
test('events during a running refresh queue one follow-up; cleanup cancels listeners work',async()=>{
  vi.useFakeTimers();try{let finish;const run=vi.fn(()=>new Promise(r=>{finish=r;}));const q=createRefreshQueue(run);q.request(['groups']);await vi.advanceTimersByTimeAsync(300);q.request(['notifications']);q.request(['notifications']);expect(run).toHaveBeenCalledTimes(1);finish();await vi.advanceTimersByTimeAsync(300);expect(run).toHaveBeenCalledTimes(2);q.dispose();finish();await vi.advanceTimersByTimeAsync(1000);expect(run).toHaveBeenCalledTimes(2);}finally{vi.useRealTimers();}
});

function photoClient(sign){
 const state={photo:'fixture/photo.png'};
 const client={storage:{from:()=>({createSignedUrls:sign})},from:table=>{
  let single=false;
  const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:()=>q,maybeSingle:()=>{single=true;return q;},abortSignal:async()=>{
   const data=table==='profiles'&&single?{id:'a',role:'admin',is_active:true}:table==='suspects'?[{id:'s',photo_url:state.photo,is_active:true}]:[];
   return {data,count:Array.isArray(data)?data.length:undefined};
  }};return q;
 }};return {client,state};
}
test('private photo URLs reuse only the same scope/path before expiry, then renew',async()=>{
 let now=100000;const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);
 const sign=vi.fn(async paths=>({data:paths.map(path=>({path,signedUrl:'signed/'+path+'/'+now}))}));
 const {client,state}=photoClient(sign);
 try{
  const first=await loadAppSnapshot(client,'a');
  const reused=await loadAppSnapshot(client,'a',undefined,false,{previous:first});
  expect(sign).toHaveBeenCalledTimes(1);expect(reused.suspects[0].photo_url).toBe(first.suspects[0].photo_url);
  now+=240001;const renewed=await loadAppSnapshot(client,'a',undefined,false,{previous:reused});
  expect(sign).toHaveBeenCalledTimes(2);expect(renewed.suspects[0].photo_url).not.toBe(first.suspects[0].photo_url);
  await loadAppSnapshot(client,'b',undefined,false,{previous:renewed});expect(sign).toHaveBeenCalledTimes(3);
  state.photo='fixture/replacement.png';await loadAppSnapshot(client,'a',undefined,false,{previous:renewed});expect(sign).toHaveBeenCalledTimes(4);
 }finally{clock.mockRestore();}
});
test('an incomplete signed-photo batch fails the snapshot instead of silently losing an image',async()=>{
 const {client}=photoClient(async()=>({data:[]}));await expect(loadAppSnapshot(client,'a')).rejects.toThrow('Onvolledige toegang');
});
