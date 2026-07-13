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

/** Parse amount input with VN shorthand, matching the Telegram bot:
 *  "50k" → 50,000 · "1.5tr"/"1,5tr" → 1,500,000 · "1.000.000" → 1,000,000
 *  · plain digits pass through. Returns null if unparseable. */
export function parseAmountInput(str: string): number | null {
  const s = str.trim().toLowerCase().replace(/[\s₫]/g, "");
  if (!s) return null;

  const tr = s.match(/^(\d+([.,]\d+)?)tr$/);
  if (tr) return Math.round(parseFloat(tr[1].replace(",", ".")) * 1_000_000);

  const k = s.match(/^(\d+([.,]\d+)?)k$/);
  if (k) return Math.round(parseFloat(k[1].replace(",", ".")) * 1_000);

  const plain = s.match(/^(\d{1,3}(?:[.,]\d{3})+|\d+)$/);
  if (plain) return parseInt(plain[1].replace(/[.,]/g, ""), 10);

  return null;
}

/** Sanitize while typing: keep digits, separators and k/t/r. If no shorthand
 *  letters are present, collapse to plain digits (legacy behavior). */
export function sanitizeAmountTyping(str: string): string {
  const s = str.toLowerCase();
  if (/[ktr]/.test(s)) return s.replace(/[^\dktr.,]/g, "");
  return s.replace(/\D/g, "");
}

/** Display while typing: dot-group plain digits, leave shorthand as typed. */
export function formatAmountTyping(str: string): string {
  if (/^\d+$/.test(str)) return str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return str;
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
