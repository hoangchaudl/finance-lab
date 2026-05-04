import { useApp } from "@/contexts/AppContext";
import { formatVND } from "@/lib/format";
import HintBanner from "@/components/HintBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, Target, CalendarClock } from "lucide-react";

export default function FireGoals() {
  const { data, getNetWorth } = useApp();
  const { monthlyExpenses, returnRate, currentAge } = data.fireSettings;

  // 1. Rule of 25 Calculation
  const annualExpenses = monthlyExpenses * 12;
  const fiNumber = annualExpenses * 25;
  const currentNetWorth = getNetWorth();
  const progress = Math.min(100, (currentNetWorth / fiNumber) * 100);

  // 2. Savings Gap Calculation (PMT Formula approximation)
  // How much do I need to save monthly to hit FI in 14 years?
  const yearsToGrow = 14;
  const months = yearsToGrow * 12;
  const r = returnRate / 100 / 12; // Monthly rate

  // Future Value of Current Principal
  const fvPrincipal = currentNetWorth * Math.pow(1 + r, months);

  // Remaining amount needed from contributions
  const remainingTarget = fiNumber - fvPrincipal;

  // Monthly Contribution needed (PMT)
  const requiredMonthlySavings =
    remainingTarget > 0
      ? (remainingTarget * r) / (Math.pow(1 + r, months) - 1)
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">F.I.R.E Roadmap</h1>

      <HintBanner
        pageKey="fire"
        message="🎯 Your FI Number is 25× your annual expenses — the amount you need invested to retire. Track your net worth growth toward this target."
      />

      {/* Top Level Stats */}
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
              Current Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.toFixed(2)}%</div>
            <Progress value={progress} className="h-2 mt-2" />
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
              <TrendingUp className="h-3 w-3" />
              <span>
                To retire in {yearsToGrow} years (@{returnRate}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Target className="h-4 w-4" />
        <AlertTitle>Action Plan</AlertTitle>
        <AlertDescription>
          To reach Financial Independence by age {currentAge + yearsToGrow}, you
          need to invest <strong>{formatVND(requiredMonthlySavings)}</strong>{" "}
          every month into your portfolio.
        </AlertDescription>
      </Alert>
    </div>
  );
}
