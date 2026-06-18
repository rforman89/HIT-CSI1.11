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
        <div style={styles.error}>
          {error}
          <button style={styles.buttonSecondary} onClick={onClearError}>
            Sluiten
          </button>
        </div>
      )}

      {message && (
        <div style={styles.ok}>
          {message}
          <button style={styles.buttonSecondary} onClick={onClearMessage}>
            Sluiten
          </button>
        </div>
      )}
    </>
  );
}
