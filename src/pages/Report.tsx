import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageTourButton from "@/components/PageTourButton";
import { usePageTour } from "@/hooks/use-page-tour";
import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import { sumPeriod, shiftPeriod } from "@/lib/report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HintBanner from "@/components/HintBanner";
import EmptyState from "@/components/EmptyState";
import { BarChart3, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { STATUS_CHART_COLORS } from "@/lib/chart-colors";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type View = "month" | "year" | "all";
const VIEWS: { value: View; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

const signed = (v: number) => `${v > 0 ? "+" : ""}${formatVND(Math.round(v))}`;
const gainClass = (v: number) => (v >= 0 ? "text-success" : "text-destructive");
const millions = (v: number) => `${(v / 1_000_000).toFixed(0)}M`;

/** "12% more than Oct 2026", coloured by whether that direction is good news. */
function Delta({ now, before, label, upIsGood }: { now: number; before?: number | null; label: string; upIsGood: boolean }) {
  if (!before) return null;
  const pct = ((now - before) / Math.abs(before)) * 100;
  if (Math.abs(pct) < 0.5) return <span className="text-xs text-muted-foreground">Same as {label}</span>;
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${up === upIsGood ? "text-success" : "text-destructive"}`}>
      <Icon className="h-3 w-3" strokeWidth={2} />
      {Math.abs(pct).toFixed(0)}% {up ? "more" : "less"} than {label}
    </span>
  );
}

export default function Report() {
  const { data } = useApp();
  const navigate = useNavigate();
  const { startTour } = usePageTour("report");
  const { transactions } = data;
  const [showAllCategories, setShowAllCategories] = useState(false);

  // ── PERIOD (lives in the URL so a report can be linked and survives refresh) ──
  const [params, setParams] = useSearchParams();
  const nowMonth = getMonthKey();
  const nowYear = nowMonth.slice(0, 4);
  const viewParam = params.get("view");
  const view: View = viewParam === "year" || viewParam === "all" ? viewParam : "month";
  const periodParam = params.get("period") ?? "";
  // "" matches every date, so all-time needs no special casing below
  const period =
    view === "month"
      ? /^\d{4}-\d{2}$/.test(periodParam) ? periodParam : nowMonth
      : view === "year"
        ? /^\d{4}$/.test(periodParam) ? periodParam : nowYear
        : "";

  const go = (v: View, p: string) =>
    setParams(v === "all" ? { view: v } : { view: v, period: p }, { replace: true });

  const changeView = (v: View) => {
    const year = period.slice(0, 4) || nowYear;
    if (v === "year") go(v, year);
    else if (v === "month") go(v, view === "month" ? period : year === nowYear ? nowMonth : `${year}-12`);
    else go(v, "");
  };

  const periodLabel = view === "month" ? getMonthLabel(period) : view === "year" ? period : "All time";
  const prevKey = view === "all" ? null : shiftPeriod(period, -1);
  const prevLabel = prevKey ? (view === "month" ? getMonthLabel(prevKey) : prevKey) : "";
  const atLatest = period >= (view === "month" ? nowMonth : nowYear);

  // ── NUMBERS ──
  const cur = useMemo(() => sumPeriod(transactions, period), [transactions, period]);
  const prev = useMemo(() => (prevKey ? sumPeriod(transactions, prevKey) : null), [transactions, prevKey]);
  const periodIsEmpty = cur.moneyIn === 0 && cur.out === 0 && cur.moved === 0;

  // Month and Year views chart the 12 months of that year; All time charts years
  const buckets = useMemo(() => {
    const keys =
      view === "all"
        ? Array.from(new Set(transactions.map((t) => t.date.slice(0, 4)))).sort()
        : Array.from({ length: 12 }, (_, i) => `${period.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`);
    return keys.map((key) => {
      const s = sumPeriod(transactions, key);
      return {
        key,
        label: view === "all" ? key : getMonthLabel(key).split(" ")[0],
        moneyIn: s.moneyIn,
        out: s.out,
        rate: s.rate,
      };
    });
  }, [transactions, view, period]);

  const openBucket = (label?: string | number) => {
    const bucket = buckets.find((b) => b.label === label);
    if (bucket) go(view === "all" ? "year" : "month", bucket.key);
  };

  const spending = useMemo(() => {
    const byCategory = (prefix: string) => {
      const totals = new Map<string, number>();
      transactions.forEach((t) => {
        if (t.type !== "expense" || !t.date.startsWith(prefix)) return;
        const id = t.category_id ?? "";
        totals.set(id, (totals.get(id) ?? 0) + t.amount);
      });
      return totals;
    };
    const before = prevKey ? byCategory(prevKey) : null;
    return Array.from(byCategory(period))
      .map(([id, value]) => {
        const cat = data.categories.find((c) => c.id === id);
        return {
          id,
          name: cat ? `${cat.emoji} ${cat.name}` : "Uncategorized",
          essential: cat?.type === "essential",
          value,
          before: before ? (before.get(id) ?? 0) : null,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, data.categories, period, prevKey]);

  const biggestCategory = spending[0]?.value ?? 0;
  const essentialShare =
    cur.out > 0 ? (spending.filter((c) => c.essential).reduce((s, c) => s + c.value, 0) / cur.out) * 100 : 0;
  const visibleSpending = showAllCategories ? spending : spending.slice(0, 6);

  const holdings = useMemo(
    () =>
      (data.portfolio ?? [])
        .map((entry) => {
          const qty = Number(entry.quantity) || 0;
          const cost = qty * (Number(entry.purchasePrice) || 0);
          const value = qty * (Number(entry.currentPrice) || 0);
          let bought = 0;
          let realized = 0;
          let dividends = 0;
          transactions.forEach((t) => {
            if (t.portfolio_entry_id !== entry.id) return;
            if (t.type === "investing" || t.type === "saving") bought += t.amount;
            else if (t.type === "sell") realized += t.realized_gain ?? 0;
            else if (t.type === "dividend") dividends += t.amount;
          });
          // Everything ever put in, so a part-sold position isn't measured
          // against only the shares that are left. Falls back to cost basis
          // for assets with no logged buys.
          const invested = bought || cost;
          const unrealized = value - cost;
          const returnPct = invested > 0 ? ((unrealized + realized + dividends) / invested) * 100 : 0;
          return { id: entry.id, name: entry.name, tier: entry.tier, invested, value, unrealized, realized, dividends, returnPct };
        })
        .sort((a, b) => b.returnPct - a.returnPct),
    [data.portfolio, transactions],
  );
  const totalUnrealized = holdings.reduce((s, h) => s + h.unrealized, 0);

  // ── RENDER ──
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 data-tour="page-title" className="text-2xl font-bold flex items-center gap-1">
          Reports
          <PageTourButton onClick={startTour} />
        </h1>

        {transactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(v) => changeView(v as View)}>
              <TabsList>
                {VIEWS.map((v) => (
                  <TabsTrigger key={v.value} value={v.value}>{v.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {view !== "all" && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Previous ${view}`}
                  onClick={() => go(view, shiftPeriod(period, -1))}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </Button>
                <span className="min-w-[6.5rem] text-center text-sm font-bold tabular">{periodLabel}</span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Next ${view}`}
                  disabled={atLatest}
                  onClick={() => go(view, shiftPeriod(period, 1))}
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <HintBanner
        pageKey="reports"
        message="📊 Pick a month, a year, or all time at the top — every number on this page follows it. Select a bar in the chart to jump to that month."
      />

      {transactions.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No data to chart yet"
          description="Add a few transactions on the Transactions page and your money in, money out, and spending will appear here."
          actionLabel="Add a transaction"
          onAction={() => navigate("/transactions")}
        />
      ) : (
        <>
          {/* ─── THE ANSWER: money in − money out = kept ─── */}
          <Card>
            <CardContent className="p-6 space-y-4">
              {periodIsEmpty ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Nothing logged in {periodLabel}. Select another bar below, or add a transaction.
                  </p>
                  <Button variant="outline" onClick={() => navigate("/transactions")}>Add a transaction</Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1.3fr] sm:items-start">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Money in</p>
                      <p className="text-2xl font-bold tabular text-success">{formatVND(cur.moneyIn)}</p>
                      <Delta now={cur.moneyIn} before={prev?.moneyIn} label={prevLabel} upIsGood />
                    </div>
                    <span aria-hidden className="hidden sm:block pt-6 text-2xl text-muted-foreground">−</span>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Money out</p>
                      <p className="text-2xl font-bold tabular text-destructive">{formatVND(cur.out)}</p>
                      <Delta now={cur.out} before={prev?.out} label={prevLabel} upIsGood={false} />
                    </div>
                    <span aria-hidden className="hidden sm:block pt-6 text-2xl text-muted-foreground">=</span>
                    <div className="space-y-1 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                      <p className="text-sm text-muted-foreground">
                        {cur.kept >= 0 ? "Kept" : "Overspent"} in {periodLabel}
                      </p>
                      <p className={`text-3xl sm:text-4xl font-bold tabular ${cur.kept >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatVND(Math.abs(cur.kept))}
                      </p>
                      {cur.rate !== null && cur.kept >= 0 && (
                        <p className="text-sm text-muted-foreground">
                          {cur.rate.toFixed(0)}% of your money in
                        </p>
                      )}
                    </div>
                  </div>
                  {(cur.dividends !== 0 || cur.gains !== 0 || cur.moved > 0) && (
                    <p className="text-sm text-muted-foreground max-w-[75ch]">
                      {(cur.dividends !== 0 || cur.gains !== 0) && (
                        <>
                          Money in includes {formatVND(cur.dividends)} in dividends and {signed(cur.gains)} in realized
                          gains.{" "}
                        </>
                      )}
                      {cur.moved > 0 && (
                        <>You moved {formatVND(cur.moved)} into savings and investments, which is not spending.</>
                      )}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ─── TREND: doubles as the period picker ─── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{view === "all" ? "Money in and out by year" : `Money in and out, ${period.slice(0, 4)}`}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a bar to open that {view === "all" ? "year" : "month"}.
              </p>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={buckets}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  onClick={(e) => openBucket(e?.activeLabel)}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={millions} tick={{ fontSize: 12 }} width={44} />
                  <Tooltip formatter={(v: number, n: string) => [formatVND(v), n]} />
                  <Legend />
                  <Bar dataKey="moneyIn" name="Money in" fill={STATUS_CHART_COLORS.success} radius={[4, 4, 0, 0]}>
                    {buckets.map((b) => (
                      <Cell key={b.key} fillOpacity={view === "month" && b.key !== period ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar dataKey="out" name="Money out" fill={STATUS_CHART_COLORS.destructive} radius={[4, 4, 0, 0]}>
                    {buckets.map((b) => (
                      <Cell key={b.key} fillOpacity={view === "month" && b.key !== period ? 0.35 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ─── WHERE IT WENT ─── */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle>Where it went</CardTitle>
                {spending.length > 0 && (
                  <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Essential {essentialShare.toFixed(0)}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-warning" /> Non-essential {(100 - essentialShare).toFixed(0)}%
                    </span>
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {spending.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">No spending logged in {periodLabel}.</p>
                ) : (
                  <ul className="space-y-3">
                    {visibleSpending.map((c) => {
                      const change = c.before ? ((c.value - c.before) / c.before) * 100 : null;
                      return (
                        <li key={c.id} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-medium truncate">{c.name}</span>
                            <span className="flex items-baseline gap-2 shrink-0 tabular">
                              {change !== null && Math.abs(change) >= 0.5 && (
                                <span className={`text-xs ${change > 0 ? "text-destructive" : "text-success"}`}>
                                  {change > 0 ? "+" : ""}{change.toFixed(0)}%
                                </span>
                              )}
                              {c.before === 0 && <span className="text-xs text-muted-foreground">new</span>}
                              <span className="font-bold">{formatVND(c.value)}</span>
                              <span className="w-9 text-right text-xs text-muted-foreground">
                                {((c.value / cur.out) * 100).toFixed(0)}%
                              </span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.essential ? "bg-primary" : "bg-warning"}`}
                              style={{ width: `${(c.value / biggestCategory) * 100}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {spending.length > 6 && (
                  <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAllCategories((v) => !v)}>
                    {showAllCategories ? "Show top 6" : `Show all ${spending.length} categories`}
                  </Button>
                )}
                {prevKey && spending.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">Percent change is against {prevLabel}.</p>
                )}
              </CardContent>
            </Card>

            {/* ─── SAVINGS RATE ─── */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Savings rate</CardTitle>
                <p className="text-sm text-muted-foreground">The share of your money in that you kept.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p
                    className={`text-3xl font-bold tabular ${
                      cur.rate === null
                        ? "text-muted-foreground"
                        : cur.rate >= 50
                          ? "text-success"
                          : cur.rate < 30
                            ? "text-destructive"
                            : "text-warning-foreground"
                    }`}
                  >
                    {cur.rate === null ? "—" : `${cur.rate.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cur.rate === null ? `No money in logged in ${periodLabel}.` : periodLabel}
                  </p>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={buckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis
                        domain={[(min: number) => Math.min(0, Math.floor(min)), 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11 }}
                        width={40}
                      />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Savings rate"]} />
                      <ReferenceLine
                        y={50}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 3"
                        label={{ value: "FIRE target 50%", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="Savings rate"
                        stroke={STATUS_CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── INVESTMENTS: only what the Portfolio page doesn't show ─── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Investments</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/portfolio">Open Portfolio</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {holdings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No assets yet. Add one in Portfolio to see gains and dividends here.
                </p>
              ) : (
                <>
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Realized gains, {periodLabel}</dt>
                      <dd className={`text-xl font-bold tabular ${gainClass(cur.gains)}`}>{signed(cur.gains)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Dividends, {periodLabel}</dt>
                      <dd className="text-xl font-bold tabular text-success">{formatVND(cur.dividends)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Unrealized today</dt>
                      <dd className={`text-xl font-bold tabular ${gainClass(totalUnrealized)}`}>{signed(totalUnrealized)}</dd>
                    </div>
                  </dl>

                  <div className="overflow-x-auto -mx-6">
                    <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">Asset</TableHead>
                          <TableHead className="text-right">Put in</TableHead>
                          <TableHead className="text-right">Worth now</TableHead>
                          <TableHead className="text-right">Unrealized</TableHead>
                          <TableHead className="text-right">Realized</TableHead>
                          <TableHead className="text-right">Dividends</TableHead>
                          <TableHead className="text-right pr-6">Total return</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {holdings.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="pl-6 font-medium">
                              {h.name} <Badge variant="outline" className="ml-1 text-xs">{h.tier}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatVND(Math.round(h.invested))}</TableCell>
                            <TableCell className="text-right font-medium">{formatVND(Math.round(h.value))}</TableCell>
                            <TableCell className={`text-right ${gainClass(h.unrealized)}`}>{signed(h.unrealized)}</TableCell>
                            <TableCell className={`text-right ${h.realized ? gainClass(h.realized) : "text-muted-foreground"}`}>
                              {h.realized ? signed(h.realized) : "—"}
                            </TableCell>
                            <TableCell className={`text-right ${h.dividends ? "text-success" : "text-muted-foreground"}`}>
                              {h.dividends ? formatVND(Math.round(h.dividends)) : "—"}
                            </TableCell>
                            <TableCell className={`text-right pr-6 font-bold ${gainClass(h.returnPct)}`}>
                              {h.returnPct > 0 ? "+" : ""}{h.returnPct.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The table covers each asset since you first bought it, best return first.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
