import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND } from "@/lib/format";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HintBanner from "@/components/HintBanner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type ReportType = "monthly" | "yearly";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PIE_COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981",
  "#8b5cf6", "#f97316", "#14b8a6", "#6366f1",
];

const formatMonthLabel = (key: string) => {
  const [year, month] = key.split("-");
  const name = MONTH_NAMES[parseInt(month, 10) - 1]?.slice(0, 3) ?? "";
  return `${name} ${year}`;
};

const currentMonthKey = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
})();

export default function Report() {
  const { data } = useApp();
  const { transactions } = data;

  // Cash Flow tab state
  const [view, setView] = useState<ReportType>("monthly");
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Spending tab toggle
  const [spendingView, setSpendingView] = useState<"month" | "alltime">("month");

  // ── CASH FLOW ────────────────────────────────────────────────────
  const years = useMemo(() => {
    const uniqueYears = Array.from(
      new Set(transactions.map((t) => new Date(t.date).getFullYear())),
    );
    return uniqueYears.sort((a, b) => b - a).map(String);
  }, [transactions]);

  const reportData = useMemo(() => {
    const grouped: Record<
      string,
      { income: number; capitalGains: number; expense: number; saving: number; investing: number; netChange: number }
    > = {};

    transactions.forEach((t) => {
      const date = new Date(t.date);
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      let key = view === "monthly" ? `${year}-${month}` : year;

      if (view === "monthly") {
        if (year !== selectedYear) return;
        if (selectedMonth !== "all" && month !== selectedMonth) return;
      }

      if (!grouped[key]) {
        grouped[key] = { income: 0, capitalGains: 0, expense: 0, saving: 0, investing: 0, netChange: 0 };
      }
      if (t.type === "income") { grouped[key].income += t.amount; grouped[key].netChange += t.amount; }
      else if (t.type === "sell") { grouped[key].capitalGains += t.realized_gain || 0; grouped[key].netChange += t.amount; }
      else if (t.type === "expense") { grouped[key].expense += t.amount; grouped[key].netChange -= t.amount; }
      else if (t.type === "saving") { grouped[key].saving += t.amount; }
      else if (t.type === "investing") { grouped[key].investing += t.amount; }
    });

    return Object.entries(grouped)
      .map(([period, values]) => ({ period, ...values, savedInvested: values.saving + values.investing }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [transactions, view, selectedYear, selectedMonth]);

  const totalIncome = reportData.reduce((s, d) => s + d.income, 0);
  const totalCapitalGains = reportData.reduce((s, d) => s + d.capitalGains, 0);
  const totalExpenses = reportData.reduce((s, d) => s + d.expense, 0);
  const totalSavedInvested = reportData.reduce((s, d) => s + d.saving + d.investing, 0);
  const netChange = totalIncome + totalCapitalGains - totalExpenses;

  // ── NET WORTH TREND ──────────────────────────────────────────────
  const netWorthData = useMemo(() => {
    const monthsSet = new Set(transactions.map((t) => t.date.slice(0, 7)));
    const months = Array.from(monthsSet).sort();
    let cumIncome = 0, cumExpenses = 0, cumInvesting = 0;

    return months.map((month) => {
      transactions
        .filter((t) => t.date.slice(0, 7) === month)
        .forEach((t) => {
          if (t.type === "income") cumIncome += t.amount;
          else if (t.type === "expense") cumExpenses += t.amount;
          else if (t.type === "investing") cumInvesting += t.amount;
        });
      return { month, label: formatMonthLabel(month), netWorth: cumIncome - cumExpenses + cumInvesting };
    });
  }, [transactions]);

  // ── SAVINGS RATE ─────────────────────────────────────────────────
  const savingsRateData = useMemo(() => {
    const map: Record<string, { income: number; expenses: number }> = {};
    transactions.forEach((t) => {
      const month = t.date.slice(0, 7);
      if (!map[month]) map[month] = { income: 0, expenses: 0 };
      if (t.type === "income") map[month].income += t.amount;
      else if (t.type === "expense") map[month].expenses += t.amount;
    });
    return Object.entries(map)
      .filter(([, v]) => v.income > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        label: formatMonthLabel(month),
        rate: ((v.income - v.expenses) / v.income) * 100,
      }));
  }, [transactions]);

  const avgSavingsRate =
    savingsRateData.length > 0
      ? savingsRateData.reduce((s, d) => s + d.rate, 0) / savingsRateData.length
      : 0;
  const savingsLineColor =
    avgSavingsRate > 50 ? "#16a34a" : avgSavingsRate < 30 ? "#ef4444" : "#f59e0b";

  const currentMonthRate = (() => {
    const inc = transactions
      .filter((t) => t.date.startsWith(currentMonthKey) && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const exp = transactions
      .filter((t) => t.date.startsWith(currentMonthKey) && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return inc > 0 ? ((inc - exp) / inc) * 100 : null;
  })();

  // ── SPENDING BY CATEGORY ─────────────────────────────────────────
  const thisMonthExpenses = useMemo(() => {
    const byCategory: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense" && t.date.startsWith(currentMonthKey))
      .forEach((t) => {
        const cat = data.categories.find((c) => c.id === t.category_id);
        const name = cat ? `${cat.emoji} ${cat.name}` : "Other";
        byCategory[name] = (byCategory[name] || 0) + t.amount;
      });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [transactions, data.categories]);

  const thisMonthTotal = thisMonthExpenses.reduce((s, d) => s + d.value, 0);

  const allTimeExpenses = useMemo(() => {
    const byCategory: Record<string, { total: number; type: string }> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = data.categories.find((c) => c.id === t.category_id);
        const name = cat ? `${cat.emoji} ${cat.name}` : "Other";
        const type = cat?.type ?? "nonessential";
        if (!byCategory[name]) byCategory[name] = { total: 0, type };
        byCategory[name].total += t.amount;
      });
    return Object.entries(byCategory)
      .map(([name, { total, type }]) => ({ name, value: total, type }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions, data.categories]);

  // ── PORTFOLIO ROI ─────────────────────────────────────────────────
  const portfolioROI = useMemo(() => {
    return (data.portfolio ?? []).map((entry) => {
      const qty = Number(entry.quantity) || 0;
      const buyPrice = Number(entry.purchasePrice) || 0;
      const curPrice = Number(entry.currentPrice) || 0;
      const costBasis = qty * buyPrice;
      const currentValue = qty * curPrice;
      const unrealizedGain = currentValue - costBasis;
      const unrealizedGainPct = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;
      const realizedGain = transactions
        .filter((t) => t.type === "sell" && t.portfolio_entry_id === entry.id)
        .reduce((s, t) => s + (t.realized_gain || 0), 0);
      const totalReturn = unrealizedGain + realizedGain;
      const totalReturnPct = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;
      return { ...entry, costBasis, currentValue, unrealizedGain, unrealizedGainPct, realizedGain, totalReturn, totalReturnPct };
    });
  }, [data.portfolio, transactions]);

  const totalPortfolioValue = portfolioROI.reduce((s, e) => s + e.currentValue, 0);
  const totalUnrealized = portfolioROI.reduce((s, e) => s + e.unrealizedGain, 0);
  const totalRealized = portfolioROI.reduce((s, e) => s + e.realizedGain, 0);
  const bestPerformer = portfolioROI.length > 0
    ? portfolioROI.reduce((a, b) => (b.totalReturnPct > a.totalReturnPct ? b : a))
    : null;
  const worstPerformer = portfolioROI.length > 0
    ? portfolioROI.reduce((a, b) => (b.totalReturnPct < a.totalReturnPct ? b : a))
    : null;

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Report</h1>

      <HintBanner
        pageKey="reports"
        message="📊 Your financial reports update automatically as you log transactions. Add at least 2 months of data for trend charts to appear."
      />

      <Tabs defaultValue="cashflow">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="networth">Net Worth</TabsTrigger>
          <TabsTrigger value="savingsrate">Savings Rate</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio ROI</TabsTrigger>
        </TabsList>

        {/* ─── CASH FLOW ─── */}
        <TabsContent value="cashflow" className="space-y-6 mt-4">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {view === "monthly" && (
              <>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px]"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {years.length > 0 ? years.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    )) : (
                      <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[130px]"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTH_NAMES.map((name, index) => (
                      <SelectItem key={name} value={(index + 1).toString().padStart(2, "0")}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <Tabs value={view} onValueChange={(v) => { setView(v as ReportType); if (v === "yearly") setSelectedMonth("all"); }}>
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[
              { label: "Total Income", value: formatVND(totalIncome), cls: "text-green-600" },
              { label: "Capital Gains", value: `${totalCapitalGains > 0 ? "+" : ""}${formatVND(totalCapitalGains)}`, cls: totalCapitalGains >= 0 ? "text-emerald-500" : "text-red-600" },
              { label: "Total Expenses", value: formatVND(totalExpenses), cls: "text-red-600" },
              { label: "Saved & Invested", value: formatVND(totalSavedInvested), cls: "text-blue-600" },
              { label: "Net Cash Flow", value: `${netChange > 0 ? "+" : ""}${formatVND(netChange)}`, cls: netChange >= 0 ? "text-primary" : "text-destructive" },
            ].map((c) => (
              <Card key={c.label}>
                <CardHeader className="py-4"><CardTitle className="text-sm text-muted-foreground">{c.label}</CardTitle></CardHeader>
                <CardContent className={`text-2xl font-bold ${c.cls}`}>{c.value}</CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Cash Flow Overview</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `${v / 1_000_000}M`} />
                  <Tooltip formatter={(v: number, n: string) => [formatVND(v), n]} />
                  <Legend />
                  <Bar dataKey="income" name="Income" stackId="income" fill="#16a34a" />
                  <Bar dataKey="capitalGains" name="Capital Gains" stackId="income" fill="#86efac" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="savedInvested" name="Saved/Invested" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Detailed Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right text-green-600">Income</TableHead>
                    <TableHead className="text-right text-emerald-500">Capital Gains</TableHead>
                    <TableHead className="text-right text-red-600">Expenses</TableHead>
                    <TableHead className="text-right text-purple-600">Savings</TableHead>
                    <TableHead className="text-right text-blue-600">Investment</TableHead>
                    <TableHead className="text-right">Net Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transaction data found for this period.
                      </TableCell>
                    </TableRow>
                  ) : reportData.map((row) => (
                    <TableRow key={row.period}>
                      <TableCell className="font-medium">{row.period}</TableCell>
                      <TableCell className="text-right">{formatVND(row.income)}</TableCell>
                      <TableCell className={`text-right ${row.capitalGains >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {row.capitalGains > 0 ? "+" : ""}{formatVND(row.capitalGains)}
                      </TableCell>
                      <TableCell className="text-right">{formatVND(row.expense)}</TableCell>
                      <TableCell className="text-right">{formatVND(row.saving)}</TableCell>
                      <TableCell className="text-right">{formatVND(row.investing)}</TableCell>
                      <TableCell className={`text-right font-bold ${row.netChange >= 0 ? "text-primary" : "text-destructive"}`}>
                        {row.netChange > 0 ? "+" : ""}{formatVND(row.netChange)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── NET WORTH TREND ─── */}
        <TabsContent value="networth" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {netWorthData.length < 2 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Add at least 2 months of transactions to see your net worth trend.
                </p>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={netWorthData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [formatVND(v), "Net Worth"]} />
                      <Line
                        type="monotone"
                        dataKey="netWorth"
                        name="Net Worth"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SAVINGS RATE ─── */}
        <TabsContent value="savingsrate" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Savings Rate Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {currentMonthRate !== null && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">This month</p>
                  <p className={`text-3xl font-bold ${currentMonthRate >= 50 ? "text-green-600" : currentMonthRate < 30 ? "text-destructive" : "text-amber-500"}`}>
                    {currentMonthRate.toFixed(1)}%
                  </p>
                </div>
              )}
              {savingsRateData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No income transactions found. Add income to track savings rate.
                </p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={savingsRateData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Savings Rate"]} />
                      <ReferenceLine
                        y={50}
                        stroke="#6b7280"
                        strokeDasharray="4 3"
                        label={{ value: "FIRE Target 50%", position: "insideTopRight", fontSize: 11, fill: "#6b7280" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="Savings Rate"
                        stroke={savingsLineColor}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SPENDING BY CATEGORY ─── */}
        <TabsContent value="spending" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>Spending by Category</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={spendingView === "month" ? "default" : "outline"}
                    onClick={() => setSpendingView("month")}
                  >
                    This Month
                  </Button>
                  <Button
                    size="sm"
                    variant={spendingView === "alltime" ? "default" : "outline"}
                    onClick={() => setSpendingView("alltime")}
                  >
                    All Time
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {spendingView === "month" ? (
                thisMonthExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No expense transactions this month.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Total: <span className="font-semibold text-foreground">{formatVND(thisMonthTotal)}</span>
                    </p>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={thisMonthExpenses}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, percent }) =>
                              `${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={true}
                          >
                            {thisMonthExpenses.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatVND(v)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              ) : (
                allTimeExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No expense transactions found.
                  </p>
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={allTimeExpenses}
                        margin={{ top: 10, right: 20, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => [formatVND(v), "Amount"]} />
                        <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                          {allTimeExpenses.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.type === "essential" ? "#3b82f6" : "#f97316"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Essential</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> Non-essential</span>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PORTFOLIO ROI ─── */}
        <TabsContent value="portfolio" className="space-y-4 mt-4">
          {portfolioROI.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No portfolio entries yet. Add assets in the Portfolio page to see performance here.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Portfolio Value</p>
                    <p className="text-lg font-bold text-primary">{formatVND(Math.round(totalPortfolioValue))}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                    <p className={`text-lg font-bold ${totalUnrealized >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {totalUnrealized >= 0 ? "+" : ""}{formatVND(Math.round(totalUnrealized))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Realized Gain</p>
                    <p className={`text-lg font-bold ${totalRealized >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {totalRealized >= 0 ? "+" : ""}{formatVND(Math.round(totalRealized))}
                    </p>
                  </CardContent>
                </Card>
                {bestPerformer && (
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-xs text-muted-foreground">Best Performer</p>
                      <p className="text-sm font-bold truncate">{bestPerformer.name}</p>
                      <p className="text-sm text-green-600 font-medium">
                        +{bestPerformer.totalReturnPct.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                )}
                {worstPerformer && worstPerformer.name !== bestPerformer?.name && (
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-xs text-muted-foreground">Worst Performer</p>
                      <p className="text-sm font-bold truncate">{worstPerformer.name}</p>
                      <p className={`text-sm font-medium ${worstPerformer.totalReturnPct >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {worstPerformer.totalReturnPct >= 0 ? "+" : ""}{worstPerformer.totalReturnPct.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* ROI Table */}
              <Card>
                <CardHeader><CardTitle>Portfolio Performance</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="text-right">Cost Basis</TableHead>
                        <TableHead className="text-right">Current Value</TableHead>
                        <TableHead className="text-right">Unrealized</TableHead>
                        <TableHead className="text-right">Unr. %</TableHead>
                        <TableHead className="text-right">Realized</TableHead>
                        <TableHead className="text-right">Total Return %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portfolioROI.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{e.tier}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatVND(Math.round(e.costBasis))}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatVND(Math.round(e.currentValue))}
                          </TableCell>
                          <TableCell className={`text-right text-sm font-medium ${e.unrealizedGain >= 0 ? "text-green-600" : "text-destructive"}`}>
                            {e.unrealizedGain >= 0 ? "+" : ""}{formatVND(Math.round(e.unrealizedGain))}
                          </TableCell>
                          <TableCell className={`text-right text-sm ${e.unrealizedGainPct >= 0 ? "text-green-600" : "text-destructive"}`}>
                            {e.unrealizedGainPct >= 0 ? "+" : ""}{e.unrealizedGainPct.toFixed(1)}%
                          </TableCell>
                          <TableCell className={`text-right text-sm ${e.realizedGain >= 0 ? "text-green-600" : "text-destructive"}`}>
                            {e.realizedGain !== 0 ? `${e.realizedGain >= 0 ? "+" : ""}${formatVND(Math.round(e.realizedGain))}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm font-bold ${e.totalReturnPct >= 0 ? "text-green-600" : "text-destructive"}`}>
                              {e.totalReturnPct >= 0 ? "▲" : "▼"} {Math.abs(e.totalReturnPct).toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
