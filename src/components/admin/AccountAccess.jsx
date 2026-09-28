import React from 'react';
export default function AccountAccess({ctx}) {
 const {styles,profiles,profile,changeAccountAccess}=ctx;
 return <section style={styles.card}><h2>Rollen en toegang</h2><p>Deelnemers krijgen pas speltoegang met een actieve groepskoppeling. Jury kan dossiers lezen, aanwijzingen vrijgeven en pegels corrigeren.</p>
 {profiles.map(p=><div key={p.id} style={styles.card}><strong>{p.display_name||p.email}</strong>
 <select style={styles.select} aria-label={'Rol van '+(p.display_name||p.email)} value={p.role} disabled={p.id===profile.id} onChange={e=>changeAccountAccess(p.id,{role:e.target.value})}>
 {['participant','suspect','jury','admin'].map(r=><option key={r} value={r}>{r}</option>)}</select>
 <label><input type="checkbox" checked={p.is_active} disabled={p.id===profile.id} onChange={e=>changeAccountAccess(p.id,{is_active:e.target.checked})}/> Account actief</label>
 </div>)}</section>;
}
