import React from "react";

export default function AdminParticipantPreview({ ctx }) {
  const {
    styles,
    suspects,
    clues,
    agendaItems,
    getAgendaIcon,
    formatDate,
    SuspectImage,
  } = ctx;

  const activeSuspects = suspects.filter((suspect) => suspect.is_active);
  const visibleClues = clues.filter((clue) => clue.is_visible);
  const visibleAgenda = agendaItems
    .filter((item) => item.is_visible)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  const freeOrGlobalClues = visibleClues.filter(
    (clue) => clue.is_free || clue.is_global
  );

  const buyableClues = visibleClues.filter(
    (clue) => !clue.is_free && !clue.is_global
  );

  const previewWarnings = [];

  if (visibleAgenda.length === 0) {
    previewWarnings.push("Deelnemers zien nog geen agenda-items.");
  }

  if (visibleClues.length === 0) {
    previewWarnings.push("Deelnemers zien nog geen aanwijzingen.");
  }

  if (activeSuspects.length === 0) {
    previewWarnings.push("Deelnemers zien nog geen actieve verdachten.");
  }

  return (
    <div style={styles.card}>
      <h2>Deelnemer-preview</h2>
      <p style={styles.subtle}>
        Controleer hier snel wat deelnemers ongeveer zien zonder opnieuw als
        deelnemer in te loggen.
      </p>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3>Agenda zichtbaar</h3>
          <div style={styles.statNumber}>{visibleAgenda.length}</div>
          <div style={styles.subtle}>Zichtbare agenda-items</div>
        </div>

        <div style={styles.card}>
          <h3>Aanwijzingen zichtbaar</h3>
          <div style={styles.statNumber}>{visibleClues.length}</div>
          <span style={styles.badge}>
            Gratis/global: {freeOrGlobalClues.length}
          </span>
          <span style={styles.badge}>Te koop: {buyableClues.length}</span>
        </div>

        <div style={styles.card}>
          <h3>Verdachten zichtbaar</h3>
          <div style={styles.statNumber}>{activeSuspects.length}</div>
          <div style={styles.subtle}>Actieve verdachten</div>
        </div>
      </div>

      <div style={styles.card}>
        <h3>Preview-waarschuwingen</h3>

        {previewWarnings.length === 0 ? (
          <p style={styles.ok}>De deelnemerweergave lijkt gevuld.</p>
        ) : (
          previewWarnings.map((warning) => (
            <div key={warning} style={styles.error}>
              ⚠️ {warning}
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <h3>Agenda zoals deelnemer die ziet</h3>

        {visibleAgenda.length === 0 ? (
          <p style={styles.subtle}>
            Geen zichtbare agenda-items. Deelnemers zien dan nog geen planning.
          </p>
        ) : (
          visibleAgenda.map((item) => (
            <div key={item.id} style={styles.card}>
              <strong>
                {getAgendaIcon(item.item_type)} {item.title}
              </strong>
              <div style={styles.subtle}>
                {formatDate(item.starts_at)}
                {item.ends_at ? ` - ${formatDate(item.ends_at)}` : ""}
              </div>
              {item.description && <div>{item.description}</div>}
              {item.credits_reward > 0 && (
                <span style={styles.badge}>
                  💰 {item.credits_reward} pegels
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <h3>Aanwijzingen zoals deelnemer die ziet</h3>

        {visibleClues.length === 0 ? (
          <p style={styles.subtle}>
            Geen zichtbare aanwijzingen. Deelnemers hebben dan nog niets om te
            openen of kopen.
          </p>
        ) : (
          visibleClues.map((clue) => (
            <div key={clue.id} style={styles.card}>
              <strong>{clue.title}</strong>

              {clue.suspects?.name && (
                <span style={styles.badge}>🕵️ {clue.suspects.name}</span>
              )}

              {clue.is_free && <span style={styles.badge}>Gratis</span>}
              {clue.is_global && (
                <span style={styles.badge}>Voor iedereen</span>
              )}

              {!clue.is_free && !clue.is_global && (
                <span style={styles.badge}>💰 {clue.price} pegels</span>
              )}

              {clue.description && <p>{clue.description}</p>}

              {clue.file_url ? (
                <div style={styles.subtle}>Bestand gekoppeld</div>
              ) : (
                <div style={styles.error}>Geen bestand of link gekoppeld</div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <h3>Verdachten zoals deelnemer die ziet</h3>

        {activeSuspects.length === 0 ? (
          <p style={styles.subtle}>
            Geen actieve verdachten. Deelnemers kunnen dan nog geen dossiers
            bekijken.
          </p>
        ) : (
          activeSuspects.map((suspect) => (
            <div key={suspect.id} style={styles.card}>
              {SuspectImage({
                src: suspect.photo_url,
                alt: suspect.name,
              })}

              <strong>{suspect.name}</strong>

              {suspect.description && (
                <div style={styles.subtle}>{suspect.description}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
