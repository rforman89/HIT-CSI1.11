import React from "react";
import { styles } from "../../styles";
import { userFacingError } from "../../utils/userFeedback";

export default function MessageBlock({
  error,
  message,
  onClearError,
  onClearMessage,
  showTechnicalDetails = false,
  busyAction,
}) {
  const friendlyError = userFacingError(error || '');
  if (!error && !message && !busyAction) return null;
  return (
    <div style={{position:'fixed',top:'calc(12px + env(safe-area-inset-top, 0px))',right:'calc(12px + env(safe-area-inset-right, 0px))',width:'min(420px, calc(100% - 24px))',maxHeight:'40vh',overflowY:'auto',zIndex:100}}>
      {busyAction && <div role="status" style={styles.card}>Bezig met verwerken…</div>}
      {error && (
        <div
          role="alert"
          style={{
            ...styles.card,
            borderColor: "#7f1d1d",
            background: "linear-gradient(180deg, rgba(69,10,10,0.42), #18181b)",
          }}
        >
          <strong>⚠️ Let op</strong>
          <p style={{ margin: "8px 0 12px" }}>{friendlyError}</p>
          {showTechnicalDetails && friendlyError !== error && <details><summary>Technische details</summary><p>{error}</p></details>}
          <button style={styles.buttonSecondary} onClick={onClearError}>
            Melding sluiten
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
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
    </div>
  );
}
