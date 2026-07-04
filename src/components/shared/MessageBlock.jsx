import React from "react";
import { styles } from "../../styles";

export default function MessageBlock({
  error,
  message,
  onClearError,
  onClearMessage,
}) {
  return (
    <>
      {error && (
        <div
          style={{
            ...styles.card,
            borderColor: "#7f1d1d",
            background: "linear-gradient(180deg, rgba(69,10,10,0.42), #18181b)",
          }}
        >
          <strong>⚠️ Let op</strong>
          <p style={{ margin: "8px 0 12px" }}>{error}</p>
          <button style={styles.buttonSecondary} onClick={onClearError}>
            Melding sluiten
          </button>
        </div>
      )}

      {message && (
        <div
          style={{
            ...styles.card,
            borderColor: "#166534",
            background: "linear-gradient(180deg, rgba(20,83,45,0.24), #18181b)",
          }}
        >
          <strong>✅ Klaar</strong>
          <p style={{ margin: "8px 0 12px" }}>{message}</p>
          <button style={styles.buttonSecondary} onClick={onClearMessage}>
            Melding sluiten
          </button>
        </div>
      )}
    </>
  );
}
