import React from "react";

export default function AdminManagePanel({ ctx }) {
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
    AdminPurchasesOverview,
    AdminGroupsList,
    AdminFinalReports,
    groupNotesBy,
    AdminInterrogationPanel,
    SuspectDashboard,
    LandingPage,
    LoginScreen,
  } = ctx;

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h2>Nieuwe groep</h2>
        <input
          style={styles.input}
          placeholder="Groepsnaam"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <button style={styles.button} onClick={createGroup}>
          Groep maken
        </button>

        <h2>Gebruiker koppelen aan groep</h2>
        <select
          style={styles.select}
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">Selecteer gebruiker</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name || p.email} ({p.email})
            </option>
          ))}
        </select>

        <select
          style={styles.select}
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
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

        <button style={styles.button} onClick={addUserToGroup}>
          Toevoegen
        </button>
        <h2>Suspect-account koppelen</h2>

        <p style={styles.subtle}>
          Koppel een gebruiker met rol suspect aan een verdachte. Deze gebruiker
          krijgt daarna een eigen verdachte-dashboard.
        </p>

        <select
          style={styles.select}
          value={selectedSuspectUser}
          onChange={(e) => setSelectedSuspectUser(e.target.value)}
        >
          <option value="">Selecteer suspect-gebruiker</option>
          {profiles
            .filter((p) => p.role === "suspect")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name || p.email} ({p.email})
              </option>
            ))}
        </select>

        <select
          style={styles.select}
          value={selectedProfileSuspect}
          onChange={(e) => setSelectedProfileSuspect(e.target.value)}
        >
          <option value="">Selecteer verdachte</option>
          {suspects.map((suspect) => (
            <option key={suspect.id} value={suspect.id}>
              {suspect.name}
            </option>
          ))}
        </select>

        <button style={styles.button} onClick={linkUserToSuspect}>
          Suspect koppelen
        </button>

        <div style={{ marginTop: 12 }}>
          <strong>Gekoppelde suspect-accounts</strong>

          {profiles.filter((p) => p.role === "suspect").length === 0 ? (
            <div style={styles.subtle}>Nog geen suspect-gebruikers.</div>
          ) : (
            profiles
              .filter((p) => p.role === "suspect")
              .map((p) => {
                const linkedSuspect = suspects.find(
                  (s) => s.id === p.suspect_id
                );

                return (
                  <div key={p.id} style={styles.card}>
                    <strong>{p.display_name || p.email}</strong>
                    <div style={styles.subtle}>{p.email}</div>
                    <span style={styles.badge}>
                      {linkedSuspect
                        ? `Gekoppeld aan: ${linkedSuspect.name}`
                        : "Nog niet gekoppeld"}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2>Verdachte toevoegen</h2>
        <input
          style={styles.input}
          placeholder="Naam verdachte"
          value={newSuspectName}
          onChange={(e) => setNewSuspectName(e.target.value)}
        />
        <textarea
          style={styles.textarea}
          placeholder="Omschrijving"
          value={newSuspectDescription}
          onChange={(e) => setNewSuspectDescription(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Foto URL, optioneel"
          value={newSuspectPhotoUrl}
          onChange={(e) => setNewSuspectPhotoUrl(e.target.value)}
        />
        <input
          style={styles.input}
          type="file"
          id="suspect-file"
          accept="image/*"
        />
        <button
          style={styles.button}
          onClick={() => {
            const file = document.getElementById("suspect-file")?.files?.[0];
            createSuspect(file);
          }}
        >
          Verdachte toevoegen
        </button>
        <div style={{ marginTop: 18 }}>
          <h3>Verdachten beheren</h3>

          {suspects.length === 0 ? (
            <p style={styles.subtle}>Nog geen verdachten.</p>
          ) : (
            suspects.map((suspect) => (
              <div key={suspect.id} style={styles.card}>
                {editingSuspectId === suspect.id ? (
                  <>
                    <h3>Verdachte bewerken</h3>

                    <input
                      style={styles.input}
                      placeholder="Naam verdachte"
                      value={editSuspectName}
                      onChange={(e) => setEditSuspectName(e.target.value)}
                    />

                    <textarea
                      style={styles.textarea}
                      placeholder="Omschrijving"
                      value={editSuspectDescription}
                      onChange={(e) =>
                        setEditSuspectDescription(e.target.value)
                      }
                    />

                    <input
                      style={styles.input}
                      placeholder="Foto URL"
                      value={editSuspectPhotoUrl}
                      onChange={(e) => setEditSuspectPhotoUrl(e.target.value)}
                    />

                    <div style={styles.card}>
                      <strong>Foto vervangen</strong>

                      <p style={styles.subtle}>
                        Kies alleen een nieuw bestand als je de bestaande foto
                        wilt vervangen. Laat dit leeg om de huidige foto of
                        foto-URL te behouden.
                      </p>

                      {suspect.photo_url ? (
                        <div style={{ marginBottom: 10 }}>
                          {SuspectImage({
                            src: suspect.photo_url,
                            alt: suspect.name,
                          })}
                        </div>
                      ) : (
                        <div style={styles.subtle}>
                          Er is nog geen foto gekoppeld.
                        </div>
                      )}

                      <input
                        style={styles.input}
                        type="file"
                        accept="image/*"
                        ref={editSuspectFileRef}
                      />
                    </div>

                    <button style={styles.button} onClick={saveEditSuspect}>
                      Opslaan
                    </button>

                    <button
                      style={styles.buttonSecondary}
                      onClick={cancelEditSuspect}
                    >
                      Annuleren
                    </button>
                  </>
                ) : (
                  <>
                    {SuspectImage({
                      src: suspect.photo_url,
                      alt: suspect.name,
                    })}

                    <strong>{suspect.name}</strong>

                    <div style={styles.subtle}>
                      {suspect.description || "Geen omschrijving."}
                    </div>

                    {suspect.is_active ? (
                      <span style={styles.badge}>Actief</span>
                    ) : (
                      <span style={styles.badge}>Inactief</span>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <button
                        style={styles.buttonSecondary}
                        onClick={() => startEditSuspect(suspect)}
                      >
                        Bewerken
                      </button>

                      <button
                        style={styles.buttonSecondary}
                        onClick={() => toggleSuspectActive(suspect)}
                      >
                        {suspect.is_active
                          ? "Verdachte inactief zetten"
                          : "Verdachte actief zetten"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2>Agenda-item toevoegen</h2>
        <input
          style={styles.input}
          placeholder="Titel"
          value={newAgenda.title}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, title: e.target.value }))
          }
        />
        <textarea
          style={styles.textarea}
          placeholder="Omschrijving"
          value={newAgenda.description}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, description: e.target.value }))
          }
        />
        <input
          style={styles.input}
          type="datetime-local"
          value={newAgenda.starts_at}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, starts_at: e.target.value }))
          }
        />
        <input
          style={styles.input}
          type="datetime-local"
          value={newAgenda.ends_at}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, ends_at: e.target.value }))
          }
        />
        <select
          style={styles.select}
          value={newAgenda.item_type}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, item_type: e.target.value }))
          }
        >
          <option value="activity">🕵️ Activiteit</option>
          <option value="food">🍽️ Eten</option>
          <option value="credits">💰 Pegels verdienen</option>
          <option value="deadline">⏰ Deadline</option>
          <option value="free_time">💤 Vrije tijd</option>
        </select>
        <input
          style={styles.input}
          type="number"
          placeholder="Pegels te verdienen"
          value={newAgenda.credits_reward}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, credits_reward: e.target.value }))
          }
        />
        <label>
          <input
            type="checkbox"
            checked={newAgenda.is_visible}
            onChange={(e) =>
              setNewAgenda((p) => ({ ...p, is_visible: e.target.checked }))
            }
          />{" "}
          Zichtbaar voor deelnemers
        </label>
        <br />
        <br />
        <button style={styles.button} onClick={createAgendaItem}>
          Agenda-item toevoegen
        </button>
        <div style={{ marginTop: 18 }}>
          <h3>Agenda beheren</h3>

          {agendaItems.length === 0 ? (
            <p style={styles.subtle}>Nog geen agenda-items.</p>
          ) : (
            agendaItems.map((item) => (
              <div key={item.id} style={styles.card}>
                {editingAgendaId === item.id ? (
                  <>
                    <h3>Agenda-item bewerken</h3>

                    <input
                      style={styles.input}
                      placeholder="Titel"
                      value={editAgenda.title}
                      onChange={(e) =>
                        setEditAgenda((p) => ({ ...p, title: e.target.value }))
                      }
                    />

                    <textarea
                      style={styles.textarea}
                      placeholder="Omschrijving"
                      value={editAgenda.description}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                    />

                    <input
                      style={styles.input}
                      type="datetime-local"
                      value={editAgenda.starts_at}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          starts_at: e.target.value,
                        }))
                      }
                    />

                    <input
                      style={styles.input}
                      type="datetime-local"
                      value={editAgenda.ends_at}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          ends_at: e.target.value,
                        }))
                      }
                    />

                    <select
                      style={styles.select}
                      value={editAgenda.item_type}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          item_type: e.target.value,
                        }))
                      }
                    >
                      <option value="activity">🕵️ Activiteit</option>
                      <option value="food">🍽️ Eten</option>
                      <option value="credits">💰 Pegels verdienen</option>
                      <option value="deadline">⏰ Deadline</option>
                      <option value="free_time">💤 Vrije tijd</option>
                    </select>

                    <input
                      style={styles.input}
                      type="number"
                      placeholder="Pegels te verdienen"
                      value={editAgenda.credits_reward}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          credits_reward: e.target.value,
                        }))
                      }
                    />

                    <label>
                      <input
                        type="checkbox"
                        checked={editAgenda.is_visible}
                        onChange={(e) =>
                          setEditAgenda((p) => ({
                            ...p,
                            is_visible: e.target.checked,
                          }))
                        }
                      />{" "}
                      Zichtbaar voor deelnemers
                    </label>

                    <br />
                    <br />

                    <button style={styles.button} onClick={saveEditAgenda}>
                      Opslaan
                    </button>

                    <button
                      style={styles.buttonSecondary}
                      onClick={cancelEditAgenda}
                    >
                      Annuleren
                    </button>
                  </>
                ) : (
                  <>
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

                    {item.is_visible ? (
                      <span style={styles.badge}>Zichtbaar</span>
                    ) : (
                      <span style={styles.badge}>Verborgen</span>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <button
                        style={styles.buttonSecondary}
                        onClick={() => startEditAgenda(item)}
                      >
                        Bewerken
                      </button>

                      <button
                        style={styles.buttonSecondary}
                        onClick={() => toggleAgendaVisible(item)}
                      >
                        {item.is_visible ? "Verbergen" : "Zichtbaar maken"}
                      </button>

                      <button
                        style={styles.buttonDanger}
                        onClick={() => deleteAgendaItem(item)}
                      >
                        Verwijderen
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <div style={styles.card}>
        <h2>Testdata resetten</h2>

        {gameMode === "test" ? (
          <>
            <p style={styles.subtle}>
              Hiermee verwijder je gekochte aanwijzingen, notities, statussen,
              meldingen en pegel-transacties. Groepen, gebruikers, verdachten,
              agenda-items en aanwijzingen blijven bestaan.
            </p>

            <button style={styles.buttonDanger} onClick={resetTestData}>
              Reset testdata
            </button>
          </>
        ) : (
          <p style={styles.error}>
            Reset testdata is uitgeschakeld omdat het spel live staat.
          </p>
        )}
      </div>
    </div>
  );
}
