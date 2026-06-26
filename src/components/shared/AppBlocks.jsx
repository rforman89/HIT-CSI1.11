import React from "react";

export function ImageModal({ ctx }) {
  const { styles, imageModal, setImageModal } = ctx;

  if (!imageModal) return null;

  return (
    <div style={styles.modalBackdrop} onClick={() => setImageModal(null)}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <strong>{imageModal.alt}</strong>
          <button
            style={styles.buttonSecondary}
            onClick={() => setImageModal(null)}
          >
            Sluiten
          </button>
        </div>

        <img
          src={imageModal.src}
          alt={imageModal.alt}
          style={styles.modalImage}
        />
      </div>
    </div>
  );
}

export function AgendaBlock({ ctx }) {
  const {
    styles,
    profile,
    nextAgendaItem,
    visibleAgendaItems,
    formatDate,
    getAgendaIcon,
  } = ctx;

  return (
    <div style={styles.card}>
      <h2>Agenda</h2>

      {nextAgendaItem ? (
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Volgende activiteit</h3>
          <strong>
            {getAgendaIcon(nextAgendaItem.item_type)} {nextAgendaItem.title}
          </strong>
          <div style={styles.subtle}>
            {formatDate(nextAgendaItem.starts_at)}
            {nextAgendaItem.ends_at
              ? ` - ${formatDate(nextAgendaItem.ends_at)}`
              : ""}
          </div>
          {nextAgendaItem.description && <p>{nextAgendaItem.description}</p>}
          {nextAgendaItem.credits_reward > 0 && (
            <span style={styles.badge}>
              💰 {nextAgendaItem.credits_reward} pegels te verdienen
            </span>
          )}
        </div>
      ) : (
        <p style={styles.subtle}>Er staat geen volgende activiteit gepland.</p>
      )}

      {visibleAgendaItems.length === 0 ? (
        <p style={styles.subtle}>Nog geen agenda-items zichtbaar.</p>
      ) : (
        visibleAgendaItems.map((item) => (
          <div key={item.id} style={{ marginBottom: 16 }}>
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
                💰 {item.credits_reward} pegels te verdienen
              </span>
            )}
            {profile?.role === "admin" && !item.is_visible && (
              <span style={styles.badge}>Verborgen</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export function NotificationsBlock({ ctx }) {
  const { styles, notifications, formatDate } = ctx;
  const latestNotifications = notifications.slice(0, 10);

  return (
    <div style={styles.card}>
      <h2>Meldingen</h2>

      {latestNotifications.length === 0 ? (
        <div style={styles.card}>
          <strong>Nog geen meldingen</strong>
          <p style={styles.subtle}>
            Nieuwe berichten van de organisatie verschijnen hier.
          </p>
        </div>
      ) : (
        latestNotifications.map((notification) => (
          <div key={notification.id} style={styles.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <strong>{notification.title}</strong>

              <span style={styles.badge}>
                {notification.notification_type?.includes("clue")
                  ? "Aanwijzing"
                  : notification.notification_type?.includes("broadcast")
                  ? "Algemeen"
                  : notification.notification_type?.includes("credit")
                  ? "Pegels"
                  : "Melding"}
              </span>
            </div>

            {notification.message && <p>{notification.message}</p>}

            <div style={styles.subtle}>
              {formatDate(notification.created_at)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function TransactionsBlock({ ctx }) {
  const { styles, transactions, formatDate } = ctx;

  return (
    <div style={styles.card}>
      <h2>Pegels geschiedenis</h2>

      {transactions.length === 0 ? (
        <p style={styles.subtle}>Nog geen transacties.</p>
      ) : (
        transactions.map((t) => (
          <div key={t.id} style={{ marginBottom: 12 }}>
            <strong>
              {t.amount > 0 ? "+" : ""}
              {t.amount} pegels
            </strong>
            <div>{t.reason}</div>
            {t.groups?.name && <div style={styles.subtle}>{t.groups.name}</div>}
            <div style={styles.subtle}>{formatDate(t.created_at)}</div>
          </div>
        ))
      )}
    </div>
  );
}

export function NoGroupScreen({ ctx }) {
  const { styles, profile, loadAppData, handleLogout } = ctx;

  return (
    <div style={styles.card}>
      <h2>Je bent nog niet aan een groep gekoppeld</h2>

      <p>
        Je account is aangemaakt, maar de organisatie heeft je nog niet aan een
        groep gekoppeld. Zodra dit is gedaan, verschijnt hier automatisch jullie
        groepsdashboard.
      </p>

      <div style={styles.card}>
        <strong>Account</strong>
        <div style={styles.subtle}>{profile?.display_name || profile?.email}</div>
        <div style={styles.subtle}>{profile?.email}</div>
      </div>

      <p style={styles.subtle}>
        Vraag de organisatie om je account aan een groep te koppelen. Daarna kun
        je op verversen drukken.
      </p>

      <button style={styles.button} onClick={() => loadAppData(profile)}>
        Ververs
      </button>

      <button style={styles.buttonSecondary} onClick={handleLogout}>
        Uitloggen
      </button>
    </div>
  );
}

export function ParticipantGroupBar({ ctx }) {
  const { styles, myGroup, getParticipantProgress } = ctx;
  const progress = getParticipantProgress();

  return (
    <div
      style={{
        ...styles.card,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, rgba(39,39,42,0.98), rgba(9,9,11,0.98))",
        borderColor: "#3f3f46",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 170 }}>
          <div style={styles.subtle}>Mijn groep</div>
          <strong>{myGroup?.name || "Nog geen groep"}</strong>
        </div>

        <div>
          <div style={styles.subtle}>Pegels</div>
          <strong>💰 {myGroup?.credits || 0}</strong>
        </div>

        <div>
          <div style={styles.subtle}>Ontgrendeld</div>
          <strong>📄 {progress.unlockedCount}</strong>
        </div>

        <div>
          <div style={styles.subtle}>Notities</div>
          <strong>📝 {progress.noteCount}</strong>
        </div>
      </div>

      <div
        style={{
          ...styles.subtle,
          marginTop: 10,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={styles.badge}>Te koop: {progress.buyableCount}</span>
        <span style={styles.badge}>Statussen: {progress.statusCount}</span>
      </div>
    </div>
  );
}
