export function formatVND(amount: number): string {
  return amount.toLocaleString("de-DE") + " ₫";
}

export function formatVNDCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B ₫`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M ₫`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K ₫`;
  return formatVND(amount);
}

/** Today's date in the user's LOCAL timezone (toISOString() is UTC and
 *  shows yesterday before 7am in Vietnam). */
export function todayLocalISO(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}
