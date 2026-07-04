import React from "react";

export default function AdminSetupCheck({ ctx }) {
  const {
    styles,
    profiles,
    memberships,
    groups,
    suspects,
    clues,
    agendaItems,
    gameMode,
    updateGameMode,
    loadDemoData,
    deleteDemoData,
    latestBackupInfo,
    formatDate,
    isBackupRunning,
    createLiveBackup,
    exportCompleteCsvBackup,
    exportFullBackup,
  } = ctx;

  const participantProfiles = profiles.filter((p) => p.role !== "admin");

  const usersWithoutGroup = participantProfiles.filter((p) => {
    return !memberships.some((m) => m.user_id === p.id);
  });

  const activeGroups = groups.filter((group) => group.is_active);
  const inactiveGroups = groups.filter((group) => !group.is_active);

  const activeSuspects = suspects.filter((suspect) => suspect.is_active);
  const inactiveSuspects = suspects.filter((suspect) => !suspect.is_active);

  const visibleClues = clues.filter((clue) => clue.is_visible);
  const hiddenClues = clues.filter((clue) => !clue.is_visible);
  const cluesWithoutFile = clues.filter((clue) => !clue.file_url);

  const visibleAgendaItems = agendaItems.filter((item) => item.is_visible);
  const hiddenAgendaItems = agendaItems.filter((item) => !item.is_visible);

  const setupWarnings = [];

  if (activeGroups.length === 0) {
    setupWarnings.push("Er zijn nog geen actieve groepen.");
  }

  if (usersWithoutGroup.length > 0) {
    setupWarnings.push(
      `${usersWithoutGroup.length} deelnemer(s) zijn nog niet aan een groep gekoppeld.`
    );
  }

  if (activeSuspects.length === 0) {
    setupWarnings.push("Er zijn nog geen actieve verdachten.");
  }

  if (visibleClues.length === 0) {
    setupWarnings.push("Er zijn nog geen zichtbare aanwijzingen.");
  }

  if (cluesWithoutFile.length > 0) {
    setupWarnings.push(
      `${cluesWithoutFile.length} aanwijzing(en) hebben nog geen bestand.`
    );
  }

  if (visibleAgendaItems.length === 0) {
    setupWarnings.push("Er zijn nog geen zichtbare agenda-items.");
  }

  return (
    <div style={styles.card}>
      <h2>Spel klaarzetten</h2>

      <div style={styles.card}>
        <h3>Spelmodus</h3>

        <span
          style={{
            ...styles.badge,
            borderColor: gameMode === "live" ? "#ef4444" : "#22c55e",
          }}
        >
          {gameMode === "live" ? "🔴 LIVE SPEL" : "🧪 TESTMODUS"}
        </span>

        <p style={styles.subtle}>
          In testmodus kun je testdata resetten. In live-modus wordt resetten
          geblokkeerd en is extra voorzichtigheid nodig bij beheeracties.
        </p>

        {gameMode === "test" ? (
          <button
            style={styles.buttonDanger}
            onClick={() => updateGameMode("live")}
          >
            Zet spel live
          </button>
        ) : (
          <button
            style={styles.buttonSecondary}
            onClick={() => updateGameMode("test")}
          >
            Terug naar testmodus
          </button>
        )}
      </div>
      <div style={styles.card}>
        <h3>Demo-data</h3>

        <p style={styles.subtle}>
          Laad een gevulde demo-set met groepen, verdachten, aanwijzingen,
          notities, statussen, meldingen en pegeltransacties. Alleen data met
          prefix <strong>DEMO -</strong> wordt vervangen of verwijderd.
        </p>

        {gameMode === "test" ? (
          <>
            <button style={styles.button} onClick={loadDemoData}>
              Demo-data laden
            </button>

            <button
              style={styles.buttonDanger}
              onClick={() => deleteDemoData()}
            >
              Demo-data verwijderen
            </button>
          </>
        ) : (
          <p style={styles.error}>
            Demo-data is geblokkeerd omdat het spel live staat.
          </p>
        )}
      </div>
      <p style={styles.subtle}>
        Controlepaneel vóór de start: hiermee zie je snel of groepen,
        deelnemers, verdachten, aanwijzingen en agenda klaarstaan.
      </p>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3>Groepen</h3>
          <div style={styles.statNumber}>{groups.length}</div>
          <span style={styles.badge}>Actief: {activeGroups.length}</span>
          <span style={styles.badge}>Inactief: {inactiveGroups.length}</span>
        </div>

        <div style={styles.card}>
          <h3>Deelnemers</h3>
          <div style={styles.statNumber}>{participantProfiles.length}</div>
          <span style={styles.badge}>
            Zonder groep: {usersWithoutGroup.length}
          </span>
        </div>

        <div style={styles.card}>
          <h3>Verdachten</h3>
          <div style={styles.statNumber}>{suspects.length}</div>
          <span style={styles.badge}>Actief: {activeSuspects.length}</span>
          <span style={styles.badge}>Inactief: {inactiveSuspects.length}</span>
        </div>

        <div style={styles.card}>
          <h3>Aanwijzingen</h3>
          <div style={styles.statNumber}>{clues.length}</div>
          <span style={styles.badge}>Zichtbaar: {visibleClues.length}</span>
          <span style={styles.badge}>Verborgen: {hiddenClues.length}</span>
          <span style={styles.badge}>
            Zonder bestand: {cluesWithoutFile.length}
          </span>
        </div>

        <div style={styles.card}>
          <h3>Agenda</h3>
          <div style={styles.statNumber}>{agendaItems.length}</div>
          <span style={styles.badge}>
            Zichtbaar: {visibleAgendaItems.length}
          </span>
          <span style={styles.badge}>
            Verborgen: {hiddenAgendaItems.length}
          </span>
        </div>
      </div>

      <div style={styles.card}>
        <h3>Waarschuwingen</h3>

        {setupWarnings.length === 0 ? (
          <div
            style={{
              ...styles.card,
              borderColor: "#166534",
              background:
                "linear-gradient(180deg, rgba(20,83,45,0.18), #18181b)",
            }}
          >
            <strong>✅ Basis klaar</strong>
            <p style={styles.subtle}>
              De belangrijkste onderdelen staan klaar. Doe vlak voor livegang
              nog wel de speldata-check.
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {setupWarnings.map((warning) => (
              <div
                key={warning}
                style={{
                  ...styles.card,
                  borderColor: "#7f1d1d",
                  background:
                    "linear-gradient(180deg, rgba(69,10,10,0.28), #18181b)",
                }}
              >
                <strong>⚠️ Aandachtspunt</strong>
                <p style={{ marginBottom: 0 }}>{warning}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3>Deelnemers zonder groep</h3>

        {usersWithoutGroup.length === 0 ? (
          <p style={styles.ok}>Alle deelnemers zijn gekoppeld aan een groep.</p>
        ) : (
          usersWithoutGroup.map((p) => (
            <div key={p.id} style={styles.card}>
              <strong>{p.display_name || p.email}</strong>
              <div style={styles.subtle}>{p.email}</div>
              <div style={styles.error}>
                Koppel deze deelnemer vóór de start aan een groep.
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <h3>Aanwijzingen zonder bestand</h3>

        {cluesWithoutFile.length === 0 ? (
          <p style={styles.ok}>Alle aanwijzingen hebben een bestand of link.</p>
        ) : (
          cluesWithoutFile.map((clue) => (
            <div key={clue.id} style={styles.card}>
              <strong>{clue.title}</strong>
              <div style={styles.subtle}>
                {clue.suspects?.name || "Algemeen"}
              </div>
              <div style={styles.error}>
                Geen bestand of link gekoppeld. Controleer vóór livegang.
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <h3>Backup & export</h3>

        <p style={styles.subtle}>
          Nachtbackups draaien alleen wanneer het spel in LIVE-modus staat. In
          testmodus wordt automatische backup bewust overgeslagen, zodat
          testdata geen backup-archief vult.
        </p>

        <div
          style={{
            ...styles.card,
            borderColor: latestBackupInfo ? "#166534" : "#52525b",
            background: latestBackupInfo
              ? "linear-gradient(180deg, rgba(20,83,45,0.14), #18181b)"
              : "#18181b",
          }}
        >
          <strong>Laatste Supabase backup</strong>

          {latestBackupInfo ? (
            <>
              <div style={styles.ok}>
                ✅ {formatDate(latestBackupInfo.created_at)}
              </div>
              <div style={styles.subtle}>
                Pad: {latestBackupInfo.path || "onbekend"}
              </div>
              {latestBackupInfo.source && (
                <span style={styles.badge}>
                  Bron: {latestBackupInfo.source}
                </span>
              )}
              {latestBackupInfo.record_counts && (
                <div style={{ marginTop: 8 }}>
                  {Object.entries(latestBackupInfo.record_counts).map(
                    ([name, count]) => (
                      <span key={name} style={styles.badge}>
                        {name}: {count}
                      </span>
                    )
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={styles.subtle}>
              Nog geen automatische LIVE-backup gevonden. Maak vóór het echte
              spel minimaal één handmatige backup in LIVE-modus.
            </p>
          )}
        </div>

        {gameMode === "live" ? (
          <button
            style={{
              ...styles.button,
              opacity: isBackupRunning ? 0.65 : 1,
              cursor: isBackupRunning ? "not-allowed" : "pointer",
            }}
            onClick={createLiveBackup}
            disabled={isBackupRunning}
          >
            {isBackupRunning
              ? "Backup wordt gemaakt..."
              : "Handmatige LIVE-backup maken"}
          </button>
        ) : (
          <p style={styles.error}>
            Supabase nachtbackup staat uit zolang het spel in testmodus staat.
          </p>
        )}

        <p style={styles.subtle}>
          Lokale export blijft beschikbaar als snelle handmatige noodkopie. Je
          browser downloadt dan meerdere CSV-bestanden achter elkaar.
        </p>

        <button
          style={styles.buttonSecondary}
          onClick={exportCompleteCsvBackup}
        >
          Volledige CSV-backup downloaden
        </button>

        <button style={styles.buttonSecondary} onClick={exportFullBackup}>
          Technische JSON-backup downloaden
        </button>
      </div>
    </div>
  );
}
