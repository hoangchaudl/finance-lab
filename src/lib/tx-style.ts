// Single source of truth for how a transaction type / income quality is
// labeled and colored. Both the full Transactions page and the Portfolio
// quick-log dialog render the exact same badges from here — previously each
// file hardcoded its own copy of these colors and they drifted apart.

import type { BadgeProps } from "@/components/ui/badge";
import type { Transaction } from "@/lib/types";

export const TX_TYPE_BADGE: Record<
  Transaction["type"],
  { label: string; variant: BadgeProps["variant"] }
> = {
  income: { label: "Income", variant: "success" },
  expense: { label: "Expense", variant: "secondary" },
  investing: { label: "Invest", variant: "default" },
  saving: { label: "Save", variant: "outline" },
  sell: { label: "Sell", variant: "warning" },
  dividend: { label: "Dividend", variant: "success" },
};

/** Buy/sell/dividend quick-log widgets show "Buy" rather than "Invest". */
export const QUICK_LOG_TYPE_BADGE: Record<
  "investing" | "sell" | "dividend",
  { label: string; variant: BadgeProps["variant"] }
> = {
  investing: { label: "Buy", variant: TX_TYPE_BADGE.investing.variant },
  sell: { label: "Sell", variant: TX_TYPE_BADGE.sell.variant },
  dividend: { label: "Dividend", variant: TX_TYPE_BADGE.dividend.variant },
};

export const QUALITY_BADGE: Record<
  NonNullable<Transaction["quality"]>,
  { label: string; variant: BadgeProps["variant"] }
> = {
  active: { label: "Active", variant: "destructive" },
  scalable: { label: "Scalable", variant: "warning" },
  passive: { label: "Passive", variant: "success" },
};
