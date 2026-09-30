import React from 'react';
import AdminInterrogationPanel from '../admin/AdminInterrogationPanel';
import DashboardCard from '../shared/DashboardCard';

export default function JuryDashboard({ctx}) {
 const {styles,Header,MessageBlock,ImageModal,groups,suspects,groupClues,creditGroup,setCreditGroup,creditAmount,setCreditAmount,creditReason,setCreditReason,changeCredits,pendingCredit,retryCredit,busyAction,releaseGroupClue}=ctx;
 const pending=groupClues.filter(c=>c.status==='requested');
 const selectedGroup=groups.find(g=>g.id===creditGroup);
 const jump=id=>{const element=document.getElementById(id);element?.scrollIntoView({block:'start'});element?.focus({preventScroll:true});};
 return <div style={styles.app}>
  <div style={styles.shell}>
  {Header({title:'CSI HIT Jury',subtitle:'Dossiers bekijken, aanwijzingen vrijgeven en pegels corrigeren'})}
  {MessageBlock()}
  <section id="jury-overzicht" tabIndex={-1} style={{scrollMarginTop:12}}>
   <h2>Juryoverzicht</h2><p style={styles.subtle}>Open een kaart. Controleer bij elke actie de groep en de verdachte.</p>
   <div style={styles.grid}>
    <DashboardCard style={styles.card} onClick={()=>jump('jury-dossiers')} aria-label="Verhoordossiers openen"><strong>Verhoordossiers</strong><p>{suspects.length} dossiers bekijken</p></DashboardCard>
    <DashboardCard style={styles.card} onClick={()=>jump('jury-vrijgave')} aria-label="Wachtende aanwijzingen openen"><strong>Aanwijzingen vrijgeven</strong><p>{pending.length ? `${pending.length} wachtend op vrijgave` : 'Geen wachtende aanvragen'}</p></DashboardCard>
    <DashboardCard style={styles.card} onClick={()=>jump('jury-pegels')} aria-label="Pegelcorrectie openen"><strong>Pegels corrigeren</strong><p>Kies een groep en vermeld de reden.</p></DashboardCard>
   </div>
  </section>
  <fieldset disabled={Boolean(busyAction)} style={{border:0,padding:0,minWidth:0}}>
   <section id="jury-pegels" tabIndex={-1} style={{...styles.card,scrollMarginTop:12}}><h2>Pegels corrigeren</h2>
    <form onSubmit={e=>{e.preventDefault();changeCredits(creditGroup,Number(creditAmount),creditReason);}}>
    <label>Groep<select aria-label="Groep voor pegelcorrectie" style={styles.select} value={creditGroup} onChange={e=>setCreditGroup(e.target.value)}><option value="">Kies groep</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name} ({g.credits} pegels)</option>)}</select></label>
    <label>Aantal pegels<input aria-label="Aantal pegels" style={styles.input} type="number" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)}/></label>
    <p style={styles.subtle}>Positief = erbij, negatief = eraf.</p>
    <label>Reden<input aria-label="Reden pegelcorrectie" style={styles.input} placeholder="Bijvoorbeeld: opdracht voltooid" value={creditReason} onChange={e=>setCreditReason(e.target.value)}/></label>
    {selectedGroup && Number.isFinite(Number(creditAmount)) && <p role="status">{selectedGroup.name}: {selectedGroup.credits} → {Number(selectedGroup.credits)+Number(creditAmount)} pegels</p>}
    <button type="submit" style={styles.button}>Pegels verwerken</button>
    {pendingCredit&&<button type="button" style={styles.buttonSecondary} onClick={retryCredit}>Opgeslagen pegelactie controleren</button>}
    </form>
   </section>
   <section id="jury-vrijgave" tabIndex={-1} style={{...styles.card,scrollMarginTop:12}}><h2>Aanwijzingen vrijgeven</h2>
    {pending.map(c=><div key={c.id} style={styles.card}><strong>{c.groups?.name}: {c.clues?.title}</strong><p style={styles.subtle}>{c.clues?.suspects?.name || 'Algemene aanwijzing'}</p><button style={{...styles.buttonSecondary,minHeight:44}} onClick={()=>releaseGroupClue(c.id)}>Vrijgeven</button></div>)}
    {!pending.length&&<p>Geen aanwijzingen om vrij te geven. Nieuwe aanvragen verschijnen hier vanzelf.</p>}
   </section>
  </fieldset>
  <section id="jury-dossiers" tabIndex={-1} style={{scrollMarginTop:12}}><AdminInterrogationPanel ctx={ctx}/></section>
  {ImageModal()}
  </div>
  <nav aria-label="Jurynavigatie" style={styles.mobileNav}>
   {[["jury-overzicht","Overzicht"],["jury-dossiers","Dossiers"],["jury-vrijgave","Vrijgeven"],["jury-pegels","Pegels"]].map(([id,label])=><button key={id} style={{...styles.navButton(false),minHeight:48}} onClick={()=>jump(id)}>{label}</button>)}
  </nav>
 </div>;
}
