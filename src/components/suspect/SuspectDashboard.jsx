import React from "react";

export default function SuspectDashboard({ ctx }) {
  const {
    supabase,
    styles,
    formatDate,
    getAgendaIcon,
    toDateTimeLocalValue,
    getStatusLabel,
    reloadTimer,
    isTypingRef,
    editClueFileRef,
    editSuspectFileRef,
    finalReportMotiveRef,
    finalReportEvidenceRef,
    session,
    setSession,
    profile,
    setProfile,
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    groups,
    setGroups,
    profiles,
    setProfiles,
    memberships,
    setMemberships,
    suspects,
    setSuspects,
    agendaItems,
    setAgendaItems,
    notifications,
    setNotifications,
    transactions,
    setTransactions,
    clues,
    setClues,
    clueCategories,
    setClueCategories,
    groupClues,
    setGroupClues,
    suspectNotes,
    setSuspectNotes,
    suspectStatuses,
    setSuspectStatuses,
    activeParticipantTab,
    setActiveParticipantTab,
    activeAdminTab,
    setActiveAdminTab,
    selectedParticipantSuspect,
    setSelectedParticipantSuspect,
    selectedSuspectDossier,
    setSelectedSuspectDossier,
    selectedInterrogationSuspect,
    setSelectedInterrogationSuspect,
    newGroupName,
    setNewGroupName,
    selectedUser,
    setSelectedUser,
    editingGroupId,
    setEditingGroupId,
    editGroupName,
    setEditGroupName,
    selectedGroup,
    setSelectedGroup,
    manualClueGroup,
    setManualClueGroup,
    manualClueId,
    setManualClueId,
    manualClueMode,
    setManualClueMode,
    selectedManualClueGroups,
    setSelectedManualClueGroups,
    selectedSuspectUser,
    setSelectedSuspectUser,
    selectedProfileSuspect,
    setSelectedProfileSuspect,
    newSuspectName,
    setNewSuspectName,
    newSuspectDescription,
    setNewSuspectDescription,
    newSuspectPhotoUrl,
    setNewSuspectPhotoUrl,
    editingSuspectId,
    setEditingSuspectId,
    editSuspectName,
    setEditSuspectName,
    editSuspectDescription,
    setEditSuspectDescription,
    editSuspectPhotoUrl,
    setEditSuspectPhotoUrl,
    newAgenda,
    setNewAgenda,
    newClueTitle,
    setNewClueTitle,
    newClueDescription,
    setNewClueDescription,
    newCluePrice,
    setNewCluePrice,
    newClueSuspect,
    setNewClueSuspect,
    newClueCategory,
    setNewClueCategory,
    newClueIsFree,
    setNewClueIsFree,
    newClueIsGlobal,
    setNewClueIsGlobal,
    editingClueId,
    setEditingClueId,
    editClueTitle,
    setEditClueTitle,
    editClueDescription,
    setEditClueDescription,
    editCluePrice,
    setEditCluePrice,
    editClueSuspect,
    setEditClueSuspect,
    editClueCategory,
    setEditClueCategory,
    editClueIsFree,
    setEditClueIsFree,
    editClueIsGlobal,
    setEditClueIsGlobal,
    editClueIsVisible,
    setEditClueIsVisible,
    newClueCategoryName,
    setNewClueCategoryName,
    editingCategoryId,
    setEditingCategoryId,
    editClueCategoryName,
    setEditClueCategoryName,
    editingAgendaId,
    setEditingAgendaId,
    editAgenda,
    setEditAgenda,
    newNotificationGroup,
    setNewNotificationGroup,
    newNotificationTitle,
    setNewNotificationTitle,
    newNotificationMessage,
    setNewNotificationMessage,
    notificationMode,
    setNotificationMode,
    selectedNotificationGroups,
    setSelectedNotificationGroups,
    creditGroup,
    setCreditGroup,
    creditAmount,
    setCreditAmount,
    creditReason,
    setCreditReason,
    selectedNoteSuspect,
    setSelectedNoteSuspect,
    newNote,
    setNewNote,
    selectedStatusSuspect,
    setSelectedStatusSuspect,
    newStatus,
    setNewStatus,
    editingNoteId,
    setEditingNoteId,
    editNoteText,
    setEditNoteText,
    error,
    setError,
    message,
    setMessage,
    imageModal,
    setImageModal,
    expandedNoteIds,
    setExpandedNoteIds,
    gameMode,
    setGameMode,
    isLandingDomain,
    isLoading,
    setIsLoading,
    isBackupRunning,
    setIsBackupRunning,
    latestBackupInfo,
    setLatestBackupInfo,
    finalReportsOpen,
    setFinalReportsOpen,
    finalReports,
    setFinalReports,
    finalReportSuspect,
    setFinalReportSuspect,
    finalReportMotive,
    setFinalReportMotive,
    finalReportEvidence,
    setFinalReportEvidence,
    showFinalReportEditor,
    setShowFinalReportEditor,
    myMemberships,
    myGroups,
    myGroup,
    purchasedClueIds,
    visibleAgendaItems,
    nextAgendaItem,
    adminStats,
    scheduleReload,
    appFocusHandlers,
    clearAppData,
    loadSession,
    loadProfile,
    loadAppData,
    refreshWithLoading,
    handleRegister,
    handleLogin,
    handleLogout,
    uploadFileToBucket,
    createGroup,
    startEditGroup,
    saveEditGroup,
    cancelEditGroup,
    addUserToGroup,
    linkUserToSuspect,
    removeUserFromGroup,
    createSuspect,
    startEditSuspect,
    cancelEditSuspect,
    saveEditSuspect,
    createAgendaItem,
    createClue,
    toggleSelectedManualClueGroup,
    toggleSelectedNotificationGroup,
    sendNotification,
    giveCredits,
    changeCredits,
    toggleClueVisible,
    startEditClue,
    cancelEditClue,
    saveEditClue,
    deleteClue,
    toggleAgendaVisible,
    startEditAgenda,
    cancelEditAgenda,
    saveEditAgenda,
    deleteAgendaItem,
    toggleSuspectActive,
    toggleGroupActive,
    getGroupLastActivity,
    getGroupFinalReport,
    getParticipantProgress,
    getClueCategoryName,
    groupCluesByCategory,
    createClueCategory,
    startEditClueCategory,
    cancelEditClueCategory,
    saveEditClueCategory,
    toggleClueCategoryActive,
    shouldShowParticipantFinalTab,
    assignClueToGroup,
    updateGameMode,
    updateFinalReportsOpen,
    createLiveBackup,
    safeCsvValue,
    downloadTextFile,
    buildCsvContent,
    downloadCsv,
    getExportStamp,
    exportFullBackup,
    exportNotesCsv,
    exportStatusesCsv,
    exportPurchasesCsv,
    exportTransactionsCsv,
    exportFinalReportsCsv,
    exportCompleteCsvBackup,
    resetTestData,
    removeGroupClue,
    deleteDemoData,
    loadDemoData,
    purchaseClue,
    addParticipantNote,
    startEditNote,
    cancelEditNote,
    saveEditNote,
    deleteNote,
    saveParticipantStatus,
    loadFinalReportForm,
    saveFinalReport,
    SuspectImage,
    ImageModal,
    FinalReportEditorModal,
    StatusBadge,
    LoadingBlock,
    MessageBlock,
    Header,
    AgendaBlock,
    NotificationsBlock,
    TransactionsBlock,
    NoGroupScreen,
    ParticipantGroupBar,
    ParticipantDashboard,
    ParticipantFinalReport,
    ParticipantClues,
    ParticipantSuspects,
    AdminParticipantPreview,
    AdminSetupCheck,
    AdminLiveGameStatus,
    AdminFinalReportStatusCard,
    AdminDashboard,
    AdminManage,
    AdminClues,
    AdminCreditsAndNotifications,
    AdminPurchasesOverview,
    AdminGroupsList,
    AdminFinalReports,
    groupNotesBy,
    AdminInterrogationPanel,
    SuspectDashboard,
    LandingPage,
    LoginScreen,
  } = ctx;

  const linkedSuspect = suspects.find((s) => s.id === profile?.suspect_id);

  if (!linkedSuspect) {
    return (
      <div style={styles.app} {...appFocusHandlers}>
        <div style={styles.shell}>
          {Header({
            title: "CSI HIT Verdachte",
            subtitle: `Ingelogd als ${profile.display_name || profile.email}`,
          })}

          {LoadingBlock()}

          <div style={styles.card}>
            <h2>Je verdachte-account is nog niet gekoppeld</h2>
            <p>
              Je account heeft de rol <strong>verdachte</strong>, maar is nog
              niet gekoppeld aan een dossier.
            </p>
            <p style={styles.subtle}>
              Vraag de organisatie om jouw account te koppelen aan de juiste
              verdachte via Beheer → Verdachte-account koppelen.
            </p>

            <button style={styles.button} onClick={() => loadAppData(profile)}>
              Opnieuw controleren
            </button>

            <button style={styles.buttonSecondary} onClick={handleLogout}>
              Uitloggen
            </button>
          </div>

          {MessageBlock()}
        </div>
      </div>
    );
  }

  const activeSuspectOptions = suspects.filter((suspect) => suspect.is_active);
  const viewedSuspect =
    activeSuspectOptions.find(
      (suspect) => suspect.id === selectedSuspectDossier
    ) || linkedSuspect;
  const viewingOwnDossier = viewedSuspect.id === linkedSuspect.id;

  const notesForMe = suspectNotes.filter(
    (note) => note.suspect_id === viewedSuspect.id
  );

  const statusesForMe = suspectStatuses.filter(
    (status) => status.suspect_id === viewedSuspect.id
  );

  const boughtCluesForMe = groupClues.filter((purchase) => {
    const clue =
      purchase.clues || clues.find((item) => item.id === purchase.clue_id);

    return clue?.suspect_id === viewedSuspect.id;
  });

  const suspectCount = statusesForMe.filter(
    (item) => item.status === "suspect"
  ).length;

  const doubtCount = statusesForMe.filter(
    (item) => item.status === "doubt"
  ).length;

  const excludedCount = statusesForMe.filter(
    (item) => item.status === "excluded"
  ).length;

  const unknownCount = Math.max(groups.length - statusesForMe.length, 0);

  const sortedNotesForMe = [...notesForMe].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const recentNotesForMe = sortedNotesForMe.slice(0, 3);
  const latestNote = sortedNotesForMe[0];
  const groupsWithNotesCount = new Set(
    notesForMe.map((note) => note.group_id).filter(Boolean)
  ).size;
  const groupsWithStatusCount = new Set(
    statusesForMe.map((status) => status.group_id).filter(Boolean)
  ).size;
  const strongestSignal =
    suspectCount > 0
      ? `${suspectCount} groep(en) vinden dit dossier verdacht`
      : doubtCount > 0
      ? `${doubtCount} groep(en) twijfelen nog`
      : excludedCount > 0
      ? `${excludedCount} groep(en) sluiten dit dossier uit`
      : "Nog geen duidelijke richting vanuit de groepen";

  const dossierMood =
    suspectCount > doubtCount && suspectCount > excludedCount
      ? {
          label: "Hete stoel",
          text: "Dit dossier trekt duidelijke verdenking.",
        }
      : doubtCount > 0
      ? { label: "Twijfelzone", text: "Teams zijn nog niet eensgezind." }
      : excludedCount > 0 && excludedCount >= suspectCount
      ? {
          label: "Koeler spoor",
          text: "Meerdere groepen sluiten dit dossier uit.",
        }
      : {
          label: "Nog stil",
          text: "Er is nog weinig beweging in dit dossier.",
        };

  const statusRows = groups.map((group) => {
    const statusRecord = statusesForMe.find(
      (item) => item.group_id === group.id
    );

    return {
      group,
      status: statusRecord?.status || "unknown",
      updatedAt: statusRecord?.updated_at || statusRecord?.created_at,
    };
  });

  const statusSummary = [
    {
      label: "Verdacht",
      value: suspectCount,
      emoji: "🟥",
      borderColor: "#ef4444",
      background: "linear-gradient(180deg, rgba(127,29,29,0.34), #18181b)",
    },
    {
      label: "Twijfel",
      value: doubtCount,
      emoji: "🟨",
      borderColor: "#f59e0b",
      background: "linear-gradient(180deg, rgba(146,64,14,0.28), #18181b)",
    },
    {
      label: "Uitgesloten",
      value: excludedCount,
      emoji: "🟩",
      borderColor: "#22c55e",
      background: "linear-gradient(180deg, rgba(22,101,52,0.28), #18181b)",
    },
    {
      label: "Notities",
      value: notesForMe.length,
      emoji: "📝",
      borderColor: "#52525b",
      background: "linear-gradient(180deg, rgba(63,63,70,0.34), #18181b)",
    },
  ];

  const statusBarTotal = Math.max(statusesForMe.length, groups.length, 1);
  const statusSegments = [
    { label: "Verdacht", count: suspectCount, color: "#991b1b" },
    { label: "Twijfel", count: doubtCount, color: "#92400e" },
    { label: "Uitgesloten", count: excludedCount, color: "#166534" },
    { label: "Onbekend", count: unknownCount, color: "#3f3f46" },
  ].filter((segment) => segment.count > 0);

  const toggleExpandedNote = (noteId) => {
    setExpandedNoteIds((current) => ({
      ...current,
      [noteId]: !current[noteId],
    }));
  };

  const renderSuspectNotePreview = (note, { compact = false } = {}) => {
    const isExpanded = Boolean(expandedNoteIds[note.id]);

    return (
      <div
        key={note.id}
        style={{
          background: "#09090b",
          border: "1px solid #27272a",
          borderRadius: 14,
          padding: compact ? 12 : 14,
          marginBottom: 10,
          lineHeight: 1.65,
        }}
      >
        <div
          style={
            isExpanded
              ? { whiteSpace: "pre-wrap" }
              : {
                  whiteSpace: "pre-wrap",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
          }
        >
          {note.note}
        </div>

        <button
          style={{
            ...styles.buttonSecondary,
            padding: "7px 10px",
            fontSize: 13,
            marginTop: 10,
            marginBottom: 0,
          }}
          onClick={() => toggleExpandedNote(note.id)}
        >
          {isExpanded ? "▲ Minder weergeven" : "▼ Lees volledige notitie"}
        </button>

        <div style={{ ...styles.subtle, marginTop: 10 }}>
          📁 {note.groups?.name || "Onbekende groep"} · Door:{" "}
          {note.profiles?.display_name || note.profiles?.email || "onbekend"} ·{" "}
          {formatDate(note.created_at)}
        </div>
      </div>
    );
  };

  const photoBlock = viewedSuspect.photo_url ? (
    <img
      src={viewedSuspect.photo_url}
      alt={viewedSuspect.name}
      style={{
        width: "100%",
        maxWidth: 260,
        aspectRatio: "1 / 1",
        objectFit: "cover",
        borderRadius: 24,
        border: "1px solid #52525b",
        boxShadow: "0 24px 70px rgba(0,0,0,0.46)",
        display: "block",
        margin: "0 auto",
        cursor: "pointer",
      }}
      onClick={() =>
        setImageModal({
          src: viewedSuspect.photo_url,
          alt: viewedSuspect.name,
        })
      }
    />
  ) : (
    <div
      style={{
        width: "100%",
        maxWidth: 260,
        aspectRatio: "1 / 1",
        borderRadius: 24,
        border: "1px solid #52525b",
        background: "#09090b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 72,
      }}
    >
      🕵️
    </div>
  );

  return (
    <div style={styles.app} {...appFocusHandlers}>
      <div style={styles.shell}>
        {Header({
          title: "CSI HIT Verdachte",
          subtitle: `Ingelogd als ${profile.display_name || profile.email}`,
        })}

        {LoadingBlock()}

        <div
          style={{
            ...styles.card,
            background:
              "radial-gradient(circle at top left, rgba(127,29,29,0.34), rgba(24,24,27,0.97) 42%, #18181b 100%)",
            borderRadius: 26,
            padding: 22,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 22,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                minWidth: 0,
                display: "flex",
                justifyContent: "center",
              }}
            >
              {photoBlock}
            </div>

            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  ...styles.badge,
                  borderColor: "#ef4444",
                  color: "#fecaca",
                  marginTop: 0,
                }}
              >
                {viewingOwnDossier
                  ? "Mijn verdachte-dossier"
                  : "Dossier bekijken"}
              </span>

              <h1
                style={{
                  margin: "10px 0 6px",
                  fontSize: "clamp(34px, 5vw, 58px)",
                  lineHeight: 1,
                }}
              >
                {viewedSuspect.name}
              </h1>

              <p
                style={{
                  ...styles.subtle,
                  maxWidth: 760,
                  fontSize: 16,
                  lineHeight: 1.65,
                }}
              >
                {viewingOwnDossier
                  ? "Je start automatisch in je eigen dossier. Hier zie je wat de onderzoeksteams over jou noteren, welke status ze aan je geven en welke aanwijzingen rond jouw rol zijn gekocht."
                  : "Je bekijkt nu het dossier van een andere verdachte. Handig om snel te zien hoe de teams het totale speelveld inschatten."}
              </p>

              {activeSuspectOptions.length > 1 && (
                <div style={{ marginTop: 12, maxWidth: 520 }}>
                  <strong>Dossier bekijken</strong>
                  <select
                    style={{ ...styles.select, marginTop: 8 }}
                    value={viewedSuspect.id}
                    onChange={(e) => setSelectedSuspectDossier(e.target.value)}
                  >
                    {activeSuspectOptions.map((suspect) => (
                      <option key={suspect.id} value={suspect.id}>
                        {suspect.id === linkedSuspect.id
                          ? `${suspect.name} (mijn dossier)`
                          : suspect.name}
                      </option>
                    ))}
                  </select>

                  {!viewingOwnDossier && (
                    <button
                      style={{ ...styles.buttonSecondary, marginTop: 8 }}
                      onClick={() =>
                        setSelectedSuspectDossier(linkedSuspect.id)
                      }
                    >
                      Terug naar mijn dossier
                    </button>
                  )}
                </div>
              )}

              {viewedSuspect.description && (
                <details style={{ marginTop: 12 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 12px",
                      border: "1px solid #52525b",
                      borderRadius: 999,
                      background: "rgba(9,9,11,0.62)",
                    }}
                  >
                    Bekijk verdachteprofiel
                  </summary>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 14,
                      border: "1px solid #27272a",
                      borderRadius: 14,
                      background: "rgba(9,9,11,0.72)",
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {viewedSuspect.description}
                  </div>
                </details>
              )}

              <div style={{ marginTop: 14 }}>
                <span style={styles.badge}>🧑‍🤝‍🧑 {groups.length} groep(en)</span>
                <span style={styles.badge}>
                  📝 {notesForMe.length} notitie(s)
                </span>
                <span style={styles.badge}>
                  🔎 {boughtCluesForMe.length} aanwijzing(en) gekocht
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={{ marginTop: 0 }}>Dossier in het kort</h2>
          <p style={styles.subtle}>
            Snelle samenvatting voor tijdens het spel, zonder dat je door alle
            notities hoeft te graven.
          </p>

          <div style={styles.grid}>
            <div style={styles.card}>
              <strong>Belangrijkste signaal</strong>
              <div style={{ marginTop: 8 }}>{strongestSignal}</div>
            </div>

            <div style={styles.card}>
              <strong>Groepen met notities</strong>
              <div style={{ ...styles.statNumber, fontSize: 34 }}>
                {groupsWithNotesCount}
              </div>
              <div style={styles.subtle}>Van {groups.length} groep(en)</div>
            </div>

            <div style={styles.card}>
              <strong>Groepen met status</strong>
              <div style={{ ...styles.statNumber, fontSize: 34 }}>
                {groupsWithStatusCount}
              </div>
              <div style={styles.subtle}>Status ingevuld in dit dossier</div>
            </div>

            <div style={styles.card}>
              <strong>Dossierkleur</strong>
              <div style={{ marginTop: 8, fontWeight: 800 }}>
                {dossierMood.label}
              </div>
              <div style={styles.subtle}>{dossierMood.text}</div>
            </div>

            <div style={styles.card}>
              <strong>Nog geen status</strong>
              <div style={{ ...styles.statNumber, fontSize: 34 }}>
                {unknownCount}
              </div>
              <div style={styles.subtle}>
                Groep(en) hebben nog niets gekozen
              </div>
            </div>
          </div>

          {latestNote ? (
            <div style={{ ...styles.card, background: "#09090b" }}>
              <strong>Nieuwste notitie</strong>
              <p
                style={{
                  whiteSpace: "pre-wrap",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {latestNote.note}
              </p>
              <div style={styles.subtle}>
                📁 {latestNote.groups?.name || "Onbekende groep"} ·{" "}
                {formatDate(latestNote.created_at)}
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
              <strong>Nog geen notities in dit dossier</strong>
              <p style={styles.subtle}>
                Zodra teams iets over dit dossier opslaan, verschijnt hier de
                nieuwste notitie als snelle preview.
              </p>
            </div>
          )}
        </div>

        <div style={styles.grid}>
          {statusSummary.map((item) => (
            <div
              key={item.label}
              style={{
                ...styles.card,
                background: item.background,
                borderColor: item.borderColor,
              }}
            >
              <strong>
                {item.emoji} {item.label}
              </strong>
              <div style={{ ...styles.statNumber, fontSize: 36 }}>
                {item.value}
              </div>
              <div style={styles.subtle}>
                {item.label === "Notities"
                  ? "Opmerkingen van onderzoeksteams"
                  : "Statussen van actieve groepen"}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h2>Wat denken de onderzoekers?</h2>
            <p style={styles.subtle}>
              Verdeling van de statussen die groepen dit dossier hebben gegeven.
              Dit is geen eindscore, maar een thermometer voor het speelveld.
            </p>

            <div
              style={{
                display: "flex",
                height: 18,
                borderRadius: 999,
                overflow: "hidden",
                border: "1px solid #3f3f46",
                background: "#09090b",
                margin: "14px 0",
              }}
            >
              {statusSegments.map((segment) => (
                <div
                  key={segment.label}
                  title={`${segment.label}: ${segment.count}`}
                  style={{
                    width: `${Math.max(
                      8,
                      (segment.count / statusBarTotal) * 100
                    )}%`,
                    background: segment.color,
                  }}
                />
              ))}
            </div>

            {statusesForMe.length === 0 ? (
              <div
                style={{
                  ...styles.card,
                  background: "#09090b",
                  borderColor: "#27272a",
                }}
              >
                <strong>Nog geen status ingevuld</strong>
                <p style={styles.subtle}>
                  Teams hebben dit dossier nog niet beoordeeld. Zodra ze een
                  status kiezen, zie je hier de verdeling.
                </p>
              </div>
            ) : (
              statusSegments.map((segment) => (
                <div
                  key={segment.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "9px 0",
                    borderBottom: "1px solid #27272a",
                  }}
                >
                  <span>{segment.label}</span>
                  <strong>{segment.count} groep(en)</strong>
                </div>
              ))
            )}
          </div>

          <div style={styles.card}>
            <h2>📝 Recente onderzoeksnotities</h2>
            <p style={styles.subtle}>
              De drie nieuwste notities als preview. Klik open voor de volledige
              tekst.
            </p>

            {recentNotesForMe.length > 0 ? (
              recentNotesForMe.map((note) =>
                renderSuspectNotePreview(note, { compact: true })
              )
            ) : (
              <div
                style={{
                  ...styles.card,
                  background: "#09090b",
                  borderColor: "#27272a",
                }}
              >
                <strong>Nog geen recente notities</strong>
                <p style={styles.subtle}>
                  De nieuwste drie notities komen hier automatisch als preview
                  te staan zodra groepen iets opslaan.
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h2>Status per groep</h2>

            {statusRows.length === 0 ? (
              <p style={styles.subtle}>Nog geen groepen zichtbaar.</p>
            ) : (
              statusRows.map(({ group, status, updatedAt }) => (
                <div
                  key={group.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                    padding: "12px 0",
                    borderBottom: "1px solid #27272a",
                  }}
                >
                  <div>
                    <strong>{group.name}</strong>
                    {updatedAt && (
                      <div style={styles.subtle}>
                        Bijgewerkt: {formatDate(updatedAt)}
                      </div>
                    )}
                  </div>

                  <div>{StatusBadge({ status })}</div>
                </div>
              ))
            )}
          </div>

          <div style={styles.card}>
            <h2>Gekochte aanwijzingen over dit dossier</h2>

            {boughtCluesForMe.length === 0 ? (
              <div
                style={{
                  ...styles.card,
                  background: "#09090b",
                  borderColor: "#27272a",
                }}
              >
                <strong>Nog geen gekochte aanwijzingen</strong>
                <p style={styles.subtle}>
                  Als teams aanwijzingen rond dit dossier kopen of krijgen,
                  verschijnen ze hier gegroepeerd in het overzicht.
                </p>
              </div>
            ) : (
              boughtCluesForMe.map((purchase) => {
                const clue =
                  purchase.clues ||
                  clues.find((item) => item.id === purchase.clue_id);

                return (
                  <div
                    key={purchase.id}
                    style={{
                      ...styles.card,
                      background: "#09090b",
                      borderColor: "#27272a",
                    }}
                  >
                    <strong>🔎 {clue?.title || "Onbekende aanwijzing"}</strong>

                    <div>
                      <span style={styles.badge}>
                        📁 {purchase.groups?.name || "Onbekende groep"}
                      </span>

                      {clue?.price !== undefined && (
                        <span style={styles.badge}>💰 {clue.price}</span>
                      )}
                    </div>

                    {purchase.purchased_at && (
                      <div style={styles.subtle}>
                        Gekocht op: {formatDate(purchase.purchased_at)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h2>Notities in dit dossier</h2>
          <p style={styles.subtle}>
            Hier verschijnen de observaties, verdenkingen en losse theorieën die
            de teams bij dit dossier bewaren.
          </p>

          {notesForMe.length === 0 ? (
            <div
              style={{
                ...styles.card,
                background: "#09090b",
                borderColor: "#27272a",
              }}
            >
              <strong>Nog geen dossiernotities</strong>
              <p style={styles.subtle}>
                Zodra een groep iets in dit dossier noteert, verschijnt het
                hier.
              </p>
            </div>
          ) : (
            Object.entries(
              groupNotesBy(notesForMe, (note) => note.group_id)
            ).map(([groupId, notes]) => {
              const group =
                groups.find((g) => g.id === groupId) || notes[0]?.groups;

              const sortedNotes = [...notes].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
              );

              return (
                <div key={groupId} style={styles.card}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>
                        📁 {group?.name || "Onbekende groep"}
                      </h3>
                      <div style={styles.subtle}>
                        {sortedNotes.length} notitie(s) in dit dossier
                      </div>
                    </div>
                  </div>

                  {sortedNotes.map((note) => renderSuspectNotePreview(note))}
                </div>
              );
            })
          )}
        </div>

        {MessageBlock()}
        {ImageModal()}
      </div>
    </div>
  );
}
