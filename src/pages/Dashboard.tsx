import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { SAMPLE_NOTE } from "@/hooks/use-app-data";
import { useAuth } from "@/contexts/AuthContext";
import { formatVND, formatVNDCompact, getMonthKey, getMonthLabel } from "@/lib/format";
import { sumPeriod, shiftPeriod } from "@/lib/report";
import {
  avgMonthlyAmount,
  crossoverTargetNW,
  monthsToTarget,
  monthLabelFromNow,
} from "@/lib/fire-math";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OnboardingModal from "@/components/OnboardingModal";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import HintBanner from "@/components/HintBanner";
import CollapsibleAlerts from "@/components/CollapsibleAlerts";
import PageTourButton from "@/components/PageTourButton";
import { usePageTour } from "@/hooks/use-page-tour";

function DeltaChip({ current, previous, upIsGood = true }: { current: number; previous: number; upIsGood?: boolean }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp === upIsGood ? "text-success" : "text-destructive"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}% vs last month
    </span>
  );
}

const QUALITY = [
  { key: "active", label: "Active", bar: "bg-destructive" },
  { key: "scalable", label: "Scalable", bar: "bg-warning" },
  { key: "passive", label: "Passive", bar: "bg-success" },
] as const;

export default function Dashboard() {
  const {
    data,
    getNetWorth,
    getTotalSavings,
    getTotalInvestments,
    getTotalInvestmentCost,
    clearSampleData,
  } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const { startTour } = usePageTour("dashboard");

  const hasSampleData =
    data.transactions.some((t) => t.note?.startsWith(SAMPLE_NOTE)) ||
    (data.portfolio ?? []).some((p) => p.notes === SAMPLE_NOTE);
  const handleClearSample = async () => {
    try {
      await clearSampleData();
      toast({ title: "Sample data removed" });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not remove the sample data.",
        variant: "destructive",
      });
    }
  };

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

  // ── THIS MONTH (same maths as the Reports page, so the two always agree) ──
  const monthKey = getMonthKey();
  const month = sumPeriod(data.transactions, monthKey);
  const lastMonth = sumPeriod(data.transactions, shiftPeriod(monthKey, -1));

  // ── NET WORTH ──
  const netWorth = getNetWorth();
  const totalSavings = getTotalSavings();
  const totalInvestments = getTotalInvestments();
  const investmentCost = getTotalInvestmentCost();
  const investmentGain = totalInvestments - investmentCost;
  const investmentRoi = investmentCost > 0 ? (investmentGain / investmentCost) * 100 : 0;

  // ── ALERTS ──
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

  const hasAlerts = budgetAlerts.length + portfolioAlerts.length + subscriptionAlerts.length > 0;

  // ── CROSSOVER POINT ──
  const { monthlyExpenses, returnRate, birthYear } = data.fireSettings;
  const dividendByMonth: Record<string, number> = {};
  data.transactions
    .filter((t) => t.type === "dividend")
    .forEach((t) => {
      const m = t.date.slice(0, 7);
      dividendByMonth[m] = (dividendByMonth[m] || 0) + t.amount;
    });
  const recentDividendMonths = Object.keys(dividendByMonth)
    .sort()
    .slice(-3)
    .map((k) => dividendByMonth[k]);
  const passiveIncomePerMonth =
    recentDividendMonths.length > 0
      ? recentDividendMonths.reduce((s, v) => s + v, 0) / recentDividendMonths.length
      : 0;
  // Same expense basis as the FIRE page: real spending if available, else settings
  const avgActualExpenses = avgMonthlyAmount(data.transactions, ["expense"]);
  const crossoverExpenses = avgActualExpenses > 0 ? avgActualExpenses : monthlyExpenses;
  const coveragePct = crossoverExpenses > 0 ? (passiveIncomePerMonth / crossoverExpenses) * 100 : 0;

  // Crossover date — identical math to the FIRE page (fire-math), so the
  // Dashboard and the FIRE Roadmap always show the same date.
  const avgContribution = avgMonthlyAmount(data.transactions, ["investing", "saving"]);
  const crossNW = crossoverTargetNW(crossoverExpenses, returnRate);
  const monthsToCross = isFinite(crossNW)
    ? monthsToTarget(netWorth, avgContribution, crossNW, returnRate)
    : null;
  const insightText =
    coveragePct < 10
      ? "Log dividend income to see your passive income grow."
      : coveragePct < 50
        ? "Good start. Keep building your income-generating assets."
        : coveragePct < 100
          ? "Almost there. Passive income is close to covering your spending."
          : "You've reached the crossover point.";

  // ── INCOME QUALITY (this month) ──
  const monthIncome = data.transactions.filter((t) => t.date.startsWith(monthKey) && t.type === "income");
  const incomeTotal = monthIncome.reduce((s, t) => s + t.amount, 0);
  const quality = QUALITY.map((q) => {
    const amount = monthIncome
      .filter((t) => (t.quality ?? "active") === q.key)
      .reduce((s, t) => s + t.amount, 0);
    return { ...q, amount, pct: incomeTotal > 0 ? (amount / incomeTotal) * 100 : 0 };
  });
  const passivePct = quality[2].pct;

  // ── STOCKS VS SAFE ASSETS ("110 minus age") ──
  const dob = (user?.user_metadata as { date_of_birth?: string } | undefined)?.date_of_birth;
  const currentAge = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : birthYear
      ? new Date().getFullYear() - birthYear
      : 0;
  const targetStocks = 110 - currentAge;
  const portfolioValue = (data.portfolio ?? []).reduce((s, p) => s + p.quantity * p.currentPrice, 0);
  const tierShare = (tiers: string[]) =>
    portfolioValue > 0
      ? ((data.portfolio ?? [])
          .filter((p) => tiers.includes(p.tier))
          .reduce((s, p) => s + p.quantity * p.currentPrice, 0) /
          portfolioValue) *
        100
      : 0;
  const mix = [
    { label: "Growth and Risk", actual: tierShare(["Growth", "Risk"]), target: targetStocks },
    { label: "Defensive and Safe", actual: tierShare(["Defensive", "Safe"]), target: 100 - targetStocks },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <h1 data-tour="page-title" className="text-xl sm:text-2xl font-bold flex items-center gap-1">
          Dashboard
          <PageTourButton onClick={startTour} />
        </h1>
        <button
          onClick={toggleCompact}
          className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors"
          title="Switch between full and shortened amounts"
        >
          {compact ? "Show full amounts" : "Shorten amounts"}
        </button>
      </div>

      {hasSampleData && (
        <Alert>
          <AlertTitle>You're looking at sample data</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              The example salary, expenses and E1VFVN30 holding are not yours. Remove them when you're ready to
              enter your own. Your categories stay.
            </span>
            <Button size="sm" variant="outline" onClick={handleClearSample}>
              Remove sample data
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <OnboardingChecklist />

      {hasAlerts && (
        <CollapsibleAlerts
          budgetAlerts={budgetAlerts}
          portfolioAlerts={portfolioAlerts}
          subscriptionAlerts={subscriptionAlerts}
        />
      )}

      <HintBanner
        pageKey="dashboard"
        message="👋 Welcome to your Dashboard. The Crossover Point shows when your passive income will cover your expenses — your true financial freedom date. Log dividend transactions to start tracking it."
      />

      {/* ─── WHERE YOU STAND, AND WHERE YOU'RE HEADING ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div data-tour="net-worth" className="hero-gradient rounded-3xl p-8 text-white card-shadow flex flex-col gap-4">
          <div>
            <p className="text-sm text-white/80 mb-2">Net worth</p>
            <h2 className="font-bold text-3xl tabular">{fmt(netWorth)}</h2>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-white/80">Savings</dt>
              <dd className="font-bold tabular">{fmt(totalSavings)}</dd>
            </div>
            <div>
              <dt className="text-white/80">Investments</dt>
              <dd className="font-bold tabular">{fmt(Math.round(totalInvestments))}</dd>
              {investmentCost > 0 && (
                <dd className="text-xs text-white/80 tabular">
                  {investmentGain >= 0 ? "+" : ""}{investmentRoi.toFixed(1)}% ({investmentGain >= 0 ? "+" : ""}{fmt(Math.round(investmentGain))})
                </dd>
              )}
            </div>
          </dl>
          <Link to="/portfolio" className="mt-auto text-sm font-bold underline underline-offset-4 w-fit">
            Open Portfolio
          </Link>
        </div>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Crossover point</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-3xl font-bold text-primary tabular">
                {monthsToCross === null ? "—" : monthsToCross <= 0 ? "Reached" : monthLabelFromNow(monthsToCross)}
              </p>
              <p className="text-sm text-muted-foreground">
                {monthsToCross === null
                  ? "Log spending and investing to get a date."
                  : monthsToCross > 0
                    ? `${monthsToCross} months away, when your investments can pay for your spending.`
                    : "Your investments can pay for your spending."}
              </p>
            </div>
            <div className="space-y-1">
              <Progress value={Math.min(100, coveragePct)} className="h-2" />
              <p className="text-sm">
                Dividends cover <span className="font-bold">{coveragePct.toFixed(1)}%</span> of your spending
                <span className="text-muted-foreground"> ({fmt(Math.round(passiveIncomePerMonth))} a month)</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{insightText}</p>
            <Link to="/fire" className="mt-auto text-sm font-bold text-primary underline underline-offset-4 w-fit">
              See the roadmap
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ─── THIS MONTH ─── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">{getMonthLabel(monthKey)} so far</h2>
          <Link to="/report" className="text-sm font-bold text-primary underline underline-offset-4">
            Open the full report
          </Link>
        </div>
        <div data-tour="monthly-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Money in</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success tabular">{fmt(month.moneyIn)}</p>
              <DeltaChip current={month.moneyIn} previous={lastMonth.moneyIn} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Money out</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive tabular">{fmt(month.out)}</p>
              <DeltaChip current={month.out} previous={lastMonth.out} upIsGood={false} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{month.kept >= 0 ? "Kept" : "Overspent"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold tabular ${month.kept >= 0 ? "text-primary" : "text-destructive"}`}>
                {fmt(Math.abs(month.kept))}
              </p>
              {month.rate !== null && month.kept >= 0 ? (
                <p className="text-xs text-muted-foreground">{month.rate.toFixed(0)}% of your money in</p>
              ) : (
                <DeltaChip current={month.kept} previous={lastMonth.kept} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── INCOME QUALITY ─── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Income quality</CardTitle>
            <p className="text-sm text-muted-foreground">How much of this month's income needed your time.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {incomeTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No income logged this month.</p>
            ) : (
              <>
                <div className="flex rounded-full overflow-hidden h-4">
                  {quality.map((q) =>
                    q.pct > 0 ? <div key={q.key} style={{ width: `${q.pct}%` }} className={q.bar} /> : null,
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {quality.map((q) => (
                    <div key={q.key}>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${q.bar}`} />
                        {q.label}
                      </div>
                      <p className="font-semibold tabular">{q.pct.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground tabular">{fmt(Math.round(q.amount))}</p>
                    </div>
                  ))}
                </div>
                <p className={`text-xs ${passivePct >= 30 ? "text-success" : "text-muted-foreground"}`}>
                  Target: more than 30% passive. You're at {passivePct.toFixed(1)}%.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── STOCKS VS SAFE ASSETS ─── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Growth and safety mix</CardTitle>
            <p className="text-sm text-muted-foreground">
              {currentAge > 0
                ? `Rule of 110: at ${currentAge}, aim for about ${targetStocks}% in growth assets.`
                : "Add your birth year in Profile to get a target for your age."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolioValue === 0 ? (
              <p className="text-sm text-muted-foreground">No assets yet. Add one in Portfolio to see your mix.</p>
            ) : (
              mix.map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="tabular">
                      <span className="font-bold">{m.actual.toFixed(1)}%</span>
                      {currentAge > 0 && <span className="text-muted-foreground"> of a {m.target}% target</span>}
                    </span>
                  </div>
                  <Progress value={m.actual} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
