import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatVND, formatVNDCompact, getMonthKey, getMonthLabel } from "@/lib/format";
import {
  avgMonthlyAmount,
  crossoverTargetNW,
  monthsToTarget,
  monthLabelFromNow,
} from "@/lib/fire-math";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  BarChart3,
  AlertTriangle,
  Bell,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import OnboardingModal from "@/components/OnboardingModal";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import HintBanner from "@/components/HintBanner";
import CollapsibleAlerts from "@/components/CollapsibleAlerts";
import PageTourButton from "@/components/PageTourButton";
import { usePageTour } from "@/hooks/use-page-tour";
import { ASSET_TYPE_COLORS, STATUS_CHART_COLORS } from "@/lib/chart-colors";

function DeltaChip({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-success" : "text-destructive"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// Essentials / Lifestyle / Savings — reuses the app's 3 status tokens so the
// meaning (needs / discretionary / growth) matches everywhere else.
const ALLOC_COLORS = [
  STATUS_CHART_COLORS.primary,
  STATUS_CHART_COLORS.warning,
  STATUS_CHART_COLORS.success,
];

export default function Dashboard() {
  const {
    data,
    getTotalIncome,
    getTotalExpenses,
    getNetWorth,
    getTotalSavings,
    getTotalInvestments,
    getTotalInvestmentCost,
  } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const { startTour } = usePageTour("dashboard");
  // Remove editing state for age; age is now always read-only and auto-calculated

  const isFirstVisit =
    !localStorage.getItem("onboarding_complete") &&
    data.transactions.length === 0 &&
    (data.portfolio?.length ?? 0) === 0 &&
    data.categories.length === 0;
  const [showOnboarding, setShowOnboarding] = useState(isFirstVisit);
  const [compact, setCompact] = useState(() => localStorage.getItem("dashboard_compact") === "1");

  const fmt = compact ? formatVNDCompact : formatVND;
  const toggleCompact = () => {
    setCompact((v) => {
      localStorage.setItem("dashboard_compact", v ? "0" : "1");
      return !v;
    });
  };

  const monthKey = getMonthKey();
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonthKey = getMonthKey(prevDate);

  const income = getTotalIncome(monthKey);
  const expenses = getTotalExpenses(monthKey);
  const savings = income - expenses;
  const ratio = income > 0 ? ((expenses / income) * 100).toFixed(1) : "0";
  const netWorth = getNetWorth();
  const totalSavings = getTotalSavings();
  const totalInvestments = getTotalInvestments();

  const prevIncome = getTotalIncome(prevMonthKey);
  const prevExpenses = getTotalExpenses(prevMonthKey);
  const prevSavings = prevIncome - prevExpenses;

  // Smart alerts
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();

  const budgetAlerts: string[] = [];
  const plan = data.monthlyPlans?.[monthKey] ?? {};
  data.categories.forEach((cat) => {
    const planned = plan[cat.id]?.planned ?? 0;
    if (planned <= 0) return;
    const actual = data.transactions
      .filter((t) => t.date.startsWith(monthKey) && t.category_id === cat.id)
      .reduce((s, t) => s + t.amount, 0);
    const pct = (actual / planned) * 100;
    if (pct >= 80 && actual < planned) {
      budgetAlerts.push(`${cat.emoji} ${cat.name} is ${pct.toFixed(0)}% used with ${daysLeft} days left`);
    } else if (actual >= planned) {
      budgetAlerts.push(`${cat.emoji} ${cat.name} has exceeded budget (${formatVND(actual - planned)} over)`);
    }
  });

  const portfolioAlerts: string[] = [];
  (data.portfolio ?? []).forEach((p) => {
    if (p.purchasePrice > 0 && p.currentPrice < p.purchasePrice) {
      const drop = ((p.purchasePrice - p.currentPrice) / p.purchasePrice) * 100;
      if (drop >= 5) {
        portfolioAlerts.push(`${p.name} dropped ${drop.toFixed(1)}% below purchase price`);
      }
    }
  });

  const subscriptionAlerts: string[] = [];
  (data.subscriptions ?? []).forEach((sub) => {
    const dueThisMonth = sub.due_day - today.getDate();
    if (dueThisMonth >= 0 && dueThisMonth <= 7) {
      subscriptionAlerts.push(`${sub.name} renews in ${dueThisMonth === 0 ? "today" : `${dueThisMonth} day${dueThisMonth !== 1 ? "s" : ""}`} (${formatVND(sub.amount)})`);
    }
  });

  const allAlerts = [...budgetAlerts, ...portfolioAlerts, ...subscriptionAlerts];

  const allocData = [
    { name: "Essentials", value: data.incomeAllocations.essentials_pct },
    { name: "Lifestyle", value: data.incomeAllocations.lifestyle_pct },
    { name: "Savings", value: data.incomeAllocations.savings_pct },
  ];

  // FIRE Goals Calculation
  const { monthlyExpenses, returnRate, birthYear } = data.fireSettings;
  const dob = (user?.user_metadata as any)?.date_of_birth as string | undefined;
  const currentYear = new Date().getFullYear();
  const currentAge = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : birthYear
      ? currentYear - birthYear
      : 0;
  const annualExpenses = monthlyExpenses * 12;
  const fiNumber = annualExpenses * 25;
  const currentNetWorth = getNetWorth();
  const fireProgress = Math.min(100, (currentNetWorth / fiNumber) * 100);

  const yearsToGrow = 14;
  const months = yearsToGrow * 12;
  const r = returnRate / 100 / 12;
  const fvPrincipal = currentNetWorth * Math.pow(1 + r, months);
  const remainingTarget = fiNumber - fvPrincipal;
  const requiredMonthlySavings =
    remainingTarget > 0
      ? (remainingTarget * r) / (Math.pow(1 + r, months) - 1)
      : 0;

  // Stock/Bond allocation based on "110 minus age" rule
  const targetStockAllocation = 110 - currentAge;
  const targetBondAllocation = 100 - targetStockAllocation;

  // Calculate actual portfolio allocation
  const calculatePortfolioAllocation = () => {
    if (!data.portfolio || data.portfolio.length === 0) {
      return { stocks: 0, bonds: 0, other: 0, total: 0 };
    }

    const portfolioValue = data.portfolio.reduce((sum, p) => {
      return sum + p.quantity * p.currentPrice;
    }, 0);

    if (portfolioValue === 0) {
      return { stocks: 0, bonds: 0, other: 0, total: 0 };
    }

    // Tier-based allocation: Growth+Risk = equity, Defensive+Safe = bonds/safe, rest = other
    const stocks = data.portfolio
      .filter((p) => p.tier === "Growth" || p.tier === "Risk")
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);

    const bonds = data.portfolio
      .filter((p) => p.tier === "Safe" || p.tier === "Defensive")
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);

    const other = portfolioValue - stocks - bonds;

    return {
      stocks: (stocks / portfolioValue) * 100,
      bonds: (bonds / portfolioValue) * 100,
      other: (other / portfolioValue) * 100,
      total: portfolioValue,
    };
  };

  const portfolioAllocation = calculatePortfolioAllocation();

  // Crossover Point Calculation
  const dividendByMonth: Record<string, number> = {};
  data.transactions
    .filter((t) => t.type === "dividend")
    .forEach((t) => {
      const month = t.date.slice(0, 7);
      dividendByMonth[month] = (dividendByMonth[month] || 0) + t.amount;
    });
  const recentDividendMonths = Object.keys(dividendByMonth)
    .sort()
    .slice(-3)
    .map((k) => dividendByMonth[k]);
  const passiveIncomePerMonth =
    recentDividendMonths.length > 0
      ? recentDividendMonths.reduce((s, v) => s + v, 0) /
        recentDividendMonths.length
      : 0;
  // Same expense basis as the FIRE page: real spending if available, else settings
  const avgActualExpenses = avgMonthlyAmount(data.transactions, ["expense"]);
  const crossoverExpenses =
    avgActualExpenses > 0 ? avgActualExpenses : monthlyExpenses;

  const coveragePct =
    crossoverExpenses > 0
      ? (passiveIncomePerMonth / crossoverExpenses) * 100
      : 0;

  // Crossover date — identical math to the FIRE page (fire-math), so the
  // Dashboard and the FIRE Roadmap always show the same date.
  const avgContribution = avgMonthlyAmount(data.transactions, [
    "investing",
    "saving",
  ]);
  const crossNW = crossoverTargetNW(crossoverExpenses, returnRate);
  const monthsToCross = isFinite(crossNW)
    ? monthsToTarget(getNetWorth(), avgContribution, crossNW, returnRate)
    : null;
  const insightText =
    coveragePct < 10
      ? "Start logging dividend income to track your passive income growth."
      : coveragePct < 50
        ? "Good start. Keep building your income-generating assets."
        : coveragePct < 100
          ? "Almost there — passive income is nearly covering your expenses!"
          : "You've reached the crossover point!";

  // Age is now always read-only and auto-calculated from birthYear

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h1 data-tour="page-title" className="text-2xl font-bold flex items-center gap-1">
          Overview — {getMonthLabel(monthKey)}
          <PageTourButton onClick={startTour} />
        </h1>
        <button
          onClick={toggleCompact}
          className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors"
          title="Toggle compact numbers"
        >
          {compact ? "Full" : "Compact"}
        </button>
      </div>

      <OnboardingChecklist />

      {/* Smart Alerts */}
      {allAlerts.length > 0 && <CollapsibleAlerts budgetAlerts={budgetAlerts} portfolioAlerts={portfolioAlerts} subscriptionAlerts={subscriptionAlerts} />}

      <HintBanner
        pageKey="dashboard"
        message="👋 Welcome to your Dashboard. The Crossover Point shows when your passive income will cover your expenses — your true financial freedom date. Log dividend transactions to start tracking it."
      />

      {/* Hero Balance Card */}
      <div data-tour="net-worth" className="hero-gradient rounded-3xl p-8 text-white border-2 border-outline card-shadow">
        <p className="text-sm text-white/80 mb-2">Total Net Worth</p>
        <h2 className="font-bold text-3xl">{fmt(netWorth)}</h2>
      </div>

      {/* Summary cards */}
      <div data-tour="monthly-summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {fmt(income)}
            </p>
            <DeltaChip current={income} previous={prevIncome} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {fmt(expenses)}
            </p>
            <DeltaChip current={expenses} previous={prevExpenses} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Monthly Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${savings >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {fmt(savings)}
            </p>
            <DeltaChip current={savings} previous={prevSavings} />
          </CardContent>
        </Card>
        {/* <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm text-muted-foreground">
               Expense Ratio
             </CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-2xl font-bold">{ratio}%</p>
           </CardContent>
          </Card> */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Savings (Portfolio)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {fmt(totalSavings)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Investments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {fmt(Math.round(totalInvestments))}
            </p>
            {(() => {
              const cost = getTotalInvestmentCost();
              const roi =
                cost > 0 ? ((totalInvestments - cost) / cost) * 100 : 0;
              const profit = totalInvestments - cost;
              const isPositive = profit >= 0;
              return (
                <p
                  className={`text-sm mt-1 ${isPositive ? "text-primary" : "text-destructive"}`}
                >
                  {isPositive ? "+" : ""}
                  {roi.toFixed(2)}% ({isPositive ? "+" : ""}
                  {formatVND(Math.round(profit))})
                </p>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Income Allocation</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    dataKey="value"
                    stroke="none"
                  >
                    {allocData.map((_, i) => (
                      <Cell key={i} fill={ALLOC_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-sm">
              {allocData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: ALLOC_COLORS[i] }}
                  />

                  <span>
                    {d.name}: {d.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            {(() => {
              const portfolio = data.portfolio ?? [];
              const investmentEntries = portfolio.filter(
                (e) => e.type !== "Other",
              );
              const chartData = Object.entries(
                investmentEntries.reduce(
                  (acc, e) => {
                    const val = Number(e.quantity) * Number(e.currentPrice);
                    acc[e.type] = (acc[e.type] || 0) + val;
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
              )
                .map(([name, value]) => ({ name, value: Math.ceil(value) }))
                .filter((d) => d.value > 0);
              const total = chartData.reduce((s, d) => s + d.value, 0);

              if (chartData.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    No portfolio data yet.
                  </p>
                );
              }

              return (
                <>
                  <div className="w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={55}
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={ASSET_TYPE_COLORS[entry.name] || "hsl(var(--chart-7))"}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatVND(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-sm">
                    {chartData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            background: ASSET_TYPE_COLORS[d.name] || "hsl(var(--chart-7))",
                          }}
                        />

                        <span>
                          {d.name}:{" "}
                          {total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}
                          %
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Crossover Point */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp
              className="h-5 w-5 text-success"
              strokeWidth={1.5}
            />
            Passive Income &amp; Crossover Point
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Avg Monthly Dividend
              </p>
              <p className="text-2xl font-bold text-success">
                {formatVND(Math.round(passiveIncomePerMonth))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expense Coverage</p>
              <p className="text-2xl font-bold">{coveragePct.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                Covers {coveragePct.toFixed(1)}% of your monthly expenses
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Crossover Point
              </p>
              <p className="text-2xl font-bold text-primary">
                {monthsToCross === null
                  ? "—"
                  : monthsToCross <= 0
                    ? "Now!"
                    : monthLabelFromNow(monthsToCross)}
              </p>
              {monthsToCross !== null && monthsToCross > 0 && (
                <p className="text-xs text-muted-foreground">
                  {monthsToCross} months away
                </p>
              )}
            </div>
          </div>
          <Progress value={Math.min(100, coveragePct)} className="h-2" />
          <p className="text-sm text-muted-foreground">{insightText}</p>
        </CardContent>
      </Card>

      {/* Income Quality */}
      {(() => {
        const monthIncomeTransactions = data.transactions.filter(
          (t) => t.date.startsWith(monthKey) && t.type === "income",
        );
        const totalIncomeAmt = monthIncomeTransactions.reduce(
          (s, t) => s + t.amount,
          0,
        );
        const activeAmt = monthIncomeTransactions
          .filter((t) => !t.quality || t.quality === "active")
          .reduce((s, t) => s + t.amount, 0);
        const scalableAmt = monthIncomeTransactions
          .filter((t) => t.quality === "scalable")
          .reduce((s, t) => s + t.amount, 0);
        const passiveAmt = monthIncomeTransactions
          .filter((t) => t.quality === "passive")
          .reduce((s, t) => s + t.amount, 0);
        const activePct =
          totalIncomeAmt > 0 ? (activeAmt / totalIncomeAmt) * 100 : 0;
        const scalablePct =
          totalIncomeAmt > 0 ? (scalableAmt / totalIncomeAmt) * 100 : 0;
        const passivePct =
          totalIncomeAmt > 0 ? (passiveAmt / totalIncomeAmt) * 100 : 0;

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3
                  className="h-5 w-5 text-primary"
                  strokeWidth={1.5}
                />
                Income Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {totalIncomeAmt === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No income transactions this month.
                </p>
              ) : (
                <>
                  <div className="flex rounded-full overflow-hidden h-4">
                    {activePct > 0 && (
                      <div
                        style={{ width: `${activePct}%` }}
                        className="bg-destructive transition-all"
                        title={`Active: ${activePct.toFixed(1)}%`}
                      />
                    )}
                    {scalablePct > 0 && (
                      <div
                        style={{ width: `${scalablePct}%` }}
                        className="bg-warning transition-all"
                        title={`Scalable: ${scalablePct.toFixed(1)}%`}
                      />
                    )}
                    {passivePct > 0 && (
                      <div
                        style={{ width: `${passivePct}%` }}
                        className="bg-success transition-all"
                        title={`Passive: ${passivePct.toFixed(1)}%`}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                        Active
                      </div>
                      <p className="font-semibold">{activePct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {formatVND(Math.round(activeAmt))}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                        Scalable
                      </div>
                      <p className="font-semibold">{scalablePct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {formatVND(Math.round(scalableAmt))}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-success" />
                        Passive
                      </div>
                      <p className="font-semibold">{passivePct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {formatVND(Math.round(passiveAmt))}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-xs ${passivePct >= 30 ? "text-success" : "text-muted-foreground"}`}
                  >
                    Target: &gt;30% Passive — currently {passivePct.toFixed(1)}%
                    {passivePct >= 30 ? " ✓" : ""}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* FIRE Goals Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              F.I. Target (Rule of 25)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatVND(fiNumber)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {formatVND(monthlyExpenses)}/mo expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              F.I. Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fireProgress.toFixed(2)}%</div>
            <Progress value={fireProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">
              Required Monthly Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatVND(requiredMonthlySavings)}
            </div>
            <div className="flex items-center gap-1 text-xs text-primary mt-1">
              <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
              <span>
                To retire in {yearsToGrow} years (@{returnRate}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Age Settings & Target Asset Allocation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Target Asset Allocation (Rule of 110)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Age Display (read-only) */}
          <div className="space-y-3">
            <Label>Your Current Age</Label>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-primary">
                {currentAge}{" "}
                {dob ? (
                  <span className="text-xs text-muted-foreground">
                    (born {new Date(dob).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })})
                  </span>
                ) : birthYear ? (
                  <span className="text-xs text-muted-foreground">
                    (born {birthYear})
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Formula: Target Stocks = 110 - Age | Target Bonds = 100 - Stocks
            </p>
          </div>

          {/* Asset Allocation Comparison */}
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Target Allocation */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Target Allocation</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center gap-1.5">
                      <TrendingUp
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.5}
                      />{" "}
                      Stocks/Equity
                    </span>
                    <span className="font-bold">{targetStockAllocation}%</span>
                  </div>
                  <Progress value={targetStockAllocation} className="h-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center gap-1.5">
                      <Landmark
                        className="h-4 w-4 text-success"
                        strokeWidth={1.5}
                      />{" "}
                      Bonds/Safe
                    </span>
                    <span className="font-bold">{targetBondAllocation}%</span>
                  </div>
                  <Progress value={targetBondAllocation} className="h-2" />
                </div>
              </div>

              {/* Actual Allocation */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Actual Allocation</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center gap-1.5">
                      <TrendingUp
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.5}
                      />{" "}
                      Stocks/Equity
                    </span>
                    <span className="font-bold">
                      {portfolioAllocation.stocks.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={portfolioAllocation.stocks}
                    className="h-2"
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center gap-1.5">
                      <Landmark
                        className="h-4 w-4 text-success"
                        strokeWidth={1.5}
                      />{" "}
                      Bonds/Safe
                    </span>
                    <span className="font-bold">
                      {portfolioAllocation.bonds.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={portfolioAllocation.bonds} className="h-2" />
                  {portfolioAllocation.other > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Income / Other</span>
                        <span className="font-bold">
                          {portfolioAllocation.other.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={portfolioAllocation.other}
                        className="h-2"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Allocation Summary */}
            {portfolioAllocation.total > 0 && (
              <div className="bg-muted p-4 rounded-lg text-sm">
                <p className="font-semibold mb-2">
                  Portfolio Value: {formatVND(portfolioAllocation.total)}
                </p>
                <p className="text-muted-foreground">
                  Your portfolio is currently{" "}
                  {Math.abs(
                    portfolioAllocation.stocks - targetStockAllocation,
                  ).toFixed(1)}
                  % off target for stocks.
                  {portfolioAllocation.stocks > targetStockAllocation
                    ? " Consider rebalancing towards bonds."
                    : " Consider rebalancing towards stocks."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}
