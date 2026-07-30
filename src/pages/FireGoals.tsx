import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND } from "@/lib/format";
import {
  monthsToTarget,
  fireNumber,
  crossoverTargetNW,
  buildForecastSeries,
  avgMonthlyAmount,
  monthLabelFromNow,
} from "@/lib/fire-math";
import HintBanner from "@/components/HintBanner";
import PageTourButton from "@/components/PageTourButton";
import { usePageTour } from "@/hooks/use-page-tour";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Target, CalendarClock, TrendingUp, Wallet } from "lucide-react";
import { STATUS_CHART_COLORS } from "@/lib/chart-colors";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceDot,
} from "recharts";

const compactVND = (v: number) =>
  v >= 1_000_000_000
    ? `${(v / 1_000_000_000).toFixed(1)}B`
    : v >= 1_000_000
      ? `${Math.round(v / 1_000_000)}M`
      : `${Math.round(v / 1_000)}k`;

export default function FireGoals() {
  const { startTour } = usePageTour("fire");
  const { data, getNetWorth } = useApp();
  const { returnRate, currentAge } = data.fireSettings;

  // --- Derived from actual history (last 6 months with data) ---
  const avgIncome = useMemo(
    () => avgMonthlyAmount(data.transactions, ["income", "dividend"]),
    [data.transactions],
  );
  const avgExpenses = useMemo(
    () => avgMonthlyAmount(data.transactions, ["expense"]),
    [data.transactions],
  );
  const avgContribution = useMemo(
    () => avgMonthlyAmount(data.transactions, ["investing", "saving"]),
    [data.transactions],
  );

  // Expenses basis: real spending if we have it, otherwise profile setting
  const monthlyExpenses =
    avgExpenses > 0 ? avgExpenses : data.fireSettings.monthlyExpenses;
  const expensesBasis = avgExpenses > 0 ? "your last 6 months of spending" : "your profile setting";

  const netWorth = getNetWorth();
  const savingsRate = avgIncome > 0 ? (avgContribution / avgIncome) * 100 : 0;

  // --- Interactive contribution ---
  const [contribution, setContribution] = useState<number>(() =>
    Math.round(avgContribution / 500_000) * 500_000,
  );
  const sliderMax = Math.max(
    30_000_000,
    Math.ceil((avgIncome || 0) / 5_000_000) * 5_000_000,
    contribution * 2,
  );

  // --- Forecasts ---
  const fiNumber = fireNumber(monthlyExpenses);
  const progress = fiNumber > 0 ? Math.min(100, (netWorth / fiNumber) * 100) : 0;

  const monthsToFI = monthsToTarget(netWorth, contribution, fiNumber, returnRate);

  const crossNW = crossoverTargetNW(monthlyExpenses, returnRate);
  const monthsToCross = isFinite(crossNW)
    ? monthsToTarget(netWorth, contribution, crossNW, returnRate)
    : null;

  const investIncomeNow = netWorth * (returnRate / 100 / 12);

  // "What if I invested 2M more?" nudge
  const monthsToFIPlus = monthsToTarget(
    netWorth,
    contribution + 2_000_000,
    fiNumber,
    returnRate,
  );
  const monthsSaved =
    monthsToFI !== null && monthsToFIPlus !== null
      ? monthsToFI - monthsToFIPlus
      : null;

  // --- Chart ---
  const horizon = Math.min(
    480,
    Math.max(120, (monthsToCross ?? 0) + 24, (monthsToFI ?? 0) + 24),
  );
  const series = useMemo(
    () =>
      buildForecastSeries(netWorth, contribution, monthlyExpenses, returnRate, horizon),
    [netWorth, contribution, monthlyExpenses, returnRate, horizon],
  );
  const crossPoint = series.find((p) => p.investIncome >= p.expenses);

  const freedomAge =
    monthsToFI !== null ? Math.floor(currentAge + monthsToFI / 12) : null;

  return (
    <div className="space-y-6">
      <h1 data-tour="page-title" className="text-2xl font-bold flex items-center gap-1">
        F.I.R.E Roadmap
        <PageTourButton onClick={startTour} />
      </h1>

      <HintBanner
        pageKey="fire"
        message="🎯 Your Freedom Day is forecast from your real numbers: net worth, what you actually invest each month, and your expected return. Drag the slider to see how investing more moves the date."
      />

      {/* Top Level Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-tour="fire-target">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Target className="h-4 w-4" /> F.I. Target (Rule of 25)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatVND(fiNumber)}</div>
            <p className="text-xs text-muted-foreground">
              Based on {formatVND(monthlyExpenses)}/mo · {expensesBasis}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Current Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.toFixed(1)}%</div>
            <Progress value={progress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Net worth {formatVND(netWorth)}
            </p>
          </CardContent>
        </Card>

        <Card data-tour="fire-savings" className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" /> Freedom Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {monthsToFI !== null ? monthLabelFromNow(monthsToFI) : "—"}
            </div>
            <p className="text-xs text-primary mt-1">
              {monthsToFI !== null
                ? `${monthsToFI} months away · age ${freedomAge}`
                : "Start investing monthly to get a date"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-success/10 border-success/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-success flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Crossover Point
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {monthsToCross !== null ? monthLabelFromNow(monthsToCross) : "—"}
            </div>
            <p className="text-xs text-success mt-1">
              Investment income {formatVND(Math.round(investIncomeNow))}/mo today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contribution slider */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-4 w-4" /> Monthly Investing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold">{formatVND(contribution)}</span>
            <span className="text-xs text-muted-foreground">
              Your actual average: {formatVND(Math.round(avgContribution))}/mo
              {avgIncome > 0 && ` (${savingsRate.toFixed(0)}% of income)`}
            </span>
          </div>
          <Slider
            value={[contribution]}
            min={0}
            max={sliderMax}
            step={500_000}
            onValueChange={(v) => setContribution(v[0])}
          />
        </CardContent>
      </Card>

      {/* Crossover chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Crossover Chart — forecast investment income vs expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-soft))" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={compactVND} tick={{ fontSize: 12 }} width={50} />
              <Tooltip
                formatter={(val: number, name: string) => [
                  formatVND(val),
                  name === "investIncome" ? "Investment income/mo" : "Expenses/mo",
                ]}
                labelFormatter={(year) => `Year ${year}`}
              />
              <Legend
                formatter={(v: string) =>
                  v === "investIncome" ? "Investment income (forecast)" : "Monthly expenses"
                }
              />
              <Line
                type="monotone"
                dataKey="investIncome"
                stroke={STATUS_CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke={STATUS_CHART_COLORS.destructive}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              {crossPoint && (
                <ReferenceDot
                  x={crossPoint.year}
                  y={crossPoint.expenses}
                  r={6}
                  fill={STATUS_CHART_COLORS.success}
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Alert>
        <Target className="h-4 w-4" />
        <AlertTitle>Action Plan</AlertTitle>
        <AlertDescription>
          {monthsToFI !== null ? (
            <>
              Investing <strong>{formatVND(contribution)}</strong> every month makes you
              financially free by <strong>{monthLabelFromNow(monthsToFI)}</strong> (age{" "}
              {freedomAge}).
              {monthsSaved !== null && monthsSaved > 0 && (
                <>
                  {" "}Adding {formatVND(2_000_000)}/mo would bring that forward by{" "}
                  <strong>{monthsSaved} months</strong>.
                </>
              )}
            </>
          ) : (
            <>
              With no monthly investing, there's no path to your F.I. target. Set a
              monthly amount above — even a small one — to get your Freedom Day.
            </>
          )}
        </AlertDescription>
      </Alert>

      <p className="text-xs text-muted-foreground">
        Assumes {returnRate}% annual return (Profile → Financial Settings), constant
        expenses, and contributions invested monthly. Forecasts are estimates, not guarantees.
      </p>
    </div>
  );
}
