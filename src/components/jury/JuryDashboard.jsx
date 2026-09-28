import React from 'react';
import AdminInterrogationPanel from '../admin/AdminInterrogationPanel';

export default function JuryDashboard({ctx}) {
 const {styles,Header,MessageBlock,ImageModal,groups,groupClues,creditGroup,setCreditGroup,creditAmount,setCreditAmount,creditReason,setCreditReason,changeCredits,pendingCredit,retryCredit,busyAction,releaseGroupClue}=ctx;
 return <div style={styles.app}>
  {Header({title:'CSI HIT Jury',subtitle:'Verhoordossiers, aanwijzingen vrijgeven en pegels corrigeren'})}
  {MessageBlock()}
  <fieldset disabled={Boolean(busyAction)} style={{border:0,padding:0,minWidth:0}}>
   <section style={styles.card}><h2>Pegels corrigeren</h2>
    <label>Groep<select aria-label="Groep voor pegelcorrectie" style={styles.select} value={creditGroup} onChange={e=>setCreditGroup(e.target.value)}><option value="">Kies groep</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name} ({g.credits} pegels)</option>)}</select></label>
    <label>Aantal<input aria-label="Aantal pegels" style={styles.input} type="number" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)}/></label>
    <label>Reden<input aria-label="Reden pegelcorrectie" style={styles.input} value={creditReason} onChange={e=>setCreditReason(e.target.value)}/></label>
    <button style={styles.button} onClick={()=>changeCredits(creditGroup,Number(creditAmount),creditReason)}>Pegels verwerken</button>
    {pendingCredit&&<button style={styles.buttonSecondary} onClick={retryCredit}>Opgeslagen pegelactie controleren</button>}
   </section>
   <section style={styles.card}><h2>Aanwijzingen vrijgeven</h2>
    {groupClues.filter(c=>c.status==='requested').map(c=><div key={c.id} style={styles.card}><strong>{c.groups?.name}: {c.clues?.title}</strong><button style={styles.buttonSecondary} onClick={()=>releaseGroupClue(c.id)}>Vrijgeven</button></div>)}
    {!groupClues.some(c=>c.status==='requested')&&<p>Geen aanwijzingen om vrij te geven.</p>}
   </section>
  </fieldset>
  <AdminInterrogationPanel ctx={ctx}/>
  {ImageModal()}
 </div>;
}
