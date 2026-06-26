import React from "react";

export default function AdminDashboardPanel({ ctx }) {
  const {
    styles,
    formatDate,
    groups,
    suspects,
    clues,
    notifications,
    transactions,
    groupClues,
    suspectNotes,
    suspectStatuses,
    finalReportsOpen,
    finalReports,
    setActiveAdminTab,
    getGroupLastActivity,
    getGroupFinalReport,
    ENABLE_FINAL_REPORTS,
  } = ctx;

  const AdminLiveGameStatus = () => {
    const buildGroupStatusRow = (group) => {
      const bought = groupClues.filter((item) => item.group_id === group.id);
      const notes = suspectNotes.filter((item) => item.group_id === group.id);
      const statuses = suspectStatuses.filter(
        (item) => item.group_id === group.id
      );
      const groupNotifications = notifications.filter(
        (item) => item.group_id === group.id
      );
      const finalReport = getGroupFinalReport(group.id);
      const lastNotification = groupNotifications[0];
      const lastActivity = getGroupLastActivity(group.id);

      const suspectCount = statuses.filter(
        (item) => item.status === "suspect"
      ).length;
      const doubtCount = statuses.filter(
        (item) => item.status === "doubt"
      ).length;
      const excludedCount = statuses.filter(
        (item) => item.status === "excluded"
      ).length;

      const warnings = [];

      if (!group.is_active) warnings.push("Groep staat inactief");
      if ((group.credits || 0) <= 3) warnings.push("Weinig pegels over");
      if (bought.length === 0) warnings.push("Nog geen aanwijzingen");
      if (bought.length >= 3 && notes.length === 0)
        warnings.push("Veel gekocht, maar nog geen notities");
      if (bought.length === 0 && notes.length === 0 && statuses.length === 0)
        warnings.push("Nog weinig activiteit");
      if (
        ENABLE_FINAL_REPORTS &&
        finalReportsOpen &&
        !finalReport &&
        group.is_active
      )
        warnings.push("Eindrapport ontbreekt");

      let minutesSinceActivity = null;

      if (lastActivity) {
        minutesSinceActivity =
          (new Date() - new Date(lastActivity)) / 1000 / 60;

        if (minutesSinceActivity > 60)
          warnings.push("Al meer dan 60 minuten geen activiteit");
      }

      const recommendedAction = !group.is_active
        ? "Controleer of deze groep bewust inactief staat."
        : (group.credits || 0) <= 3
        ? "Overweeg pegels te geven of stuur een opdrachtmoment aan."
        : bought.length >= 3 && notes.length === 0
        ? "Vraag subtiel of ze hun theorie al vastleggen in notities."
        : bought.length === 0
        ? "Deze groep kan een zetje richting aanwijzingen gebruiken."
        : minutesSinceActivity > 60
        ? "Loop even langs of stuur een korte melding."
        : "Geen directe regieactie nodig.";

      const attentionScore =
        warnings.length * 10 +
        ((group.credits || 0) <= 3 ? 5 : 0) +
        (bought.length === 0 ? 4 : 0) +
        (minutesSinceActivity > 60 ? 3 : 0);

      return {
        group,
        bought,
        notes,
        statuses,
        groupNotifications,
        finalReport,
        lastNotification,
        lastActivity,
        suspectCount,
        doubtCount,
        excludedCount,
        warnings,
        recommendedAction,
        attentionScore,
      };
    };

    const groupRows = groups.map(buildGroupStatusRow).sort((a, b) => {
      if (b.attentionScore !== a.attentionScore) {
        return b.attentionScore - a.attentionScore;
      }

      return a.group.name.localeCompare(b.group.name);
    });

    const activeGroups = groups.filter((group) => group.is_active);
    const attentionRows = groupRows.filter((row) => row.warnings.length > 0);
    const quietRows = groupRows.filter((row) =>
      row.warnings.includes("Al meer dan 60 minuten geen activiteit")
    );
    const lowCreditRows = groupRows.filter(
      (row) => (row.group.credits || 0) <= 3
    );
    const noNotesAfterBuyingRows = groupRows.filter(
      (row) => row.bought.length >= 3 && row.notes.length === 0
    );

    return (
      <div style={styles.card}>
        <h2>🖥️ Live spelstatus per groep</h2>

        <p style={styles.subtle}>
          Regie-overzicht voor tijdens het spel. Groepen die aandacht nodig
          hebben staan bovenaan, zodat je sneller ziet waar de organisatie moet
          bijsturen.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <strong>Actieve groepen</strong>
            <div style={styles.statNumber}>{activeGroups.length}</div>
            <div style={styles.subtle}>Meespelend of zichtbaar</div>
          </div>

          <div
            style={{
              ...styles.card,
              borderColor: attentionRows.length > 0 ? "#ef4444" : "#166534",
            }}
          >
            <strong>Aandacht nodig</strong>
            <div style={styles.statNumber}>{attentionRows.length}</div>
            <div style={styles.subtle}>Groepen met waarschuwingen</div>
          </div>

          <div style={styles.card}>
            <strong>Weinig pegels</strong>
            <div style={styles.statNumber}>{lowCreditRows.length}</div>
            <div style={styles.subtle}>Groepen met 3 of minder pegels</div>
          </div>

          <div style={styles.card}>
            <strong>Stilgevallen</strong>
            <div style={styles.statNumber}>{quietRows.length}</div>
            <div style={styles.subtle}>Meer dan 60 minuten geen actie</div>
          </div>
        </div>

        {noNotesAfterBuyingRows.length > 0 && (
          <div
            style={{
              ...styles.card,
              borderColor: "#f59e0b",
              background:
                "linear-gradient(180deg, rgba(120,53,15,0.18), #18181b)",
            }}
          >
            <strong>Regie-tip</strong>
            <p style={styles.subtle}>
              {noNotesAfterBuyingRows.length} groep(en) hebben meerdere
              aanwijzingen, maar nog geen notities. Dit is een goed moment om
              hen subtiel te sturen richting theorie-vorming.
            </p>
          </div>
        )}

        {groups.length === 0 ? (
          <p style={styles.subtle}>Nog geen groepen.</p>
        ) : (
          groupRows.map(
            ({
              group,
              bought,
              notes,
              statuses,
              lastNotification,
              lastActivity,
              suspectCount,
              doubtCount,
              excludedCount,
              warnings,
              recommendedAction,
            }) => {
              return (
                <div
                  key={group.id}
                  style={{
                    ...styles.card,
                    borderColor: warnings.length > 0 ? "#52525b" : "#166534",
                    background:
                      warnings.length > 0
                        ? "linear-gradient(180deg, rgba(24,24,27,0.98), rgba(9,9,11,0.95))"
                        : "linear-gradient(180deg, rgba(20,83,45,0.12), rgba(24,24,27,0.98))",
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
                    <div>
                      <h3 style={{ marginTop: 0, marginBottom: 6 }}>
                        {group.name}
                      </h3>
                      <span style={styles.badge}>
                        {group.is_active ? "Actief" : "Inactief"}
                      </span>
                      {warnings.length > 0 ? (
                        <span style={styles.badge}>
                          ⚠️ {warnings.length} aandachtspunt(en)
                        </span>
                      ) : (
                        <span style={styles.badge}>✅ Loopt rustig</span>
                      )}
                      {lastActivity && (
                        <span style={styles.badge}>
                          Laatste actie: {formatDate(lastActivity)}
                        </span>
                      )}
                    </div>

                    <div>
                      <button
                        style={styles.buttonSecondary}
                        onClick={() => setActiveAdminTab("groups")}
                      >
                        Groepen
                      </button>
                      <button
                        style={styles.buttonSecondary}
                        onClick={() => setActiveAdminTab("credits")}
                      >
                        Pegels / melding
                      </button>
                    </div>
                  </div>

                  <div style={styles.grid}>
                    <div style={styles.card}>
                      <strong>💰 Pegels</strong>
                      <div style={styles.statNumber}>{group.credits || 0}</div>
                    </div>
                    <div style={styles.card}>
                      <strong>📄 Aanwijzingen</strong>
                      <div style={styles.statNumber}>{bought.length}</div>
                    </div>
                    <div style={styles.card}>
                      <strong>📝 Notities</strong>
                      <div style={styles.statNumber}>{notes.length}</div>
                    </div>
                    <div style={styles.card}>
                      <strong>🕵️ Statussen</strong>
                      <div style={styles.statNumber}>{statuses.length}</div>
                      <div style={styles.subtle}>
                        Verdacht: {suspectCount} · Twijfel: {doubtCount} ·
                        Uitgesloten: {excludedCount}
                      </div>
                    </div>
                  </div>

                  <div style={styles.grid}>
                    <div style={styles.card}>
                      <strong>Laatste melding</strong>
                      {lastNotification ? (
                        <>
                          <div>{lastNotification.title}</div>
                          {lastNotification.message && (
                            <div style={styles.subtle}>
                              {lastNotification.message}
                            </div>
                          )}
                          <div style={styles.subtle}>
                            {formatDate(lastNotification.created_at)}
                          </div>
                        </>
                      ) : (
                        <div style={styles.subtle}>Nog geen meldingen.</div>
                      )}
                    </div>

                    <div
                      style={{
                        ...styles.card,
                        borderColor:
                          warnings.length > 0 ? "#ef4444" : "#166534",
                        background:
                          warnings.length > 0
                            ? "linear-gradient(180deg, rgba(69,10,10,0.28), #18181b)"
                            : "linear-gradient(180deg, rgba(20,83,45,0.14), #18181b)",
                      }}
                    >
                      <strong>Regie-signaal</strong>
                      {warnings.length > 0 ? (
                        warnings.map((warning) => (
                          <div
                            key={warning}
                            style={{ ...styles.error, fontWeight: 800 }}
                          >
                            ⚠️ {warning}
                          </div>
                        ))
                      ) : (
                        <p style={styles.ok}>
                          Geen directe actie nodig. Deze groep draait netjes
                          mee.
                        </p>
                      )}

                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid #27272a",
                        }}
                      >
                        <strong>Aanbevolen regieactie</strong>
                        <div style={styles.subtle}>{recommendedAction}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )
        )}

        {activeGroups.length === 0 && groups.length > 0 && (
          <p style={styles.error}>
            Er zijn groepen, maar geen actieve groepen.
          </p>
        )}
      </div>
    );
  };

  const AdminFinalReportStatusCard = () => {
    if (!ENABLE_FINAL_REPORTS) return null;

    const activeGroups = groups.filter((group) => group.is_active);

    const submittedGroupIds = finalReports
      .map((report) => report.group_id)
      .filter(Boolean);

    const missingGroups = activeGroups.filter(
      (group) => !submittedGroupIds.includes(group.id)
    );

    const submittedCount = activeGroups.length - missingGroups.length;

    return (
      <div
        style={{
          ...styles.card,
          borderColor: finalReportsOpen ? "#22c55e" : "#ef4444",
          background: finalReportsOpen
            ? "linear-gradient(180deg, rgba(20,83,45,0.12), rgba(24,24,27,0.98))"
            : "linear-gradient(180deg, rgba(69,10,10,0.16), rgba(24,24,27,0.98))",
        }}
      >
        <h2>🏁 Finale / eindrapporten</h2>

        <span
          style={{
            ...styles.badge,
            borderColor: finalReportsOpen ? "#22c55e" : "#ef4444",
          }}
        >
          {finalReportsOpen ? "Open voor deelnemers" : "Gesloten"}
        </span>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>Actieve groepen</h3>
            <div style={styles.statNumber}>{activeGroups.length}</div>
          </div>

          <div style={styles.card}>
            <h3>Ingediend</h3>
            <div style={styles.statNumber}>{submittedCount}</div>
          </div>

          <div style={styles.card}>
            <h3>Nog ontbrekend</h3>
            <div style={styles.statNumber}>{missingGroups.length}</div>
          </div>
        </div>

        {missingGroups.length === 0 && activeGroups.length > 0 ? (
          <p style={styles.ok}>
            Alle actieve groepen hebben een eindrapport ingediend.
          </p>
        ) : (
          <div style={styles.card}>
            <strong>Ontbrekende groepen</strong>

            {missingGroups.length === 0 ? (
              <p style={styles.subtle}>Geen actieve groepen.</p>
            ) : (
              missingGroups.map((group) => (
                <span key={group.id} style={styles.badge}>
                  {group.name}
                </span>
              ))
            )}
          </div>
        )}

        <button
          style={styles.buttonSecondary}
          onClick={() => setActiveAdminTab("final")}
        >
          Naar finale-overzicht
        </button>
      </div>
    );
  };

  const AdminDashboard = () => {
    const activeGroups = groups.filter((group) => group.is_active).length;
    const inactiveGroups = groups.filter((group) => !group.is_active).length;
    const activeSuspects = suspects.filter(
      (suspect) => suspect.is_active
    ).length;
    const inactiveSuspects = suspects.filter(
      (suspect) => !suspect.is_active
    ).length;
    const visibleClues = clues.filter((clue) => clue.is_visible).length;
    const hiddenClues = clues.filter((clue) => !clue.is_visible).length;
    const creditsInPlay = groups.reduce(
      (total, group) => total + Number(group.credits || 0),
      0
    );
    const creditsAwarded = transactions
      .filter((transaction) => Number(transaction.amount) > 0)
      .reduce(
        (total, transaction) => total + Number(transaction.amount || 0),
        0
      );
    const creditsSpentOrRemoved = Math.abs(
      transactions
        .filter((transaction) => Number(transaction.amount) < 0)
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0
        )
    );

    const lowCreditGroups = groups.filter((group) => (group.credits || 0) <= 3);
    const noNoteAfterBuyingGroups = groups.filter((group) => {
      const bought = groupClues.filter((item) => item.group_id === group.id);
      const notes = suspectNotes.filter((item) => item.group_id === group.id);
      return group.is_active && bought.length >= 3 && notes.length === 0;
    });
    const groupsWithoutStatuses = groups.filter((group) => {
      const statuses = suspectStatuses.filter(
        (item) => item.group_id === group.id
      );
      return group.is_active && statuses.length === 0;
    });

    const adminActionHints = [
      lowCreditGroups.length > 0
        ? `${lowCreditGroups.length} groep(en) hebben weinig pegels.`
        : null,
      noNoteAfterBuyingGroups.length > 0
        ? `${noNoteAfterBuyingGroups.length} groep(en) kopen aanwijzingen maar noteren nog niets.`
        : null,
      groupsWithoutStatuses.length > 0
        ? `${groupsWithoutStatuses.length} actieve groep(en) hebben nog geen verdachte-statussen gezet.`
        : null,
    ].filter(Boolean);

    return (
      <>
        <div
          style={{
            ...styles.card,
            background:
              "linear-gradient(135deg, rgba(153,27,27,0.2), rgba(24,24,27,0.98) 55%, rgba(9,9,11,0.98))",
            borderColor: "#52525b",
            padding: 22,
          }}
        >
          <span
            style={{
              ...styles.badge,
              borderColor: "#ef4444",
              color: "#fecaca",
              background: "rgba(69,10,10,0.55)",
            }}
          >
            Control Room overzicht
          </span>
          <h2 style={{ fontSize: 32, margin: "10px 0 8px" }}>
            Spel in één oogopslag
          </h2>
          <p style={{ ...styles.subtle, fontSize: 16 }}>
            Live stand van groepen, aanwijzingen, pegels, notities en statussen.
            Klik op een kaart om direct naar het juiste scherm te gaan.
          </p>

          <div
            style={{
              ...styles.card,
              background: "rgba(9,9,11,0.56)",
              borderColor: adminActionHints.length > 0 ? "#f59e0b" : "#166534",
            }}
          >
            <strong>Nu handig om te checken</strong>
            {adminActionHints.length === 0 ? (
              <p style={styles.ok}>
                Geen opvallende regiesignalen in het dashboard.
              </p>
            ) : (
              <div style={{ marginTop: 8 }}>
                {adminActionHints.map((hint) => (
                  <div key={hint} style={styles.subtle}>
                    ⚠️ {hint}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.grid}>
            <div
              onClick={() => setActiveAdminTab("groups")}
              title="Bekijk groepen en aankopen"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>👥 Actieve groepen</strong>
              <div style={styles.statNumber}>{activeGroups}</div>
              <span style={styles.badge}>Inactief: {inactiveGroups}</span>
            </div>
            <div
              onClick={() => setActiveAdminTab("manage")}
              title="Bekijk verdachtenbeheer"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>🕵️ Verdachten</strong>
              <div style={styles.statNumber}>{suspects.length}</div>
              <span style={styles.badge}>Actief: {activeSuspects}</span>
              <span style={styles.badge}>Inactief: {inactiveSuspects}</span>
            </div>
            <div
              onClick={() => setActiveAdminTab("groups")}
              title="Bekijk gekochte aanwijzingen"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>📄 Aankopen</strong>
              <div style={styles.statNumber}>{groupClues.length}</div>
              <div style={styles.subtle}>Gekocht/toegewezen</div>
            </div>
            <div
              onClick={() => setActiveAdminTab("interrogation")}
              title="Bekijk notities in het verhoorpaneel"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>📝 Notities</strong>
              <div style={styles.statNumber}>{suspectNotes.length}</div>
              <div style={styles.subtle}>Door groepjes ingevoerd</div>
            </div>
            <div
              onClick={() => setActiveAdminTab("interrogation")}
              title="Bekijk statussen in het verhoorpaneel"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>🏷️ Statussen</strong>
              <div style={styles.statNumber}>{suspectStatuses.length}</div>
              <div style={styles.subtle}>Verdachte beoordelingen</div>
            </div>
            <div
              onClick={() => setActiveAdminTab("credits")}
              title="Bekijk pegels en meldingen"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>💰 Pegels in spel</strong>
              <div style={styles.statNumber}>{creditsInPlay}</div>
              <div style={styles.subtle}>
                Uitgedeeld: {creditsAwarded} · Af: {creditsSpentOrRemoved}
              </div>
            </div>
          </div>
        </div>

        {ENABLE_FINAL_REPORTS && AdminFinalReportStatusCard()}

        {AdminLiveGameStatus()}
      </>
    );
  };

  return AdminDashboard();
}
