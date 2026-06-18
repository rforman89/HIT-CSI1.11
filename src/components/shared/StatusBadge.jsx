import React from "react";
import { styles } from "../../styles";
import { getStatusLabel } from "../../utils/statusUtils";

export default function StatusBadge({ status }) {
  const badgeStyle = {
    ...styles.badge,
    marginTop: 0,
  };

  if (status === "suspect") {
    badgeStyle.borderColor = "#ef4444";
    badgeStyle.color = "#fecaca";
    badgeStyle.background = "rgba(69,10,10,0.7)";
  }

  if (status === "doubt") {
    badgeStyle.borderColor = "#f59e0b";
    badgeStyle.color = "#fde68a";
    badgeStyle.background = "rgba(120,53,15,0.55)";
  }

  if (status === "excluded") {
    badgeStyle.borderColor = "#22c55e";
    badgeStyle.color = "#bbf7d0";
    badgeStyle.background = "rgba(20,83,45,0.55)";
  }

  return <span style={badgeStyle}>{getStatusLabel(status)}</span>;
}
