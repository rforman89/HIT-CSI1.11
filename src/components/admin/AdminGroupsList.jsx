import React from "react";

export default function AdminGroupsListPanel({ ctx }) {
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
    AdminCreditsAndNotifications,
    AdminFinalReports,
    groupNotesBy,
    AdminInterrogationPanel,
    SuspectDashboard,
    LandingPage,
    LoginScreen,
    openClueFile,
  } = ctx;

  const AdminPurchasesOverview = () => {
    const purchasesByClue = clues
      .map((clue) => {
        const purchases = groupClues
          .filter((purchase) => purchase.clue_id === clue.id)
          .map((purchase) => {
            const group =
              purchase.groups ||
              groups.find((item) => item.id === purchase.group_id);

            return { purchase, group };
          })
          .filter((item) => item.group);

        return { clue, purchases };
      })
      .filter((item) => item.purchases.length > 0)
      .sort((a, b) => a.clue.title.localeCompare(b.clue.title));

    const purchasesByGroup = groups
      .map((group) => {
        const purchases = groupClues
          .filter((purchase) => purchase.group_id === group.id)
          .map((purchase) => {
            const clue =
              purchase.clues ||
              clues.find((item) => item.id === purchase.clue_id);
            const suspect =
              clue?.suspects ||
              suspects.find((item) => item.id === clue?.suspect_id);

            return { purchase, clue, suspect };
          })
          .filter((item) => item.clue)
          .sort((a, b) => a.clue.title.localeCompare(b.clue.title));

        return { group, purchases };
      })
      .filter((item) => item.purchases.length > 0)
      .sort((a, b) => a.group.name.localeCompare(b.group.name));

    const getPurchaseMoment = (purchase) =>
      purchase.released_at ||
      purchase.requested_at ||
      purchase.purchased_at ||
      purchase.created_at ||
      "";

    return (
      <div style={styles.card}>
        <h2>📄 Aankopen per aanwijzing en groep</h2>
        <p style={styles.subtle}>
          Snel spelregie-overzicht: welke aanwijzingen zijn door welke groep
          gekocht of vrijgegeven.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <strong>Totaal gekocht/toegewezen</strong>
            <div style={styles.statNumber}>{groupClues.length}</div>
          </div>
          <div style={styles.card}>
            <strong>Aanwijzingen met kopers</strong>
            <div style={styles.statNumber}>{purchasesByClue.length}</div>
          </div>
          <div style={styles.card}>
            <strong>Groepen met aankopen</strong>
            <div style={styles.statNumber}>{purchasesByGroup.length}</div>
          </div>
        </div>

        {groupClues.length === 0 ? (
          <p style={styles.subtle}>
            Nog geen aanwijzingen gekocht of vrijgegeven.
          </p>
        ) : (
          <div style={styles.grid}>
            <div style={styles.card}>
              <h3>Per aanwijzing</h3>

              {purchasesByClue.map(({ clue, purchases }) => {
                const suspectName =
                  clue.suspects?.name ||
                  suspects.find((item) => item.id === clue.suspect_id)?.name ||
                  "Algemeen";

                return (
                  <div key={clue.id} style={styles.card}>
                    <strong>{clue.title}</strong>
                    <div>
                      <span style={styles.badge}>🕵️ {suspectName}</span>
                      <span style={styles.badge}>
                        👥 {purchases.length} groep(en)
                      </span>
                      {clue.price !== undefined && (
                        <span style={styles.badge}>💰 {clue.price}</span>
                      )}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      {purchases.map(({ purchase, group }) => (
                        <span key={purchase.id} style={styles.badge}>
                          {group.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.card}>
              <h3>Per groep</h3>

              {purchasesByGroup.map(({ group, purchases }) => (
                <div key={group.id} style={styles.card}>
                  <strong>{group.name}</strong>
                  <div>
                    <span style={styles.badge}>
                      📄 {purchases.length} aanwijzing(en)
                    </span>
                    <span style={styles.badge}>
                      💰 {group.credits} pegels over
                    </span>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    {purchases.map(({ purchase, clue, suspect }) => (
                      <div
                        key={purchase.id}
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid #27272a",
                        }}
                      >
                        <strong>{clue.title}</strong>
                        <div>
                          <span style={styles.badge}>
                            🕵️ {suspect?.name || "Algemeen"}
                          </span>
                          {purchase.status && (
                            <span style={styles.badge}>{purchase.status}</span>
                          )}
                          {purchase.source && (
                            <span style={styles.badge}>{purchase.source}</span>
                          )}
                        </div>
                        {getPurchaseMoment(purchase) && (
                          <div style={styles.subtle}>
                            {formatDate(getPurchaseMoment(purchase))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const AdminGroupsList = () => (
    <>
      {AdminPurchasesOverview()}

      <div style={styles.card}>
        <h2>Groepen & gekochte aanwijzingen</h2>

        {groups.length === 0 ? (
          <p style={styles.subtle}>Nog geen groepen.</p>
        ) : (
          groups.map((g) => {
            const members = memberships.filter((m) => m.group_id === g.id);
            const bought = groupClues.filter((c) => c.group_id === g.id);

            return (
              <div key={g.id} style={styles.card}>
                {editingGroupId === g.id ? (
                  <div>
                    <h3 style={{ marginTop: 0 }}>Groep bewerken</h3>

                    <input
                      style={styles.input}
                      placeholder="Groepsnaam"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                    />

                    <button style={styles.button} onClick={saveEditGroup}>
                      Opslaan
                    </button>

                    <button
                      style={styles.buttonSecondary}
                      onClick={cancelEditGroup}
                    >
                      Annuleren
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 style={{ marginTop: 0 }}>{g.name}</h3>

                    <button
                      style={styles.buttonSecondary}
                      onClick={() => startEditGroup(g)}
                    >
                      Groepsnaam bewerken
                    </button>
                  </>
                )}

                <span style={styles.badge}>💰 {g.credits} pegels</span>
                <span style={styles.badge}>👥 {members.length} leden</span>
                <span style={styles.badge}>📄 {bought.length} gekocht</span>
                {g.is_active ? (
                  <span style={styles.badge}>Actief</span>
                ) : (
                  <span style={styles.badge}>Inactief</span>
                )}

                <div style={{ marginTop: 10 }}>
                  <button
                    style={styles.buttonSecondary}
                    onClick={() => toggleGroupActive(g)}
                  >
                    {g.is_active
                      ? "Groep inactief zetten"
                      : "Groep actief zetten"}
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Leden</strong>

                  {members.length === 0 ? (
                    <div style={styles.subtle}>Geen leden gekoppeld.</div>
                  ) : (
                    members.map((m) => {
                      const p = profiles.find((x) => x.id === m.user_id);

                      return (
                        <div key={m.id} style={styles.card}>
                          <strong>
                            {p?.display_name || p?.email || m.user_id}
                          </strong>
                          {p?.email && (
                            <div style={styles.subtle}>{p.email}</div>
                          )}

                          <button
                            style={styles.buttonDanger}
                            onClick={() => removeUserFromGroup(m)}
                          >
                            Verwijderen uit groep
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <strong>Gekochte aanwijzingen</strong>

                  {bought.length === 0 ? (
                    <div style={styles.subtle}>
                      Nog geen aanwijzingen gekocht.
                    </div>
                  ) : (
                    bought.map((purchase) => {
                      const clue =
                        purchase.clues ||
                        clues.find((item) => item.id === purchase.clue_id);

                      const suspectName =
                        clue?.suspects?.name ||
                        suspects.find((s) => s.id === clue?.suspect_id)?.name ||
                        "Algemeen";

                      return (
                        <div key={purchase.id} style={styles.card}>
                          <strong>
                            {clue?.title || "Onbekende aanwijzing"}
                          </strong>

                          <div>
                            <span style={styles.badge}>🕵️ {suspectName}</span>
                            {clue?.price !== undefined && (
                              <span style={styles.badge}>💰 {clue.price}</span>
                            )}
                          </div>

                          {(purchase.released_at ||
                            purchase.requested_at ||
                            purchase.purchased_at ||
                            purchase.created_at) && (
                            <div style={styles.subtle}>
                              Moment:{" "}
                              {formatDate(
                                purchase.released_at ||
                                  purchase.requested_at ||
                                  purchase.purchased_at ||
                                  purchase.created_at
                              )}
                            </div>
                          )}

                          {(clue?.file_url || clue?.pdf_url) && (
                            <div style={{ marginTop: 8 }}>
                              <button
                                type="button"
                                onClick={() =>
                                  openClueFile(clue.file_url || clue.pdf_url)
                                }
                                style={{
                                  ...styles.link,
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                }}
                              >
                                Bestand openen
                              </button>
                            </div>
                          )}
                          <div style={{ marginTop: 10 }}>
                            <button
                              style={styles.buttonDanger}
                              onClick={() => removeGroupClue(purchase)}
                            >
                              {gameMode === "test"
                                ? "Verwijderen bij groep"
                                : "Verwijderen geblokkeerd live"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return AdminGroupsList();
}
