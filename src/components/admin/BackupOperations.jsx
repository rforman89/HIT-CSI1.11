import React, {useCallback, useEffect, useRef, useState} from 'react';
const labels={healthy:'Backup actueel',grace:'LIVE gestart; eerste backup wordt verwacht',overdue:'Waarschuwing: LIVE-backup loopt achter',failed:'Waarschuwing: backuppoging mislukt',test:'TEST: nachtbackup overgeslagen',unknown:'Spelmodus onbekend'};
export default function BackupOperations({client,styles}) {
 const [health,setHealth]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loadError,setLoadError]=useState('');
 const pending=useRef(null),lock=useRef(false),mounted=useRef(true);
 const refresh=useCallback(async()=>{
  try { const {data,error}=await client.rpc('backup_health');if(error)throw error;if(mounted.current){setHealth(data);setLoadError('');} }
  catch {if(mounted.current)setLoadError('Backupstatus niet bereikbaar. Controleer de verbinding en probeer opnieuw.');}
 },[client]);
 useEffect(()=>{mounted.current=true;refresh();const timer=setInterval(refresh,30000);return()=>{mounted.current=false;clearInterval(timer);};},[refresh]);
 const backup=async()=>{
  if(lock.current)return;
  if(!pending.current&&!window.confirm('Een volledige backup met speldata en bestanden maken?'))return;
  lock.current=true;setBusy(true);setMessage('');pending.current ||= crypto.randomUUID();
  try {
   const {data,error}=await client.functions.invoke('csi-hit-nightly-backup',{body:{request_id:pending.current}});
   if(error)throw error;
   if(data.status==='success'){setMessage('Backup opgeslagen. Download de bundle en bewaar een kopie buiten Supabase.');pending.current=null;}
   else if(data.status==='failed'){setMessage('Backup mislukt. Controleer de status en start daarna een nieuwe poging.');pending.current=null;}
   else setMessage('Backup wordt verwerkt. Controleer de status voordat je opnieuw probeert.');
  } catch {setMessage('Uitkomst nog onbekend. Controleer de status; opnieuw proberen gebruikt dezelfde actie-ID.');}
  finally {lock.current=false;if(mounted.current){setBusy(false);refresh();}}
 };
 const download=async()=>{
  if(lock.current)return;lock.current=true;setBusy(true);
  try {
   const id=health?.last_bundle?.id;
   const {data,error}=await client.functions.invoke('csi-hit-nightly-backup',{body:{action:'download',backup_id:id}});
   if(error||!data?.url)throw Error();
   const response=await fetch(data.url);if(!response.ok)throw Error();
   const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=`csi-hit-backup-${id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage('Bundle gedownload. Bewaar deze vertrouwelijk op een andere opslaglocatie en controleer hem met de hersteltool.');
  } catch {setMessage('Download mislukt. Probeer opnieuw of gebruik de portable CLI.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const latest=health?.last_attempt;
 const date=value=>value?new Date(value).toLocaleString('nl-NL'):'Nog niet beschikbaar';
 return <section style={styles.card} aria-label="Systeem / Backupstatus">
  <h3>Systeem / Backupstatus</h3>
  <p role="status" style={['overdue','failed','unknown'].includes(health?.health)?styles.error:styles.subtle}>{labels[health?.health]||'Backupstatus ophalen…'}</p>
  {loadError&&<p role="alert" style={styles.error}>{loadError}</p>}
  <p>Laatste poging: {date(latest?.started_at)} · {latest?.status||'geen poging'}</p>
  <p>Laatste succesvolle LIVE-backup: {date(health?.last_success?.finished_at)}</p>
  {latest?.id&&<p style={{...styles.subtle,overflowWrap:'anywhere'}}>Backup-ID: {latest.id} · {latest.duration_ms==null?'bezig':`${Math.round(latest.duration_ms/1000)} s`}</p>}
  {latest?.row_counts&&<p style={styles.subtle}>{Object.keys(latest.row_counts).length} datasets · {latest.storage_count??'—'} bestanden</p>}
  {latest?.error_code&&<p style={styles.error}>Fout: {latest.error_code}</p>}
  {latest?.cleanup_warning&&<p style={styles.error}>Opruimen van oude backups mislukt.</p>}
  <p>Laatste gegevensherstelcontrole: {date(health?.last_restore?.verified_at)}</p>
  <p style={styles.subtle}>Controle van login en gebruik na herstel staat afzonderlijk in het herstelrapport.</p>
  <button style={styles.button} disabled={busy} onClick={backup}>{busy?'Bezig…':pending.current?'Backuppoging controleren':'Nu backup maken'}</button>
  <button style={styles.buttonSecondary} disabled={busy||!health?.last_bundle} onClick={download}>Portable backup downloaden</button>
  <button style={styles.buttonSecondary} disabled={busy} onClick={refresh}>Status verversen</button>
  {message&&<p role="status">{message}</p>}
 </section>;
}
