export function parsePublishedDate(date) {
  if (!date) return null;

  const raw = String(date).trim();
  const parts = raw.split("-");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const dt = new Date(year, month, day);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function formatPublishedDate(date) {
  const dt = parsePublishedDate(date);
  if (!dt) return String(date || "");
  const mon = dt.toLocaleString("en-US", { month: "short" });
  return `${dt.getDate()} ${mon}, ${dt.getFullYear()}`;
}
