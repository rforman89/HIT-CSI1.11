import React from "react";

export default function Header({ ctx, title, subtitle }) {
  const { styles, gameMode, isLoading, refreshWithLoading, handleLogout } = ctx;

  return (
    <div style={styles.header}>
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
            {gameMode === "live" ? "🔴 LIVE SPEL" : "🧪 TESTMODUS"}
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
