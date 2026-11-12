import { describe, it, expect } from "vitest";
import { sumPeriod, shiftPeriod } from "@/lib/report";
import type { Transaction } from "@/lib/types";

const tx = (date: string, type: Transaction["type"], amount: number, realized_gain?: number): Transaction => ({
  id: date + type,
  date,
  type,
  amount,
  category_id: "c",
  realized_gain,
});

describe("report maths", () => {
  const txs = [
    tx("2026-11-01", "income", 30_000_000),
    tx("2026-11-05", "dividend", 1_000_000),
    tx("2026-11-07", "sell", 12_000_000, 2_000_000), // proceeds 12M, gain 2M
    tx("2026-11-09", "expense", 20_000_000),
    tx("2026-11-10", "investing", 5_000_000),
    tx("2026-10-09", "expense", 9_000_000),
  ];

  it("counts gains not proceeds, and ignores transfers", () => {
    const s = sumPeriod(txs, "2026-11");
    expect(s.moneyIn).toBe(33_000_000);
    expect(s.out).toBe(20_000_000);
    expect(s.kept).toBe(13_000_000);
    expect(s.moved).toBe(5_000_000);
    expect(s.rate).toBeCloseTo(39.39, 1);
  });

  it("has no rate without money in", () => {
    expect(sumPeriod(txs, "2026-10").rate).toBeNull();
  });

  it("steps months across years, and years", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026", -1)).toBe("2025");
  });
});
