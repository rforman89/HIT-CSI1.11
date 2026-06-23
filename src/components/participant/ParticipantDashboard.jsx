import React from "react";

export default function ParticipantDashboardPanel({ ctx }) {
  const {
    ENABLE_FINAL_REPORTS,
    styles,
    formatDate,
    getAgendaIcon,
    getParticipantProgress,
    setActiveParticipantTab,
    myGroup,
    suspects,
    notifications,
    groupClues,
    clues,
    suspectStatuses,
    nextAgendaItem,
    finalReportsOpen,
  } = ctx;

  const progress = getParticipantProgress();
  const activeSuspects = suspects.filter((suspect) => suspect.is_active);
  const latestNotification = notifications[0];
  const latestPurchase = groupClues
    .map((purchase) => ({
      purchase,
      clue:
        purchase.clues || clues.find((clue) => clue.id === purchase.clue_id),
    }))
    .filter((item) => item.clue)
    .sort(
      (a, b) =>
        new Date(b.purchase.purchased_at || b.purchase.created_at || 0) -
        new Date(a.purchase.purchased_at || a.purchase.created_at || 0)
    )[0];

  const suspectStatusCount = suspectStatuses.filter(
    (status) => status.status === "suspect"
  ).length;

  const focusItems = [];

  if (progress.buyableCount > 0) {
    focusItems.push({
      label: "Koop gericht aanwijzingen",
      text: `${progress.buyableCount} aanwijzing(en) staan nog klaar om te onderzoeken.`,
      tab: "clues",
      button: "Naar aanwijzingen",
    });
  }

  if (
    progress.statusCount < activeSuspects.length &&
    activeSuspects.length > 0
  ) {
    focusItems.push({
      label: "Werk verdachte-statussen bij",
      text: "Zet per verdachte alvast op verdacht, twijfel, uitgesloten of onbekend.",
      tab: "suspects",
      button: "Naar verdachten",
    });
  }

  if (progress.noteCount === 0 && activeSuspects.length > 0) {
    focusItems.push({
      label: "Leg jullie eerste theorie vast",
      text: "Schrijf korte notities bij verdachten, zodat jullie later niets kwijt zijn.",
      tab: "suspects",
      button: "Notitie maken",
    });
  }

  if (latestNotification) {
    focusItems.push({
      label: "Check de laatste info",
      text: latestNotification.title,
      tab: "messages",
      button: "Info openen",
    });
  }

  const visibleFocusItems = focusItems.slice(0, 3);

  return (
    <>
      <div
        style={{
          ...styles.card,
          background:
            "linear-gradient(135deg, rgba(153,27,27,0.22), rgba(24,24,27,0.98) 52%, rgba(9,9,11,0.98))",
          borderColor: "#52525b",
          padding: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <span
              style={{
                ...styles.badge,
                borderColor: "#ef4444",
                color: "#fecaca",
                background: "rgba(69,10,10,0.6)",
              }}
            >
              Onderzoekscentrum
            </span>

            <h2 style={{ fontSize: 34, margin: "10px 0 6px" }}>
              Team {myGroup?.name || "Onbekend"}
            </h2>

            <p style={{ ...styles.subtle, fontSize: 16, maxWidth: 760 }}>
              Verzamel aanwijzingen, beoordeel verdachten en bouw stap voor stap
              jullie theorie op. Alles wat jullie ontdekken, komt hier samen.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <span style={styles.badge}>💰 {myGroup?.credits || 0} pegels</span>
            <span style={styles.badge}>
              📄 {progress.unlockedCount} aanwijzingen
            </span>
            <span style={styles.badge}>
              🕵️ {activeSuspects.length} verdachten
            </span>
            <span style={styles.badge}>📝 {progress.noteCount} notities</span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Vandaag onderzoeken</h2>
        <p style={styles.subtle}>
          Snel naar de plekken waar jullie waarschijnlijk het vaakst iets moeten
          doen. Handig op mobiel tijdens het spel.
        </p>

        {visibleFocusItems.length > 0 ? (
          <div style={styles.grid}>
            {visibleFocusItems.map((item) => (
              <div key={item.label} style={styles.card}>
                <strong>{item.label}</strong>
                <p style={styles.subtle}>{item.text}</p>
                <button
                  style={styles.buttonSecondary}
                  onClick={() => setActiveParticipantTab(item.tab)}
                >
                  {item.button}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              ...styles.card,
              background: "#09090b",
              borderColor: "#166534",
            }}
          >
            <strong>Onderzoek loopt netjes</strong>
            <p style={styles.subtle}>
              Jullie hebben aanwijzingen, notities en statussen al goed op gang.
              Gebruik de knoppen hieronder om snel verder te gaan.
            </p>
          </div>
        )}
      </div>

      <div style={styles.grid}>
        <div
          onClick={() => setActiveParticipantTab("messages")}
          title="Bekijk pegels en info"
          style={{
            ...styles.card,
            cursor: "pointer",
            borderColor: "#f59e0b",
            background:
              "linear-gradient(180deg, rgba(120,53,15,0.22), #18181b)",
          }}
        >
          <strong>💰 Pegels</strong>
          <div style={styles.statNumber}>{myGroup?.credits || 0}</div>
          <div style={styles.subtle}>Beschikbaar voor aanwijzingen</div>
        </div>

        <div
          onClick={() => setActiveParticipantTab("clues")}
          title="Bekijk aanwijzingen"
          style={{
            ...styles.card,
            cursor: "pointer",
            borderColor: "#3b82f6",
            background:
              "linear-gradient(180deg, rgba(30,64,175,0.18), #18181b)",
          }}
        >
          <strong>📄 Aanwijzingen</strong>
          <div style={styles.statNumber}>{progress.unlockedCount}</div>
          <div style={styles.subtle}>
            Ontgrendeld · {progress.buyableCount} nog te koop
          </div>
        </div>

        <div
          onClick={() => setActiveParticipantTab("suspects")}
          title="Bekijk verdachten en notities"
          style={{
            ...styles.card,
            cursor: "pointer",
            borderColor: "#a855f7",
            background: "linear-gradient(180deg, rgba(88,28,135,0.2), #18181b)",
          }}
        >
          <strong>📝 Notities</strong>
          <div style={styles.statNumber}>{progress.noteCount}</div>
          <div style={styles.subtle}>Door jullie groep opgeslagen</div>
        </div>

        <div
          onClick={() => setActiveParticipantTab("suspects")}
          title="Bekijk onderzochte verdachten"
          style={{
            ...styles.card,
            cursor: "pointer",
            borderColor: "#ef4444",
            background:
              "linear-gradient(180deg, rgba(127,29,29,0.22), #18181b)",
          }}
        >
          <strong>🔎 Onderzochte verdachten</strong>
          <div style={styles.statNumber}>{suspectStatusCount}</div>
          <div style={styles.subtle}>Verdachten door jullie beoordeeld</div>
        </div>
      </div>

      <div style={styles.grid}>
        <div
          onClick={() => setActiveParticipantTab("agenda")}
          title="Bekijk agenda"
          style={{ ...styles.card, minHeight: 190, cursor: "pointer" }}
        >
          <h2>🕒 Volgende activiteit</h2>

          {nextAgendaItem ? (
            <>
              <h3 style={{ marginBottom: 6 }}>
                {getAgendaIcon(nextAgendaItem.item_type)} {nextAgendaItem.title}
              </h3>

              <div style={{ ...styles.subtle, marginBottom: 10 }}>
                {formatDate(nextAgendaItem.starts_at)}
                {nextAgendaItem.ends_at
                  ? ` - ${formatDate(nextAgendaItem.ends_at)}`
                  : ""}
              </div>

              {nextAgendaItem.description && (
                <p style={{ fontSize: 16 }}>{nextAgendaItem.description}</p>
              )}

              {nextAgendaItem.credits_reward > 0 && (
                <span style={styles.badge}>
                  💰 {nextAgendaItem.credits_reward} pegels te verdienen
                </span>
              )}
            </>
          ) : (
            <div
              style={{
                ...styles.card,
                background: "#09090b",
                borderColor: "#27272a",
              }}
            >
              <strong>Geen volgende activiteit gepland</strong>
              <p style={styles.subtle}>
                Gebruik de tijd om aanwijzingen te bekijken, statussen bij te
                werken of jullie theorie aan te scherpen.
              </p>
            </div>
          )}
        </div>

        <div
          onClick={() => setActiveParticipantTab("messages")}
          title="Bekijk info en meldingen"
          style={{ ...styles.card, minHeight: 190, cursor: "pointer" }}
        >
          <h2>📡 Laatste ontwikkeling</h2>

          {latestNotification ? (
            <div
              style={{
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: 14,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <strong>{latestNotification.title}</strong>
              {latestNotification.message && (
                <div>{latestNotification.message}</div>
              )}
              <div style={styles.subtle}>
                {formatDate(latestNotification.created_at)}
              </div>
            </div>
          ) : (
            <div
              style={{
                ...styles.card,
                background: "#09090b",
                borderColor: "#27272a",
              }}
            >
              <strong>Nog geen nieuwe info</strong>
              <p style={styles.subtle}>
                Berichten van de organisatie verschijnen hier zodra er iets
                gedeeld wordt.
              </p>
            </div>
          )}

          {latestPurchase ? (
            <div
              style={{
                background:
                  "linear-gradient(180deg, rgba(30,64,175,0.18), #09090b)",
                border: "1px solid #3b82f6",
                borderRadius: 14,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <strong>📄 Laatste aanwijzing</strong>
              <div>{latestPurchase.clue?.title}</div>
              <div style={styles.subtle}>
                {formatDate(
                  latestPurchase.purchase.purchased_at ||
                    latestPurchase.purchase.created_at
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {ENABLE_FINAL_REPORTS && (finalReportsOpen || progress.finalReport) && (
        <div
          onClick={() => setActiveParticipantTab("final")}
          title="Bekijk finale"
          style={{ ...styles.card, cursor: "pointer" }}
        >
          <h2>🏁 Finale</h2>

          {progress.finalReport ? (
            <>
              <span style={styles.badge}>Eindrapport ingediend</span>
              <div style={styles.subtle}>
                Laatst opgeslagen:{" "}
                {formatDate(
                  progress.finalReport.updated_at ||
                    progress.finalReport.submitted_at
                )}
              </div>
            </>
          ) : finalReportsOpen ? (
            <>
              <span style={styles.badge}>Eindrapport open</span>
              <p style={styles.subtle}>
                De organisatie heeft de finale geopend. Jullie kunnen nu een
                eindrapport invullen.
              </p>
            </>
          ) : (
            <>
              <span style={styles.badge}>Eindrapport gesloten</span>
              <p style={styles.subtle}>
                Jullie kunnen het ingediende rapport nog bekijken.
              </p>
            </>
          )}

          <button
            style={styles.button}
            onClick={() => setActiveParticipantTab("final")}
          >
            Naar finale
          </button>
        </div>
      )}
    </>
  );
}
