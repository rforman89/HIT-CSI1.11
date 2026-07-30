import React from "react";

export default function AdminClues({ ctx }) {
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
    openClueFile,
  } = ctx;

  return (
    <>
      <div style={styles.card}>
        <h2>Aanwijzingcategorieën</h2>
        <p style={styles.subtle}>
          Maak hier verhaalafhankelijke categorieën zoals Alibichecks,
          Getuigenverklaringen of Financieel onderzoek. Deelnemers zien
          aanwijzingen automatisch gegroepeerd per categorie.
        </p>

        <input
          style={styles.input}
          placeholder="Nieuwe categorie, bijvoorbeeld Alibichecks"
          value={newClueCategoryName}
          onChange={(e) => setNewClueCategoryName(e.target.value)}
        />
        <button style={styles.button} onClick={createClueCategory}>
          Categorie toevoegen
        </button>

        {clueCategories.length === 0 ? (
          <p style={styles.subtle}>
            Nog geen categorieën. Zonder categorie gebruikt de app tijdelijk
            algemene groepen zoals Gratis, Algemeen en Verdachte aanwijzingen.
          </p>
        ) : (
          clueCategories.map((category) => (
            <div key={category.id} style={styles.card}>
              {editingCategoryId === category.id ? (
                <>
                  <input
                    style={styles.input}
                    value={editClueCategoryName}
                    onChange={(e) => setEditClueCategoryName(e.target.value)}
                  />
                  <button style={styles.button} onClick={saveEditClueCategory}>
                    Opslaan
                  </button>
                  <button
                    style={styles.buttonSecondary}
                    onClick={cancelEditClueCategory}
                  >
                    Annuleren
                  </button>
                </>
              ) : (
                <>
                  <strong>📂 {category.name}</strong>
                  <span style={styles.badge}>
                    {category.is_active ? "Actief" : "Verborgen"}
                  </span>
                  <div style={{ marginTop: 10 }}>
                    <button
                      style={styles.buttonSecondary}
                      onClick={() => startEditClueCategory(category)}
                    >
                      Bewerken
                    </button>
                    <button
                      style={styles.buttonSecondary}
                      onClick={() => toggleClueCategoryActive(category)}
                    >
                      {category.is_active ? "Verbergen" : "Actief maken"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <h2>Aanwijzing toevoegen</h2>
        <input
          style={styles.input}
          placeholder="Titel"
          value={newClueTitle}
          onChange={(e) => setNewClueTitle(e.target.value)}
        />
        <textarea
          style={styles.textarea}
          placeholder="Omschrijving"
          value={newClueDescription}
          onChange={(e) => setNewClueDescription(e.target.value)}
        />
        <select
          style={styles.select}
          value={newClueSuspect}
          onChange={(e) => setNewClueSuspect(e.target.value)}
        >
          <option value="">Geen verdachte / algemeen</option>
          {suspects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          style={styles.select}
          value={newClueCategory}
          onChange={(e) => setNewClueCategory(e.target.value)}
        >
          <option value="">Geen categorie / automatisch</option>
          {clueCategories
            .filter((category) => category.is_active)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
        <input
          style={styles.input}
          type="number"
          placeholder="Prijs"
          value={newCluePrice}
          onChange={(e) => setNewCluePrice(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={newClueIsFree}
            onChange={(e) => setNewClueIsFree(e.target.checked)}
          />{" "}
          Gratis
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={newClueIsGlobal}
            onChange={(e) => setNewClueIsGlobal(e.target.checked)}
          />{" "}
          Voor iedereen direct zichtbaar
        </label>
        <br />
        <br />
        <input style={styles.input} type="file" id="clue-file" />
        <button
          style={styles.button}
          onClick={() => {
            const file = document.getElementById("clue-file")?.files?.[0];
            createClue(file);
          }}
        >
          Aanwijzing toevoegen
        </button>
      </div>
      <div style={styles.card}>
        <h2>Aanwijzing handmatig toewijzen</h2>

        <p style={styles.subtle}>
          Geef een aanwijzing gratis aan één groep, alle actieve groepen of een
          selectie van groepen. Groepen die deze aanwijzing al hebben worden
          automatisch overgeslagen.
        </p>

        <select
          style={styles.select}
          value={manualClueId}
          onChange={(e) => setManualClueId(e.target.value)}
        >
          <option value="">Selecteer aanwijzing</option>
          {clues.map((clue) => (
            <option key={clue.id} value={clue.id}>
              {clue.title}
            </option>
          ))}
        </select>

        <div style={styles.card}>
          <strong>Ontvangers</strong>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="manualClueMode"
              checked={manualClueMode === "single"}
              onChange={() => setManualClueMode("single")}
            />{" "}
            Eén groep
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="manualClueMode"
              checked={manualClueMode === "all"}
              onChange={() => setManualClueMode("all")}
            />{" "}
            Alle actieve groepen
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="manualClueMode"
              checked={manualClueMode === "selection"}
              onChange={() => setManualClueMode("selection")}
            />{" "}
            Selectie van groepen
          </label>
        </div>

        {manualClueMode === "single" && (
          <select
            style={styles.select}
            value={manualClueGroup}
            onChange={(e) => setManualClueGroup(e.target.value)}
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

        {manualClueMode === "all" && (
          <div style={styles.card}>
            <strong>Alle actieve groepen</strong>
            <div style={styles.subtle}>
              Deze aanwijzing wordt toegewezen aan maximaal{" "}
              {groups.filter((group) => group.is_active).length} actieve
              groep(en). Groepen die de aanwijzing al hebben worden
              overgeslagen.
            </div>
          </div>
        )}

        {manualClueMode === "selection" && (
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
                      background: selectedManualClueGroups.includes(group.id)
                        ? "#27272a"
                        : "#09090b",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedManualClueGroups.includes(group.id)}
                      onChange={() => toggleSelectedManualClueGroup(group.id)}
                    />{" "}
                    {group.name}
                  </label>
                ))
            )}

            <div style={styles.subtle}>
              Geselecteerd: {selectedManualClueGroups.length} groep(en)
            </div>
          </div>
        )}

        <button style={styles.button} onClick={assignClueToGroup}>
          {manualClueMode === "all"
            ? "Aanwijzing toewijzen aan alle actieve groepen"
            : manualClueMode === "selection"
            ? `Aanwijzing toewijzen aan ${selectedManualClueGroups.length} groep(en)`
            : "Aanwijzing toewijzen"}
        </button>
      </div>

      <div style={styles.card}>
        <h2>Alle aanwijzingen beheren</h2>

        {clues.length === 0 ? (
          <p style={styles.subtle}>Nog geen aanwijzingen.</p>
        ) : (
          groupCluesByCategory(clues).map((category) => (
            <details key={category.key} open style={styles.card}>
              <summary
                style={{ cursor: "pointer", fontWeight: 800, fontSize: 18 }}
              >
                📂 {category.name} ({category.clues.length})
              </summary>

              <div style={{ marginTop: 12 }}>
                {category.clues.map((clue) => (
                  <div key={clue.id} style={styles.card}>
                    {editingClueId === clue.id ? (
                      <>
                        <h3>Aanwijzing bewerken</h3>

                        <input
                          style={styles.input}
                          placeholder="Titel"
                          value={editClueTitle}
                          onChange={(e) => setEditClueTitle(e.target.value)}
                        />

                        <textarea
                          style={styles.textarea}
                          placeholder="Omschrijving"
                          value={editClueDescription}
                          onChange={(e) =>
                            setEditClueDescription(e.target.value)
                          }
                        />

                        <select
                          style={styles.select}
                          value={editClueSuspect}
                          onChange={(e) => setEditClueSuspect(e.target.value)}
                        >
                          <option value="">Geen verdachte / algemeen</option>
                          {suspects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>

                        <select
                          style={styles.select}
                          value={editClueCategory}
                          onChange={(e) => setEditClueCategory(e.target.value)}
                        >
                          <option value="">Geen categorie / automatisch</option>
                          {clueCategories
                            .filter((category) => category.is_active)
                            .map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                        </select>

                        <input
                          style={styles.input}
                          type="number"
                          placeholder="Prijs"
                          value={editCluePrice}
                          onChange={(e) => setEditCluePrice(e.target.value)}
                        />

                        <label>
                          <input
                            type="checkbox"
                            checked={editClueIsFree}
                            onChange={(e) =>
                              setEditClueIsFree(e.target.checked)
                            }
                          />{" "}
                          Gratis
                        </label>

                        <br />

                        <label>
                          <input
                            type="checkbox"
                            checked={editClueIsGlobal}
                            onChange={(e) =>
                              setEditClueIsGlobal(e.target.checked)
                            }
                          />{" "}
                          Voor iedereen direct zichtbaar
                        </label>

                        <br />

                        <label>
                          <input
                            type="checkbox"
                            checked={editClueIsVisible}
                            onChange={(e) =>
                              setEditClueIsVisible(e.target.checked)
                            }
                          />{" "}
                          Zichtbaar
                        </label>

                        <br />
                        <br />

                        <div style={styles.card}>
                          <strong>Bestand vervangen</strong>

                          <p style={styles.subtle}>
                            Kies alleen een nieuw bestand als je het bestaande
                            bestand wilt vervangen. Laat dit leeg om het huidige
                            bestand te behouden.
                          </p>

                          {clue.file_url || clue.pdf_url ? (
                            <div style={{ marginBottom: 10 }}>
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
                                Huidig bestand openen
                              </button>
                            </div>
                          ) : (
                            <div style={styles.subtle}>
                              Er is nog geen bestand gekoppeld.
                            </div>
                          )}

                          <input
                            style={styles.input}
                            type="file"
                            ref={editClueFileRef}
                          />
                        </div>

                        <button style={styles.button} onClick={saveEditClue}>
                          Opslaan
                        </button>

                        <button
                          style={styles.buttonSecondary}
                          onClick={cancelEditClue}
                        >
                          Annuleren
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 style={{ marginTop: 0 }}>{clue.title}</h3>

                        {clue.suspects?.name && (
                          <span style={styles.badge}>
                            🕵️ {clue.suspects.name}
                          </span>
                        )}

                        <span style={styles.badge}>
                          📂 {getClueCategoryName(clue)}
                        </span>
                        <span style={styles.badge}>💰 {clue.price}</span>
                        {clue.is_free && (
                          <span style={styles.badge}>Gratis</span>
                        )}
                        {clue.is_global && (
                          <span style={styles.badge}>Global</span>
                        )}
                        {clue.is_visible ? (
                          <span style={styles.badge}>Zichtbaar</span>
                        ) : (
                          <span style={styles.badge}>Verborgen</span>
                        )}

                        <p>{clue.description}</p>

                        {(clue.file_url || clue.pdf_url) && (
                          <div style={{ marginBottom: 10 }}>
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

                        <button
                          style={styles.buttonSecondary}
                          onClick={() => startEditClue(clue)}
                        >
                          Bewerken
                        </button>

                        <button
                          style={styles.buttonSecondary}
                          onClick={() => toggleClueVisible(clue)}
                        >
                          {clue.is_visible ? "Verbergen" : "Zichtbaar maken"}
                        </button>

                        <button
                          style={styles.buttonDanger}
                          onClick={() => deleteClue(clue)}
                        >
                          Verwijderen
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))
        )}
      </div>
    </>
  );
}
