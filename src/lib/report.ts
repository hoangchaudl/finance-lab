import type { Transaction } from "./types";

/** One definition of the report's money maths, shared by every section.
 *  `prefix` is a date prefix: "2026-11" (month), "2026" (year) or "" (all time). */
export function sumPeriod(transactions: Transaction[], prefix: string) {
  const s = { income: 0, dividends: 0, gains: 0, out: 0, moved: 0 };
  for (const t of transactions) {
    if (!t.date.startsWith(prefix)) continue;
    if (t.type === "income") s.income += t.amount;
    else if (t.type === "dividend") s.dividends += t.amount;
    else if (t.type === "sell") s.gains += t.realized_gain ?? 0;
    else if (t.type === "expense") s.out += t.amount;
    // saving / investing only move money between cash and assets
    else s.moved += t.amount;
  }
  const moneyIn = s.income + s.dividends + s.gains;
  const kept = moneyIn - s.out;
  return { ...s, moneyIn, kept, rate: moneyIn > 0 ? (kept / moneyIn) * 100 : null };
}

/** Step a period key by ±1: "2026-01" → "2025-12", "2026" → "2025". */
export function shiftPeriod(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  if (!m) return String(y + delta);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The previous period's transactions up to the same day as `today`, so a
 *  part-finished month or year is compared like for like. */
export function upToSamePoint(transactions: Transaction[], prevKey: string, today: string) {
  const from = prevKey.length === 7 ? 8 : 5; // day of month, or month-day
  const cutoff = today.slice(from);
  return transactions.filter((t) => t.date.startsWith(prevKey) && t.date.slice(from) <= cutoff);
}
