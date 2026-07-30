import React from "react";

export default function AdminInterrogationPanelComponent({ ctx }) {
  const {
    styles,
    formatDate,
    groups,
    suspects,
    clues,
    groupClues,
    suspectNotes,
    suspectStatuses,
    selectedInterrogationSuspect,
    setSelectedInterrogationSuspect,
    setImageModal,
    startEditNote,
    deleteNote,
    StatusBadge,
    openClueFile,
  } = ctx;

  const AdminInterrogationPanel = () => {
    const visibleSuspects = selectedInterrogationSuspect
      ? suspects.filter(
          (suspect) => suspect.id === selectedInterrogationSuspect
        )
      : suspects;

    return (
      <div style={styles.card}>
        <h2>🎭 CSI Verhoorkamer</h2>
        <p style={styles.subtle}>
          Gebruik dit scherm tijdens verhoren: links het verdachteprofiel,
          rechts direct wat de teams denken, noteren en kopen.
        </p>

        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <strong>🔍 Kies een verdachte</strong>
          <div style={styles.subtle}>
            Selecteer één verdachte voor focus, of toon alle verhoordossiers
            onder elkaar.
          </div>
        </div>

        <select
          style={styles.select}
          value={selectedInterrogationSuspect}
          onChange={(e) => setSelectedInterrogationSuspect(e.target.value)}
        >
          <option value="">Alle verdachten tonen</option>
          {suspects.map((suspect) => (
            <option key={suspect.id} value={suspect.id}>
              {suspect.name}
            </option>
          ))}
        </select>

        {suspects.length === 0 ? (
          <p style={styles.subtle}>Nog geen verdachten aangemaakt.</p>
        ) : (
          visibleSuspects.map((suspect) => {
            const notesForSuspect = suspectNotes.filter(
              (note) => note.suspect_id === suspect.id
            );
            const statusesForSuspect = suspectStatuses.filter(
              (status) => status.suspect_id === suspect.id
            );
            const boughtCluesForSuspect = groupClues.filter((purchase) => {
              const clue =
                purchase.clues ||
                clues.find((item) => item.id === purchase.clue_id);
              return clue?.suspect_id === suspect.id;
            });

            const suspectCount = statusesForSuspect.filter(
              (item) => item.status === "suspect"
            ).length;
            const doubtCount = statusesForSuspect.filter(
              (item) => item.status === "doubt"
            ).length;
            const excludedCount = statusesForSuspect.filter(
              (item) => item.status === "excluded"
            ).length;
            const latestNotes = [...notesForSuspect]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, 4);

            return (
              <div
                key={suspect.id}
                style={{
                  ...styles.card,
                  background:
                    "linear-gradient(135deg, rgba(153,27,27,0.14), rgba(24,24,27,0.98) 44%, rgba(9,9,11,0.98))",
                  borderColor: "#52525b",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 320px) 1fr",
                    gap: 18,
                    alignItems: "start",
                  }}
                >
                  <div style={styles.card}>
                    {suspect.photo_url ? (
                      <img
                        src={suspect.photo_url}
                        alt={suspect.name}
                        style={{
                          width: "100%",
                          maxHeight: 310,
                          objectFit: "cover",
                          borderRadius: 16,
                          border: "1px solid #52525b",
                          cursor: "pointer",
                          marginBottom: 12,
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
                          height: 230,
                          borderRadius: 16,
                          border: "1px solid #52525b",
                          background: "#09090b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 48,
                          marginBottom: 12,
                        }}
                      >
                        🕵️
                      </div>
                    )}

                    <span style={styles.badge}>
                      {suspect.is_active ? "Actief" : "Inactief"}
                    </span>
                    <h3 style={{ fontSize: 28, margin: "12px 0 8px" }}>
                      {suspect.name}
                    </h3>
                    {suspect.description && (
                      <p style={styles.subtle}>{suspect.description}</p>
                    )}
                  </div>

                  <div>
                    <div style={styles.grid}>
                      <div style={{ ...styles.card, borderColor: "#ef4444" }}>
                        <strong>Verdacht</strong>
                        <div style={styles.statNumber}>{suspectCount}</div>
                      </div>
                      <div style={{ ...styles.card, borderColor: "#f59e0b" }}>
                        <strong>Twijfel</strong>
                        <div style={styles.statNumber}>{doubtCount}</div>
                      </div>
                      <div style={{ ...styles.card, borderColor: "#22c55e" }}>
                        <strong>Uitgesloten</strong>
                        <div style={styles.statNumber}>{excludedCount}</div>
                      </div>
                      <div style={styles.card}>
                        <strong>Notities</strong>
                        <div style={styles.statNumber}>
                          {notesForSuspect.length}
                        </div>
                      </div>
                    </div>

                    <div style={styles.grid}>
                      <div style={styles.card}>
                        <h3>Status per groep</h3>
                        {groups.length === 0 ? (
                          <p style={styles.subtle}>Nog geen groepen.</p>
                        ) : (
                          groups.map((group) => {
                            const statusRecord = statusesForSuspect.find(
                              (item) => item.group_id === group.id
                            );
                            return (
                              <div
                                key={group.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  borderBottom: "1px solid #27272a",
                                  padding: "8px 0",
                                }}
                              >
                                <strong>{group.name}</strong>
                                {StatusBadge({
                                  status: statusRecord?.status || "unknown",
                                })}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div style={styles.card}>
                        <h3>Laatste notities</h3>
                        {latestNotes.length === 0 ? (
                          <p style={styles.subtle}>
                            Nog geen notities over deze verdachte.
                          </p>
                        ) : (
                          latestNotes.map((note) => (
                            <div
                              key={note.id}
                              style={{
                                background: "#09090b",
                                border: "1px solid #27272a",
                                borderRadius: 14,
                                padding: 12,
                                marginBottom: 10,
                              }}
                            >
                              <div style={{ whiteSpace: "pre-wrap" }}>
                                {note.note}
                              </div>
                              <div style={styles.subtle}>
                                📁{" "}
                                {note.groups?.name ||
                                  groups.find(
                                    (group) => group.id === note.group_id
                                  )?.name ||
                                  "Onbekende groep"}{" "}
                                · {formatDate(note.created_at)}
                              </div>
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
                            </div>
                          ))
                        )}
                      </div>

                      <div style={styles.card}>
                        <h3>Aanwijzingen gekocht over deze verdachte</h3>
                        {boughtCluesForSuspect.length === 0 ? (
                          <p style={styles.subtle}>
                            Nog geen groep heeft aanwijzingen rond deze
                            verdachte gekocht.
                          </p>
                        ) : (
                          boughtCluesForSuspect.map((purchase) => {
                            const clue =
                              purchase.clues ||
                              clues.find(
                                (item) => item.id === purchase.clue_id
                              );
                            return (
                              <div key={purchase.id} style={styles.card}>
                                <strong>
                                  {clue?.title || "Onbekende aanwijzing"}
                                </strong>
                                <div>
                                  <span style={styles.badge}>
                                    {purchase.groups?.name || "Onbekende groep"}
                                  </span>
                                  {clue?.price !== undefined && (
                                    <span style={styles.badge}>
                                      💰 {clue.price}
                                    </span>
                                  )}
                                </div>
                                {purchase.purchased_at && (
                                  <div style={styles.subtle}>
                                    Gekocht op:{" "}
                                    {formatDate(purchase.purchased_at)}
                                  </div>
                                )}
                                {(clue?.file_url || clue?.pdf_url) && (
                                  <div style={{ marginTop: 8 }}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openClueFile(
                                          clue.file_url || clue.pdf_url
                                        )
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
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return AdminInterrogationPanel();
}
