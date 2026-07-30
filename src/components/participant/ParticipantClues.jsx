import React from "react";

export default function ParticipantCluesPanel({ ctx }) {
  const {
    styles,
    clues,
    purchasedClueIds,
    suspects,
    getClueCategoryName,
    purchaseClue,
    groupCluesByCategory,
    ParticipantGroupBar,
    myGroup,
    openClueFile,
  } = ctx;

  const visibleClues = clues.filter((clue) => clue.is_visible);

  const unlockedClues = visibleClues.filter((clue) => {
    const purchased = purchasedClueIds.includes(clue.id);
    return clue.is_free || clue.is_global || purchased;
  });

  const buyableClues = visibleClues.filter((clue) => {
    const purchased = purchasedClueIds.includes(clue.id);
    return !clue.is_free && !clue.is_global && !purchased;
  });

  const affordableClues = buyableClues.filter(
    (clue) => Number(myGroup?.credits || 0) >= Number(clue.price || 0)
  );
  const lockedByBudgetCount = buyableClues.length - affordableClues.length;
  const totalVisibleClues = unlockedClues.length + buyableClues.length;

  const getClueSuspectName = (clue) => {
    return (
      clue.suspects?.name ||
      suspects.find((suspect) => suspect.id === clue.suspect_id)?.name ||
      ""
    );
  };

  const renderCompactClueCard = (clue, mode) => {
    const suspectName = getClueSuspectName(clue);
    const isUnlocked = mode === "unlocked";
    const canAfford = Number(myGroup?.credits || 0) >= Number(clue.price || 0);

    return (
      <div
        key={clue.id}
        style={{
          ...styles.card,
          borderColor: isUnlocked
            ? "#166534"
            : canAfford
            ? "#3b82f6"
            : "#52525b",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>{clue.title}</h3>

            {suspectName ? (
              <span style={styles.badge}>🕵️ {suspectName}</span>
            ) : (
              <span style={styles.badge}>Algemeen</span>
            )}

            {clue.is_free && <span style={styles.badge}>Gratis</span>}
            {clue.is_global && <span style={styles.badge}>Voor iedereen</span>}
            <span style={styles.badge}>📂 {getClueCategoryName(clue)}</span>

            {isUnlocked ? (
              <span style={styles.badge}>✅ Ontgrendeld</span>
            ) : (
              <span style={styles.badge}>💰 {clue.price} pegels</span>
            )}

            {!isUnlocked && !canAfford && (
              <span style={styles.badge}>Te weinig pegels</span>
            )}
          </div>

          <div style={{ minWidth: 150 }}>
            {isUnlocked ? (
              clue.file_url || clue.pdf_url ? (
                <button
                  type="button"
                  onClick={() => openClueFile(clue.file_url || clue.pdf_url)}
                  style={{
                    ...styles.link,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  Aanwijzing openen
                </button>
              ) : (
                <span style={styles.subtle}>Geen bestand gekoppeld</span>
              )
            ) : (
              <button
                style={canAfford ? styles.button : styles.buttonSecondary}
                onClick={() => purchaseClue(clue.id)}
                disabled={!canAfford}
                title={
                  canAfford
                    ? "Koop deze aanwijzing"
                    : "Jullie hebben nog niet genoeg pegels voor deze aanwijzing"
                }
              >
                {canAfford
                  ? `Koop voor ${clue.price} pegels`
                  : "Te weinig pegels"}
              </button>
            )}
          </div>
        </div>

        {clue.description && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Beschrijving
            </summary>
            <p style={{ marginBottom: 0 }}>{clue.description}</p>
          </details>
        )}
      </div>
    );
  };

  const groupedUnlockedClues = groupCluesByCategory(unlockedClues);
  const groupedBuyableClues = groupCluesByCategory(buyableClues);

  const renderClueGroups = (groupsToRender, mode) => {
    if (groupsToRender.length === 0) return null;

    return groupsToRender.map((group) => (
      <details key={`${mode}-${group.key}`} open style={styles.card}>
        <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 18 }}>
          {group.name} ({group.clues.length})
        </summary>

        <div style={{ marginTop: 12 }}>
          {group.clues.map((clue) => renderCompactClueCard(clue, mode))}
        </div>
      </details>
    ));
  };

  return (
    <>
      {ParticipantGroupBar()}

      <div style={styles.card}>
        <h2>Aanwijzingen</h2>
        <p style={styles.subtle}>
          Bekijk eerst wat jullie al hebben. Koop daarna gericht, want pegels
          zijn schaars en elke aanwijzing moet iets toevoegen aan jullie
          theorie.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <strong>Ontgrendeld</strong>
            <div style={styles.statNumber}>{unlockedClues.length}</div>
            <div style={styles.subtle}>Beschikbaar voor jullie groep</div>
          </div>

          <div style={styles.card}>
            <strong>Te koop</strong>
            <div style={styles.statNumber}>{buyableClues.length}</div>
            <div style={styles.subtle}>Nog te onderzoeken</div>
          </div>

          <div style={styles.card}>
            <strong>Nu betaalbaar</strong>
            <div style={styles.statNumber}>{affordableClues.length}</div>
            <div style={styles.subtle}>
              {lockedByBudgetCount > 0
                ? `${lockedByBudgetCount} aanwijzing(en) vragen meer pegels.`
                : "Alles wat te koop staat is betaalbaar."}
            </div>
          </div>

          <div style={styles.card}>
            <strong>Pegels</strong>
            <div style={styles.statNumber}>💰 {myGroup?.credits || 0}</div>
            <div style={styles.subtle}>Huidig saldo</div>
          </div>
        </div>

        {totalVisibleClues === 0 && (
          <div style={{ ...styles.card, background: "#09090b" }}>
            <strong>Nog geen zichtbare aanwijzingen</strong>
            <p style={styles.subtle}>
              De organisatie kan aanwijzingen later zichtbaar maken of gratis
              vrijgeven.
            </p>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2>Ontgrendeld</h2>

        {unlockedClues.length === 0 ? (
          <div
            style={{
              ...styles.card,
              background: "#09090b",
              borderColor: "#27272a",
            }}
          >
            <strong>Nog niets ontgrendeld</strong>
            <p style={styles.subtle}>
              Zodra jullie een aanwijzing kopen of gratis informatie krijgen,
              verschijnt die hier. Begin bij Te koop of wacht op informatie van
              de organisatie.
            </p>
          </div>
        ) : (
          renderClueGroups(groupedUnlockedClues, "unlocked")
        )}
      </div>

      <div style={styles.card}>
        <h2>Te koop</h2>

        {buyableClues.length === 0 ? (
          <div
            style={{
              ...styles.card,
              background: "#09090b",
              borderColor: "#166534",
            }}
          >
            <strong>Geen losse aanwijzingen meer te koop</strong>
            <p style={styles.subtle}>
              Alles wat nu beschikbaar is, staat bij Ontgrendeld. Nieuwe
              aanwijzingen kunnen later door de organisatie worden toegevoegd of
              vrijgegeven.
            </p>
          </div>
        ) : (
          renderClueGroups(groupedBuyableClues, "buyable")
        )}
      </div>
    </>
  );
}
