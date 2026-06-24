import React from "react";

export default function ParticipantSuspectsPanel({ ctx }) {
  const {
    supabase,
    styles,
    formatDate,
    profile,
    myGroup,
    suspects,
    suspectNotes,
    suspectStatuses,
    selectedParticipantSuspect,
    setSelectedParticipantSuspect,
    selectedNoteSuspect,
    setSelectedNoteSuspect,
    newNote,
    setNewNote,
    editingNoteId,
    editNoteText,
    setEditNoteText,
    setImageModal,
    setError,
    setMessage,
    loadAppData,
    StatusBadge,
    startEditNote,
    saveEditNote,
    cancelEditNote,
    deleteNote,
  } = ctx;

  const activeSuspects = suspects.filter((s) => s.is_active);
  const selectedSuspect =
    activeSuspects.find(
      (suspect) => suspect.id === selectedParticipantSuspect
    ) ||
    activeSuspects[0] ||
    null;
  const visibleSuspectDossiers = selectedSuspect ? [selectedSuspect] : [];

  const statusCounts = suspectStatuses.reduce(
    (result, item) => ({
      ...result,
      [item.status || "unknown"]: (result[item.status || "unknown"] || 0) + 1,
    }),
    { suspect: 0, doubt: 0, excluded: 0, unknown: 0 }
  );
  const missingStatusCount = Math.max(
    activeSuspects.length - suspectStatuses.length,
    0
  );
  const selectedNotesCount = selectedSuspect
    ? suspectNotes.filter((note) => note.suspect_id === selectedSuspect.id)
        .length
    : 0;

  const getNotesForSuspect = (suspectId) => {
    return suspectNotes
      .filter((note) => note.suspect_id === suspectId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  const getStatusForSuspect = (suspectId) => {
    return suspectStatuses.find(
      (item) => item.group_id === myGroup?.id && item.suspect_id === suspectId
    );
  };

  const saveStatusForSuspect = async (suspectId, status) => {
    setError("");
    setMessage("");

    if (!myGroup) {
      setError("Je bent nog niet aan een groep gekoppeld.");
      return;
    }

    const { error } = await supabase.from("suspect_statuses").upsert(
      {
        group_id: myGroup.id,
        suspect_id: suspectId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id,suspect_id" }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Status opgeslagen.");
    await loadAppData(profile);
  };

  const addNoteForSuspect = async (suspectId) => {
    setError("");
    setMessage("");

    if (!myGroup) {
      setError("Je bent nog niet aan een groep gekoppeld.");
      return;
    }

    if (!newNote.trim()) {
      setError("Vul een notitie in.");
      return;
    }

    const { error } = await supabase.from("suspect_notes").insert({
      group_id: myGroup.id,
      suspect_id: suspectId,
      user_id: profile.id,
      note: newNote.trim(),
    });

    if (error) {
      setError(error.message);
      return;
    }

    setSelectedNoteSuspect("");
    setNewNote("");
    setMessage("Notitie opgeslagen.");
    await loadAppData(profile);
  };

  return (
    <>
      <div style={styles.card}>
        <h2>Verdachten</h2>

        <p style={styles.subtle}>
          Kies een verdachte en werk direct in één dossier met status, profiel
          en notities.
        </p>

        {activeSuspects.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <strong>Dossier kiezen</strong>
            <select
              style={{ ...styles.select, marginTop: 8 }}
              value={selectedSuspect?.id || ""}
              onChange={(e) => setSelectedParticipantSuspect(e.target.value)}
            >
              {activeSuspects.map((suspect) => (
                <option key={suspect.id} value={suspect.id}>
                  {suspect.name}
                </option>
              ))}
            </select>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {activeSuspects.map((suspect) => (
                <button
                  key={suspect.id}
                  type="button"
                  style={
                    selectedSuspect?.id === suspect.id
                      ? { ...styles.button, padding: "8px 11px" }
                      : { ...styles.buttonSecondary, padding: "8px 11px" }
                  }
                  onClick={() => setSelectedParticipantSuspect(suspect.id)}
                >
                  {suspect.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
        >
          <span style={styles.badge}>📝 {suspectNotes.length} notitie(s)</span>
          <span style={styles.badge}>
            🏷️ {suspectStatuses.length} status(sen)
          </span>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <strong>Verdachten beoordeeld</strong>
          <div style={{ ...styles.statNumber, fontSize: 34 }}>
            {suspectStatuses.length}/{activeSuspects.length}
          </div>
          <div style={styles.subtle}>
            {missingStatusCount === 0
              ? "Alle actieve verdachten hebben een status."
              : `${missingStatusCount} verdachte(n) nog zonder status.`}
          </div>
        </div>

        <div style={styles.card}>
          <strong>Verdacht / twijfel / uitgesloten</strong>
          <div style={styles.subtle}>
            Verdacht: {statusCounts.suspect || 0} · Twijfel:{" "}
            {statusCounts.doubt || 0} · Uitgesloten:{" "}
            {statusCounts.excluded || 0}
          </div>
        </div>

        <div style={styles.card}>
          <strong>Huidig dossier</strong>
          <div style={{ ...styles.statNumber, fontSize: 34 }}>
            {selectedNotesCount}
          </div>
          <div style={styles.subtle}>Notitie(s) bij deze verdachte</div>
        </div>
      </div>

      {activeSuspects.length === 0 ? (
        <div
          style={{
            ...styles.card,
            background: "#09090b",
            borderColor: "#27272a",
          }}
        >
          <strong>Nog geen actieve verdachten</strong>
          <p style={styles.subtle}>
            De organisatie moet eerst verdachten actief zetten. Daarna kunnen
            jullie hier statussen en notities bijhouden.
          </p>
        </div>
      ) : (
        visibleSuspectDossiers.map((suspect) => {
          const statusRecord = getStatusForSuspect(suspect.id);
          const notesForSuspect = getNotesForSuspect(suspect.id);
          const isAddingNote = selectedNoteSuspect === suspect.id;

          return (
            <div key={suspect.id} style={styles.card}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  {suspect.photo_url ? (
                    <img
                      src={suspect.photo_url}
                      alt={suspect.name}
                      style={{
                        ...styles.img,
                        width: 82,
                        height: 82,
                        marginBottom: 0,
                      }}
                      onClick={() =>
                        setImageModal({
                          src: suspect.photo_url,
                          alt: suspect.name,
                        })
                      }
                    />
                  ) : (
                    <div
                      style={{
                        width: 82,
                        height: 82,
                        borderRadius: 12,
                        border: "1px solid #52525b",
                        background: "#09090b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                      }}
                    >
                      🕵️
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 6 }}>
                    {suspect.name}
                  </h3>

                  <div style={{ marginBottom: 8 }}>
                    {StatusBadge({
                      status: statusRecord?.status || "unknown",
                    })}
                    <span style={styles.badge}>
                      📝 {notesForSuspect.length} notitie(s)
                    </span>
                  </div>

                  {suspect.description && (
                    <details style={{ marginTop: 10 }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          border: "1px solid #3f3f46",
                          borderRadius: 999,
                          background: "#18181b",
                          width: "fit-content",
                        }}
                      >
                        Profiel bekijken
                      </summary>

                      <div
                        style={{
                          ...styles.subtle,
                          marginTop: 10,
                          padding: 10,
                          border: "1px solid #27272a",
                          borderRadius: 12,
                          background: "#09090b",
                        }}
                      >
                        {suspect.description}
                      </div>
                    </details>
                  )}
                </div>
              </div>

              <div style={styles.card}>
                <strong>Status</strong>
                <p style={styles.subtle}>
                  Kies wat jullie nú denken. Dit mag later gewoon aangepast
                  worden als nieuwe aanwijzingen het spoor veranderen.
                </p>

                <div style={{ marginTop: 10 }}>
                  <button
                    style={
                      statusRecord?.status === "suspect"
                        ? styles.button
                        : styles.buttonSecondary
                    }
                    onClick={() => saveStatusForSuspect(suspect.id, "suspect")}
                  >
                    Verdacht
                  </button>

                  <button
                    style={
                      statusRecord?.status === "doubt"
                        ? styles.button
                        : styles.buttonSecondary
                    }
                    onClick={() => saveStatusForSuspect(suspect.id, "doubt")}
                  >
                    Twijfel
                  </button>

                  <button
                    style={
                      statusRecord?.status === "excluded"
                        ? styles.button
                        : styles.buttonSecondary
                    }
                    onClick={() => saveStatusForSuspect(suspect.id, "excluded")}
                  >
                    Uitgesloten
                  </button>

                  <button
                    style={
                      !statusRecord || statusRecord.status === "unknown"
                        ? styles.button
                        : styles.buttonSecondary
                    }
                    onClick={() => saveStatusForSuspect(suspect.id, "unknown")}
                  >
                    Onbekend
                  </button>
                </div>
              </div>

              <div style={styles.card}>
                <strong>Notities</strong>
                <p style={styles.subtle}>
                  Korte observaties werken het best: alibi, vreemd gedrag,
                  tegenstrijdigheid of link met een aanwijzing.
                </p>

                {notesForSuspect.length === 0 ? (
                  <div
                    style={{
                      ...styles.card,
                      background: "#09090b",
                      borderColor: "#27272a",
                    }}
                  >
                    <strong>Nog geen notities over deze verdachte</strong>
                    <p style={styles.subtle}>
                      Leg hier korte observaties, alibi-twijfels of losse
                      theorieën vast. Dan blijft jullie spoor later terug te
                      vinden.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 10,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {notesForSuspect.map((note, index) => (
                      <div key={note.id} style={{ marginBottom: 12 }}>
                        {index > 0 && (
                          <div
                            style={{
                              borderTop: "1px solid #27272a",
                              margin: "10px 0",
                            }}
                          />
                        )}

                        {editingNoteId === note.id ? (
                          <>
                            <textarea
                              style={styles.textarea}
                              value={editNoteText}
                              onChange={(e) => setEditNoteText(e.target.value)}
                            />

                            <button
                              style={styles.button}
                              onClick={saveEditNote}
                            >
                              Opslaan
                            </button>

                            <button
                              style={styles.buttonSecondary}
                              onClick={cancelEditNote}
                            >
                              Annuleren
                            </button>
                          </>
                        ) : (
                          <>
                            <div>{note.note}</div>

                            <div style={styles.subtle}>
                              {note.profiles?.display_name ||
                                note.profiles?.email ||
                                "onbekend"}{" "}
                              · {formatDate(note.created_at)}
                            </div>

                            {note.user_id === profile?.id && (
                              <div style={{ marginTop: 8 }}>
                                <button
                                  style={styles.buttonSecondary}
                                  onClick={() => startEditNote(note)}
                                >
                                  Bewerken
                                </button>

                                <button
                                  style={styles.buttonDanger}
                                  onClick={() => deleteNote(note)}
                                >
                                  Verwijderen
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isAddingNote ? (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      style={styles.textarea}
                      placeholder={`Nieuwe notitie over ${suspect.name}`}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />

                    <button
                      style={styles.button}
                      onClick={() => addNoteForSuspect(suspect.id)}
                    >
                      Notitie opslaan
                    </button>

                    <button
                      style={styles.buttonSecondary}
                      onClick={() => {
                        setSelectedNoteSuspect("");
                        setNewNote("");
                      }}
                    >
                      Annuleren
                    </button>
                  </div>
                ) : (
                  <button
                    style={styles.buttonSecondary}
                    onClick={() => {
                      setSelectedNoteSuspect(suspect.id);
                      setNewNote("");
                    }}
                  >
                    Notitie toevoegen
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
