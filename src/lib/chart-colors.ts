// Single source of truth for chart colors across the app (Recharts needs
// real CSS color strings, not Tailwind classes, so we read the same CSS
// variables Tailwind reads — one palette, defined once in index.css).

const cssVar = (name: string) => `hsl(var(${name}))`;

/** Sequential categorical palette — 7 hues, harmonized with the brand. */
export const CHART_PALETTE = [
  cssVar("--chart-1"),
  cssVar("--chart-2"),
  cssVar("--chart-3"),
  cssVar("--chart-4"),
  cssVar("--chart-5"),
  cssVar("--chart-6"),
  cssVar("--chart-7"),
];

/** Portfolio / net-worth asset-type breakdown — used by Portfolio.tsx and
 *  Dashboard.tsx so both pages always agree on what color a type is. */
export const ASSET_TYPE_COLORS: Record<string, string> = {
  Stocks: cssVar("--chart-1"),
  Savings: cssVar("--chart-2"),
  Crypto: cssVar("--chart-3"),
  Gold: cssVar("--chart-4"),
  ETF: cssVar("--chart-5"),
  Fund: cssVar("--chart-6"),
  Other: cssVar("--chart-7"),
};

/** Raw `--chart-N` var names (no hsl() wrapper) for spots that need to build
 *  their own hsl(var(...) / alpha) tint — e.g. a subtle row background that
 *  still matches the ASSET_TYPE_COLORS used in the pie chart above. */
export const ASSET_TYPE_VARS: Record<string, string> = {
  Stocks: "--chart-1",
  Savings: "--chart-2",
  Crypto: "--chart-3",
  Gold: "--chart-4",
  ETF: "--chart-5",
  Fund: "--chart-6",
  Other: "--chart-7",
};

/** Status/semantic colors for line & bar charts (gains vs. losses, income vs.
 *  expenses, etc.) — always the same 4 brand tokens, never ad hoc hexes. */
export const STATUS_CHART_COLORS = {
  primary: cssVar("--primary"),
  success: cssVar("--success"),
  warning: cssVar("--warning"),
  destructive: cssVar("--destructive"),
  muted: cssVar("--muted-foreground"),
};

/** Stable color for an arbitrary category list (spending categories, etc.):
 *  same category → same color every time it's rendered, cycling the shared
 *  palette instead of a one-off array per page. */
export function colorForCategory(key: string, index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
