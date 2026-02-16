import { useApp } from "@/contexts/AppContext";
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
import { TrendingUp, Target, Save } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
    getTotalInvestmentCost,
    updateFireSettings,
  } = useApp();
  const { toast } = useToast();
  const [editingAge, setEditingAge] = useState(false);
  const [ageInput, setAgeInput] = useState(data.fireSettings.currentAge);
  const [savingAge, setSavingAge] = useState(false);

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
  const {
    monthlyExpenses,
    returnRate,
    currentAge: fireCurrentAge,
    birthYear,
  } = data.fireSettings;
  const currentAge =
    fireCurrentAge || (birthYear ? new Date().getFullYear() - birthYear : 0);
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

  const handleSaveAge = async () => {
    if (ageInput < 0 || ageInput > 150) {
      toast({
        title: "Error",
        description: "Please enter a valid age (0-150)",
        variant: "destructive",
      });
      return;
    }

    setSavingAge(true);
    try {
      await updateFireSettings({
        ...data.fireSettings,
        currentAge: ageInput,
      });
      toast({
        title: "Success",
        description: "Age saved successfully",
      });
      setEditingAge(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save age",
        variant: "destructive",
      });
    } finally {
      setSavingAge(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Overview — {getMonthLabel(monthKey)}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

      {/* Age Settings & Target Asset Allocation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Target Asset Allocation (Rule of 110)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Age Input */}
          <div className="space-y-3">
            <Label>Your Current Age</Label>
            <div className="flex items-center gap-3">
              {editingAge ? (
                <>
                  <Input
                    type="number"
                    min="0"
                    max="150"
                    value={ageInput}
                    onChange={(e) => setAgeInput(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveAge}
                    disabled={savingAge}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingAge ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingAge(false);
                      setAgeInput(currentAge);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">
                    {currentAge}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingAge(true)}
                  >
                    Edit
                  </Button>
                </>
              )}
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
                    <span className="text-sm">📈 Stocks/Equity</span>
                    <span className="font-bold">{targetStockAllocation}%</span>
                  </div>
                  <Progress value={targetStockAllocation} className="h-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm">🏦 Bonds/Safe</span>
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
                    <span className="text-sm">📈 Stocks/Equity</span>
                    <span className="font-bold">
                      {portfolioAllocation.stocks.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={portfolioAllocation.stocks}
                    className="h-2"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm">🏦 Bonds/Safe</span>
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
    </div>
  );
}
