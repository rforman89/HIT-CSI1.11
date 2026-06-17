export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("nl-NL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getAgendaIcon(type) {
  if (type === "food") return "🍽️";
  if (type === "credits") return "💰";
  if (type === "deadline") return "⏰";
  if (type === "free_time") return "💤";
  return "🕵️";
}

export function toDateTimeLocalValue(value) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
}

