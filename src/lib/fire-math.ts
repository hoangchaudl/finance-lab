// Pure FIRE/forecast math — no React, fully unit-testable.

import { Transaction } from "@/lib/types";

/** Months until FV(netWorth) + contributions reaches target. null = never. */
export function monthsToTarget(
  netWorth: number,
  monthlyContribution: number,
  target: number,
  annualReturnPct: number,
): number | null {
  if (target <= 0 || netWorth >= target) return 0;
  const r = annualReturnPct / 100 / 12;
  const pmt = Math.max(0, monthlyContribution);

  if (r <= 0) {
    if (pmt <= 0) return null;
    return Math.ceil((target - netWorth) / pmt);
  }
  if (pmt <= 0 && netWorth <= 0) return null;

  // NW(1+r)^m + pmt·((1+r)^m − 1)/r ≥ target  →  solve for m
  const num = target + pmt / r;
  const den = netWorth + pmt / r;
  if (den <= 0) return null;
  const m = Math.log(num / den) / Math.log(1 + r);
  if (!isFinite(m) || m < 0) return null;
  return Math.ceil(m);
}

/** Classic Rule of 25. */
export function fireNumber(monthlyExpenses: number): number {
  return monthlyExpenses * 12 * 25;
}

/** Net worth at which monthly investment income (NW·r) covers expenses. */
export function crossoverTargetNW(
  monthlyExpenses: number,
  annualReturnPct: number,
): number {
  const r = annualReturnPct / 100 / 12;
  return r > 0 ? monthlyExpenses / r : Infinity;
}

/** Projected net worth after m months of compounding + contributions. */
export function projectNetWorth(
  netWorth: number,
  monthlyContribution: number,
  annualReturnPct: number,
  months: number,
): number {
  const r = annualReturnPct / 100 / 12;
  const pmt = Math.max(0, monthlyContribution);
  if (r <= 0) return netWorth + pmt * months;
  const growth = Math.pow(1 + r, months);
  return netWorth * growth + (pmt * (growth - 1)) / r;
}

export interface ForecastPoint {
  monthIndex: number;
  year: number;
  netWorth: number;
  investIncome: number; // NW · monthly return
  expenses: number;
}

/** Yearly series of forecast investment income vs expenses. */
export function buildForecastSeries(
  netWorth: number,
  monthlyContribution: number,
  monthlyExpenses: number,
  annualReturnPct: number,
  horizonMonths: number,
  startDate = new Date(),
): ForecastPoint[] {
  const r = annualReturnPct / 100 / 12;
  const points: ForecastPoint[] = [];
  for (let m = 0; m <= horizonMonths; m += 12) {
    const nw = projectNetWorth(netWorth, monthlyContribution, annualReturnPct, m);
    points.push({
      monthIndex: m,
      year: startDate.getFullYear() + Math.floor((startDate.getMonth() + m) / 12),
      netWorth: Math.round(nw),
      investIncome: Math.round(nw * r),
      expenses: Math.round(monthlyExpenses),
    });
  }
  return points;
}

/**
 * Average per-month sum of the given transaction types over the last
 * `monthsBack` calendar months that actually contain data (so a brand-new
 * user isn't averaged down by empty months).
 */
export function avgMonthlyAmount(
  transactions: Pick<Transaction, "date" | "amount" | "type">[],
  types: string[],
  monthsBack = 6,
): number {
  const byMonth: Record<string, number> = {};
  for (const t of transactions) {
    if (!types.includes(t.type)) continue;
    const key = t.date.slice(0, 7);
    byMonth[key] = (byMonth[key] || 0) + t.amount;
  }
  const months = Object.keys(byMonth).sort().slice(-monthsBack);
  if (months.length === 0) return 0;
  return months.reduce((s, k) => s + byMonth[k], 0) / months.length;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "May 2034" for a date `months` from now. */
export function monthLabelFromNow(months: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + months, 1);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
