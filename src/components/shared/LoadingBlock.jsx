import React from "react";
import { styles } from "../../styles";

export default function LoadingBlock({ isLoading }) {
  if (!isLoading) return null;

  return (
    <div style={styles.card}>
      <strong>Gegevens laden...</strong>
      <div style={styles.subtle}>
        De meldkamer haalt de laatste speldata op.
      </div>
    </div>
  );
}
