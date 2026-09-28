import { storagePath } from '../utils/security';

// RLS decides authorization. Commit a complete snapshot only for its current session.
export async function loadAppSnapshot(client, userId, signal, finalReportsEnabled = false) {
  const rows = async query => {
    const {data,error}=await query.abortSignal(signal);
    if(error) throw new Error(error.message || 'Gegevens ophalen mislukt.');
    return data;
  };
  const profile=await rows(client.from('profiles').select('*').eq('id',userId).maybeSingle());
  const snapshot={profile:profile||{id:userId,role:null,is_active:false},access:false,agendaItems:[],suspects:[],clues:[],clueCategories:[],gameMode:'unknown',finalReportsOpen:false,latestBackupInfo:null,groups:[],profiles:[],memberships:[],notifications:[],transactions:[],groupClues:[],suspectNotes:[],suspectStatuses:[],finalReports:[]};
  if(!profile?.is_active) return snapshot;
  const admin=profile.role==='admin',jury=profile.role==='jury',suspect=profile.role==='suspect';
  if(!admin&&!jury&&!suspect) {
    snapshot.memberships=await rows(client.from('group_members').select('*, groups(*)').eq('user_id',userId));
    snapshot.groups=snapshot.memberships.map(m=>m.groups).filter(g=>g?.is_active);
    if(!snapshot.groups.length) return snapshot;
  }
  const query=(table,select='*',order)=>{
    let q=client.from(table).select(select);
    return order?q.order(order,{ascending:!['notifications','credit_transactions','suspect_notes'].includes(table)}):q;
  };
  const suspects=await rows(query('suspects','*','sort_order'));
  if(suspect&&!suspects.some(s=>s.id===profile.suspect_id&&s.is_active)) return snapshot;
  snapshot.access=true;
  const [agendaItems,clues,clueCategories,settings]=await Promise.all([
    rows(query('agenda_items','*','starts_at')),rows(query('clues','*','sort_order')),
    rows(query('clue_categories','*','sort_order')),rows(client.from('app_settings').select('key,value'))
  ]);
  // Never save/export expiring signed URLs as the original photo path.
  snapshot.suspects=await Promise.all(suspects.map(async s=>{
    if(!s.photo_url) return s;
    const path=storagePath(s.photo_url,'suspect-photos',process.env.REACT_APP_SUPABASE_URL);
    const {data,error}=await client.storage.from('suspect-photos').createSignedUrl(path,300);
    if(error) throw new Error('Geen toegang tot de verdachtenfoto. Ververs of neem contact op met de organisatie.');
    return {...s,photo_path:s.photo_url,photo_url:data.signedUrl};
  }));
  const settingsMap=Object.fromEntries(settings.map(s=>[s.key,s.value]));
  Object.assign(snapshot,{agendaItems,clueCategories,gameMode:['live','test'].includes(settingsMap.game_mode)?settingsMap.game_mode:'unknown',finalReportsOpen:finalReportsEnabled&&settingsMap.final_reports_open==='true'});
  snapshot.clues=clues.map(c=>({...c,suspects:snapshot.suspects.find(s=>s.id===c.suspect_id)||null}));
  const groupId=snapshot.groups[0]?.id;
  const scoped=(table,select='*',order)=>{let q=query(table,select,order);return rows(groupId?q.eq('group_id',groupId):q);};
  const [groups,profiles,memberships,notifications,transactions,groupClues,notes,statuses,finalReports]=await Promise.all([
    admin||jury||suspect?rows(query('groups','*','created_at')):snapshot.groups,
    admin?rows(query('profiles','*','email')):[],admin?rows(query('group_members')):snapshot.memberships,
    !suspect&&!jury?scoped('notifications',admin?'*, groups(name)':'*','created_at'):[],
    !suspect?scoped('credit_transactions',admin||jury?'*, groups(name)':'*','created_at'):[],
    scoped('group_clues',admin||jury||suspect?'*, groups(name)':'*'),
    scoped('suspect_notes',admin?'*, groups(name), suspects(name), profiles(display_name,email)':'*, groups(name), suspects(name)','created_at'),
    scoped('suspect_statuses','*, groups(name), suspects(name)'),
    finalReportsEnabled&&!suspect?scoped('final_reports','*, suspects(name)'):[]
  ]);
  return {...snapshot,groups,profiles,memberships,notifications,transactions,groupClues:groupClues.map(r=>({...r,clues:snapshot.clues.find(c=>c.id===r.clue_id)||null})),suspectNotes:notes,suspectStatuses:statuses,finalReports};
}
