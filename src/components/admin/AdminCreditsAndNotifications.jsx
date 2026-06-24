import React from "react";

export default function AdminCreditsAndNotificationsPanel({ ctx }) {
  const {
    ENABLE_FINAL_REPORTS,
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
    AdminPurchasesOverview,
    AdminGroupsList,
    AdminFinalReports,
    groupNotesBy,
    AdminInterrogationPanel,
    SuspectDashboard,
    LandingPage,
    LoginScreen,
  } = ctx;

  const AdminCreditsAndNotifications = () => (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h2>Pegels beheren</h2>
        <select
          style={styles.select}
          value={creditGroup}
          onChange={(e) => setCreditGroup(e.target.value)}
        >
          <option value="">Selecteer groep</option>
          {groups
            .filter((group) => group.is_active)
            .map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
        </select>
        <input
          style={styles.input}
          type="number"
          placeholder="Aantal pegels, mag negatief zijn"
          value={creditAmount}
          onChange={(e) => setCreditAmount(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Reden"
          value={creditReason}
          onChange={(e) => setCreditReason(e.target.value)}
        />
        <button style={styles.button} onClick={giveCredits}>
          Pegels aanpassen
        </button>
        <div style={{ marginTop: 10 }}>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, 1, "Snelle correctie: +1 pegel")
            }
          >
            +1
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, 5, "Snelle correctie: +5 pegels")
            }
          >
            +5
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, 10, "Snelle correctie: +10 pegels")
            }
          >
            +10
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, -1, "Snelle correctie: -1 pegel")
            }
          >
            -1
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, -5, "Snelle correctie: -5 pegels")
            }
          >
            -5
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2>Notificatie sturen</h2>

        <div style={styles.card}>
          <strong>Ontvangers</strong>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="notificationMode"
              checked={notificationMode === "single"}
              onChange={() => setNotificationMode("single")}
            />{" "}
            Eén groep
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="notificationMode"
              checked={notificationMode === "all"}
              onChange={() => setNotificationMode("all")}
            />{" "}
            Alle actieve groepen
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="notificationMode"
              checked={notificationMode === "selection"}
              onChange={() => setNotificationMode("selection")}
            />{" "}
            Selectie van groepen
          </label>
        </div>

        {notificationMode === "single" && (
          <select
            style={styles.select}
            value={newNotificationGroup}
            onChange={(e) => setNewNotificationGroup(e.target.value)}
          >
            <option value="">Selecteer groep</option>
            {groups
              .filter((group) => group.is_active)
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </select>
        )}

        {notificationMode === "all" && (
          <div style={styles.card}>
            <strong>Alle actieve groepen</strong>
            <div style={styles.subtle}>
              Deze melding wordt naar{" "}
              {groups.filter((group) => group.is_active).length} actieve
              groep(en) gestuurd.
            </div>
          </div>
        )}

        {notificationMode === "selection" && (
          <div style={styles.card}>
            <strong>Selecteer groepen</strong>

            {groups.filter((group) => group.is_active).length === 0 ? (
              <p style={styles.subtle}>Geen actieve groepen beschikbaar.</p>
            ) : (
              groups
                .filter((group) => group.is_active)
                .map((group) => (
                  <label
                    key={group.id}
                    style={{
                      display: "block",
                      marginTop: 10,
                      padding: 10,
                      border: "1px solid #27272a",
                      borderRadius: 12,
                      background: selectedNotificationGroups.includes(group.id)
                        ? "#27272a"
                        : "#09090b",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNotificationGroups.includes(group.id)}
                      onChange={() => toggleSelectedNotificationGroup(group.id)}
                    />{" "}
                    {group.name}
                  </label>
                ))
            )}

            <div style={styles.subtle}>
              Geselecteerd: {selectedNotificationGroups.length} groep(en)
            </div>
          </div>
        )}

        <input
          style={styles.input}
          placeholder="Titel"
          value={newNotificationTitle}
          onChange={(e) => setNewNotificationTitle(e.target.value)}
        />

        <textarea
          style={styles.textarea}
          placeholder="Bericht"
          value={newNotificationMessage}
          onChange={(e) => setNewNotificationMessage(e.target.value)}
        />

        <button style={styles.button} onClick={sendNotification}>
          {notificationMode === "all"
            ? "Versturen naar alle actieve groepen"
            : notificationMode === "selection"
            ? `Versturen naar ${selectedNotificationGroups.length} groep(en)`
            : "Versturen"}
        </button>
      </div>

      {NotificationsBlock()}
      {TransactionsBlock()}
    </div>
  );

  return AdminCreditsAndNotifications();
}
