import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  Target,
  Check,
  Pencil,
  X,
  TrendingDown,
  Landmark,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import OnboardingModal from "@/components/OnboardingModal";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import HintBanner from "@/components/HintBanner";
import PageTourButton from "@/components/PageTourButton";
import { usePageTour } from "@/hooks/use-page-tour";

const ALLOC_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(217, 91%, 60%)",
];

const PORTFOLIO_COLORS: Record<string, string> = {
  Savings: "#22c55e",
  Stocks: "#3b82f6",
  Crypto: "#a855f7",
  Gold: "#eab308",
  ETF: "#14b8a6",
  Other: "#64748b",
};

export default function Dashboard() {
  const {
    data,
    getTotalIncome,
    getTotalExpenses,
    getNetWorth,
    getTotalSavings,
    getTotalInvestments,
    getTotalInvestmentCost,
    updateFireSettings,
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

  const monthKey = getMonthKey();
  const income = getTotalIncome(monthKey);
  const expenses = getTotalExpenses(monthKey);
  const savings = income - expenses;
  const ratio = income > 0 ? ((expenses / income) * 100).toFixed(1) : "0";
  const netWorth = getNetWorth();
  const totalSavings = getTotalSavings();
  const totalInvestments = getTotalInvestments();

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

    const stocks = data.portfolio
      .filter(
        (p) =>
          p.type.toLowerCase().includes("stock") ||
          p.type.toLowerCase().includes("equity"),
      )
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);

    const bonds = data.portfolio
      .filter(
        (p) =>
          p.type.toLowerCase().includes("bond") ||
          p.type.toLowerCase().includes("fixed"),
      )
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
  const coveragePct =
    monthlyExpenses > 0 ? (passiveIncomePerMonth / monthlyExpenses) * 100 : 0;
  const crossoverYears =
    passiveIncomePerMonth > 0
      ? Math.log(monthlyExpenses / passiveIncomePerMonth) /
        Math.log(1 + returnRate / 100)
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
      </div>

      <OnboardingChecklist />

      <HintBanner
        pageKey="dashboard"
        message="👋 Welcome to your Dashboard. The Crossover Point shows when your passive income will cover your expenses — your true financial freedom date. Log dividend transactions to start tracking it."
      />

      {/* Hero Balance Card */}
      <div data-tour="net-worth" className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-3xl p-8 text-white shadow-lg">
        <p className="text-sm text-blue-100 mb-2">Total Net Worth</p>
        <h2 className="font-bold text-3xl">{formatVND(netWorth)}</h2>
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
              {formatVND(income)}
            </p>
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
              {formatVND(expenses)}
            </p>
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
              {formatVND(savings)}
            </p>
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
              {formatVND(totalSavings)}
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
            <p className="text-2xl font-bold text-blue-600">
              {formatVND(Math.round(totalInvestments))}
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
                              fill={PORTFOLIO_COLORS[entry.name] || "#8884d8"}
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
                            background: PORTFOLIO_COLORS[d.name] || "#8884d8",
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
              className="h-5 w-5 text-emerald-500"
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
              <p className="text-2xl font-bold text-emerald-600">
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
                Years to Crossover
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {crossoverYears === null
                  ? "—"
                  : crossoverYears <= 0
                    ? "Now!"
                    : crossoverYears.toFixed(1)}
              </p>
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
                  className="h-5 w-5 text-blue-500"
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
                        className="bg-red-400 transition-all"
                        title={`Active: ${activePct.toFixed(1)}%`}
                      />
                    )}
                    {scalablePct > 0 && (
                      <div
                        style={{ width: `${scalablePct}%` }}
                        className="bg-yellow-400 transition-all"
                        title={`Scalable: ${scalablePct.toFixed(1)}%`}
                      />
                    )}
                    {passivePct > 0 && (
                      <div
                        style={{ width: `${passivePct}%` }}
                        className="bg-green-400 transition-all"
                        title={`Passive: ${passivePct.toFixed(1)}%`}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        Active
                      </div>
                      <p className="font-semibold">{activePct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {formatVND(Math.round(activeAmt))}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        Scalable
                      </div>
                      <p className="font-semibold">{scalablePct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {formatVND(Math.round(scalableAmt))}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        Passive
                      </div>
                      <p className="font-semibold">{passivePct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {formatVND(Math.round(passiveAmt))}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-xs ${passivePct >= 30 ? "text-green-600" : "text-muted-foreground"}`}
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

        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-600">
              Required Monthly Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatVND(requiredMonthlySavings)}
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
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
                        className="h-4 w-4 text-blue-500"
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
                        className="h-4 w-4 text-emerald-500"
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
                        className="h-4 w-4 text-blue-500"
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
                        className="h-4 w-4 text-emerald-500"
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
                        <span className="text-sm">Other</span>
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
