import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Target } from "lucide-react";

const COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(217, 91%, 60%)",
];

export default function Dashboard() {
  const {
    data,
    getTotalIncome,
    getTotalExpenses,
    getNetWorth,
    getTotalSavings,
    getTotalInvestments,
  } = useApp();
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
  const currentAge = new Date().getFullYear() - birthYear;
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

  // Stock/Bond allocation based on "100 minus age" rule
  const stockAllocation = (requiredMonthlySavings * (100 - currentAge)) / 100;
  const bondAllocation = (requiredMonthlySavings * currentAge) / 100;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Overview — {getMonthLabel(monthKey)}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Expense Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ratio}%</p>
          </CardContent>
        </Card>
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
              {formatVND(totalInvestments)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth */}
        <Card>
          <CardHeader>
            <CardTitle>Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary mb-4">
              {formatVND(netWorth)}
            </p>
            <div className="space-y-2">
              {data.assets.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span>
                    {a.emoji} {a.name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatVND(a.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                      <Cell key={i} fill={COLORS[i]} />
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
                    style={{ background: COLORS[i] }}
                  />
                  <span>
                    {d.name}: {d.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
              <TrendingUp className="h-3 w-3" />
              <span>
                To retire in {yearsToGrow} years (@{returnRate}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock / Bond Allocation */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 dark:text-green-400">
              📈 Invest in Stocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatVND(Math.ceil(stockAllocation))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {100 - currentAge}% of monthly contribution (Age: {currentAge})
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700 dark:text-amber-400">
              🏦 Invest in Bonds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {formatVND(Math.ceil(bondAllocation))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentAge}% of monthly contribution (Age: {currentAge})
            </p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Target className="h-4 w-4" />
        <AlertTitle>Action Plan</AlertTitle>
        <AlertDescription>
          To reach Financial Independence by age {currentAge + yearsToGrow}, you
          need to invest <strong>{formatVND(requiredMonthlySavings)}</strong>{" "}
          every month — <strong>{formatVND(Math.ceil(stockAllocation))}</strong> in stocks
          and <strong>{formatVND(Math.ceil(bondAllocation))}</strong> in bonds.
        </AlertDescription>
      </Alert>
    </div>
  );
}
