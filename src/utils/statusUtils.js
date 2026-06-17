export function getStatusLabel(status) {
  if (status === "suspect") return "Verdacht";
  if (status === "doubt") return "Twijfel";
  if (status === "excluded") return "Uitgesloten";
  return "Onbekend";
}

