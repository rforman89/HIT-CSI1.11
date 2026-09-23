import React from "react";

export default function Header({ ctx, title, subtitle }) {
  const { styles, gameMode, isLoading, refreshWithLoading, handleLogout, dataStatus, busyAction } = ctx;

  return (
    <div style={styles.header}>
      {busyAction && <div role="status">Bezig met verwerken…</div>}
      {dataStatus?.error && <div role="alert" style={styles.error}>{dataStatus.error}</div>}
      {dataStatus?.loading && <div role="status">Gegevens verversen…</div>}
      {!dataStatus?.loading && dataStatus?.lastUpdated && <div style={styles.subtle}>Bijgewerkt: {new Date(dataStatus.lastUpdated).toLocaleTimeString("nl-NL")}</div>}
      <div style={styles.titleRow}>
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>
          {subtitle && <div style={styles.subtle}>{subtitle}</div>}

          <span
            style={{
              ...styles.badge,
              borderColor: gameMode === "live" ? "#ef4444" : "#22c55e",
            }}
          >
            {gameMode === "live" ? "🔴 LIVE SPEL" : gameMode === "test" ? "🧪 TESTMODUS" : "⚠️ SPELMODUS ONBEKEND"}
          </span>
        </div>
        <div>
          <button
            style={{
              ...styles.buttonSecondary,
              opacity: isLoading ? 0.65 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
            onClick={refreshWithLoading}
            disabled={isLoading}
          >
            {isLoading ? "Verversen..." : "Verversen"}
          </button>
          <button style={styles.buttonSecondary} onClick={handleLogout}>
            Uitloggen
          </button>
        </div>
      </div>
    </div>
  );
}
