import { storagePath } from '../utils/security.js';
import { readAllRows } from './readAllRows.js';

// RLS remains authoritative. Reuse only this mounted account's state, and recheck
// identity/access/membership on EVERY refresh. A scope change requires a full load.
export async function loadAppSnapshot(client, userId, signal, finalReportsEnabled = false, options = {}) {
  const rows = async query => {
    const {data,error}=await query.abortSignal(signal);
    if(error) throw new Error(error.message || 'Gegevens ophalen mislukt.');
    return data;
  };
  const all = (table, select='*', order, groupId) => readAllRows(first => {
    let query=client.from(table).select(select, first ? {count:'exact'} : undefined);
    return groupId ? query.eq('group_id',groupId) : query;
  },signal,table==='app_settings'?'key':'id').then(data => {
    if(order) data.sort((a,b)=>{
      const direction=['notifications','credit_transactions','suspect_notes'].includes(table)?-1:1;
      return direction*(a[order]==null ? (b[order]==null?0:1) : b[order]==null ? -1 : a[order]<b[order]?-1:a[order]>b[order]?1:0);
    });
    return data;
  });
  const profile=await rows(client.from('profiles').select('*').eq('id',userId).maybeSingle());
  const empty={profile:profile||{id:userId,role:null,is_active:false},access:false,agendaItems:[],suspects:[],clues:[],clueCategories:[],gameMode:'unknown',finalReportsOpen:false,latestBackupInfo:null,groups:[],profiles:[],memberships:[],notifications:[],transactions:[],groupClues:[],suspectNotes:[],suspectStatuses:[],finalReports:[]};
  if(!profile?.is_active) return empty;
  const admin=profile.role==='admin',jury=profile.role==='jury',suspect=profile.role==='suspect';
  let memberships=[],ownGroups=[];
  if(!admin&&!jury&&!suspect) {
    memberships=await rows(client.from('group_members').select('*, groups(*)').eq('user_id',userId));
    ownGroups=memberships.map(m=>m.groups).filter(g=>g?.is_active);
    if(!ownGroups.length) return empty;
  }
  const scope=JSON.stringify([userId,profile.role,profile.suspect_id,ownGroups.map(g=>g.id).sort()]);
  const previous=options.previous?.access&&options.previous._scope===scope?options.previous:null;
  const tables=previous&&options.tables?new Set(options.tables):null;
  const needs=(...names)=>!tables||names.some(n=>tables.has(n));
  const snapshot={...(previous||empty),profile,access:true,_scope:scope};
  const groupId=ownGroups[0]?.id;
  if(!admin&&!jury&&!suspect){snapshot.memberships=memberships;snapshot.groups=ownGroups;}
  const tasks=[];
  const assign=(key,promise)=>tasks.push(promise.then(data=>{snapshot[key]=data;}));
  if(needs('suspects')) assign('suspects',all('suspects','*','sort_order').then(async list=>{
    if(suspect&&!list.some(s=>s.id===profile.suspect_id&&s.is_active)) return null;
    const photos=list.filter(s=>s.photo_url);
    snapshot._photoUrls=Object.create(null);
    if(!photos.length)return list;
    const paths=[...new Set(photos.map(s=>storagePath(s.photo_url,'suspect-photos',process.env.REACT_APP_SUPABASE_URL)))];
    const now=Date.now(),fresh=[];
    for(const path of paths){
      const cached=previous?._photoUrls?.[path];
      if(cached?.refreshAfter>now)snapshot._photoUrls[path]=cached;
      else fresh.push(path);
    }
    if(fresh.length){
      const {data,error}=await client.storage.from('suspect-photos').createSignedUrls(fresh,300);
      if(error||!data||data.some(x=>x.error||!x.signedUrl)) throw new Error('Geen toegang tot de verdachtenfoto. Ververs of neem contact op met de organisatie.');
      // Scoped, in-memory only; renew a minute before expiry. Raw paths stay exportable.
      for(const item of data)snapshot._photoUrls[item.path]={url:item.signedUrl,refreshAfter:now+240000};
    }
    if(paths.some(path=>!snapshot._photoUrls[path]?.url))throw new Error('Onvolledige toegang tot de verdachtenfoto.');
    return list.map(s=>s.photo_url?{...s,photo_path:s.photo_url,photo_url:snapshot._photoUrls[storagePath(s.photo_url,'suspect-photos',process.env.REACT_APP_SUPABASE_URL)].url}:s);
  }));
  if(needs('agenda_items'))assign('agendaItems',all('agenda_items','*','starts_at'));
  if(needs('clues_base','group_clues'))assign('clues',all('clues','*','sort_order'));
  if(needs('clue_categories'))assign('clueCategories',all('clue_categories','*','sort_order'));
  if(needs('app_settings'))tasks.push(all('app_settings','key,value').then(settings=>{
    const map=Object.fromEntries(settings.map(s=>[s.key,s.value]));
    snapshot.gameMode=['live','test'].includes(map.game_mode)?map.game_mode:'unknown';
    snapshot.finalReportsOpen=finalReportsEnabled&&map.final_reports_open==='true';
  }));
  if(admin||jury||suspect){if(needs('groups'))assign('groups',all('groups','*','created_at'));}
  if(admin){if(needs('profiles'))assign('profiles',all('profiles','*','email'));if(needs('group_members'))assign('memberships',all('group_members'));}
  if(!suspect&&!jury&&needs('notifications'))assign('notifications',all('notifications',admin?'*, groups(name)':'*','created_at',groupId));
  if(!suspect&&needs('credit_transactions'))assign('transactions',all('credit_transactions',admin||jury?'*, groups(name)':'*','created_at',groupId));
  if(needs('group_clues','clues_base'))assign('groupClues',all('group_clues',admin||jury||suspect?'*, groups(name)':'*',null,groupId));
  if(needs('suspect_notes'))assign('suspectNotes',all('suspect_notes',admin?'*, groups(name), suspects(name), profiles(display_name,email)':'*, groups(name), suspects(name)','created_at',groupId));
  if(needs('suspect_statuses'))assign('suspectStatuses',all('suspect_statuses','*, groups(name), suspects(name)',null,groupId));
  if(finalReportsEnabled&&!suspect&&needs('final_reports'))assign('finalReports',all('final_reports','*, suspects(name)',null,groupId));
  await Promise.all(tasks);
  if(snapshot.suspects===null)return empty;
  if(needs('clues_base','group_clues','suspects')){
    const suspectsById=new Map(snapshot.suspects.map(s=>[s.id,s]));
    snapshot.clues=snapshot.clues.map(c=>({...c,suspects:suspectsById.get(c.suspect_id)||null}));
    const cluesById=new Map(snapshot.clues.map(c=>[c.id,c]));
    snapshot.groupClues=snapshot.groupClues.map(r=>({...r,clues:cluesById.get(r.clue_id)||null}));
  }
  return snapshot;
}
