import React from "react";
import { styles } from "../../styles";

export default function LoadingBlock({ isLoading }) {
  if (!isLoading) return null;

  return (
    <div style={styles.card}>
      <strong>Gegevens verversen...</strong>
      <div style={styles.subtle}>
        De meldkamer haalt de laatste spelstand op.
      </div>
    </div>
  );
}
