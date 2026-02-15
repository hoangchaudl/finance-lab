import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  PiggyBank,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  essential: "#22c55e",
  nonessential: "#f59e0b",
  income: "#10b981",
  savings: "#6366f1",
  investment: "#3b82f6",
};

const SPENDING_COLORS = [
  "#22c55e",
  "#1a1a2e",
  "#86efac",
  "#bbf7d0",
  "#4ade80",
  "#059669",
  "#a7f3d0",
  "#d1fae5",
];

export default function Dashboard() {
  const {
    data,
    getTotalIncome,
    getTotalExpenses,
    getNetWorth,
    getTotalSavings,
    getTotalInvestments,
    getMonthTransactions,
    getActualForCategory,
  } = useApp();

  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getMonthKey(d);
  });

  const income = getTotalIncome(selectedMonth);
  const expenses = getTotalExpenses(selectedMonth);
  const savings = income - expenses;
  const netWorth = getNetWorth();
  const totalSavings = getTotalSavings();
  const totalInvestments = getTotalInvestments();

  // Budget from planned
  const plannedBudget = data.categories
    .filter((c) => c.type !== "income")
    .reduce((sum, c) => {
      return sum + (data.monthlyPlans[selectedMonth]?.[c.id]?.planned || 0);
    }, 0);
  const remaining = (plannedBudget || income) - expenses;
  const budgetPct = plannedBudget > 0 ? ((expenses / plannedBudget) * 100).toFixed(0) : "0";

  // Spending by Category for pie chart
  const spendingByCategory = useMemo(() => {
    const expenseCategories = data.categories.filter(
      (c) => c.type === "essential" || c.type === "nonessential"
    );
    return expenseCategories
      .map((c) => ({
        name: `${c.emoji} ${c.name}`,
        value: getActualForCategory(selectedMonth, c.id),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data.categories, selectedMonth, getActualForCategory]);

  const totalSpending = spendingByCategory.reduce((s, d) => s + d.value, 0);

  // Monthly bar chart data (last 7 months)
  const barChartData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mk = getMonthKey(d);
      const monthIncome = getTotalIncome(mk);
      const monthExpenses = getTotalExpenses(mk);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      result.push({
        month: monthNames[d.getMonth()],
        income: monthIncome,
        expenses: monthExpenses,
        cashflow: monthIncome - monthExpenses,
      });
    }
    return result;
  }, [getTotalIncome, getTotalExpenses]);

  // Recent transactions
  const recentTransactions = getMonthTransactions(selectedMonth)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getCategoryById = (id: string) => data.categories.find((c) => c.id === id);

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "income": return "bg-green-100 text-green-700 border-green-200";
      case "investing": return "bg-blue-100 text-blue-700 border-blue-200";
      case "saving": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-orange-100 text-orange-700 border-orange-200";
    }
  };

  // FIRE
  const { monthlyExpenses, returnRate, birthYear } = data.fireSettings;
  const currentAge = new Date().getFullYear() - (birthYear || 2001);
  const annualExpenses = monthlyExpenses * 12;
  const fiNumber = annualExpenses * 25;
  const fireProgress = Math.min(100, (netWorth / fiNumber) * 100);
  const yearsToGrow = 14;
  const monthsToGrow = yearsToGrow * 12;
  const r = returnRate / 100 / 12;
  const fvPrincipal = netWorth * Math.pow(1 + r, monthsToGrow);
  const remainingTarget = fiNumber - fvPrincipal;
  const requiredMonthlySavings =
    remainingTarget > 0 ? (remainingTarget * r) / (Math.pow(1 + r, monthsToGrow) - 1) : 0;
  const stockAllocation = (requiredMonthlySavings * (100 - currentAge)) / 100;
  const bondAllocation = (requiredMonthlySavings * currentAge) / 100;

  // Income change % (compare to previous month)
  const prevMonth = (() => {
    const d = new Date();
    const [y, m] = selectedMonth.split("-").map(Number);
    d.setFullYear(y);
    d.setMonth(m - 2);
    return getMonthKey(d);
  })();
  const prevIncome = getTotalIncome(prevMonth);
  const incomeChange = prevIncome > 0 ? (((income - prevIncome) / prevIncome) * 100).toFixed(1) : null;
  const prevExpenses = getTotalExpenses(prevMonth);
  const expenseChange = prevExpenses > 0 ? (((expenses - prevExpenses) / prevExpenses) * 100).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Money Management</h1>
          <p className="text-sm text-muted-foreground">
            View your monthly spending, savings progress, and budget for {getMonthLabel(selectedMonth)}
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {getMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="py-5 px-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Monthly Budget</span>
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatVND(plannedBudget || income)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              For {getMonthLabel(selectedMonth)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="py-5 px-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Total Spent</span>
              <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatVND(expenses)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">of budget</span>
              {plannedBudget > 0 && (
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                  Number(budgetPct) > 100 ? "text-destructive border-destructive/30" : "text-primary border-primary/30"
                }`}>
                  {budgetPct}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="py-5 px-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Remaining</span>
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatVND(remaining)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Still available</span>
              {expenseChange && (
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                  Number(expenseChange) > 0 ? "text-destructive border-destructive/30" : "text-primary border-primary/30"
                }`}>
                  {Number(expenseChange) > 0 ? "+" : ""}{expenseChange}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="py-5 px-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Income</span>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatVND(income)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Total earned</span>
              {incomeChange && (
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                  Number(incomeChange) >= 0 ? "text-primary border-primary/30" : "text-destructive border-destructive/30"
                }`}>
                  {Number(incomeChange) >= 0 ? "+" : ""}{incomeChange}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Transaction Overview Bar Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Transaction Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                <Tooltip formatter={(val: number) => formatVND(val)} />
                <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.3} />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Spending by Category Donut */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingByCategory.length > 0 ? (
              <>
                <div className="h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingByCategory}
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {spendingByCategory.map((_, i) => (
                          <Cell key={i} fill={SPENDING_COLORS[i % SPENDING_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatVND(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold">{totalSpending > 0 && income > 0 ? `${Math.round((totalSpending / income) * 100)}%` : "0%"}</span>
                    <span className="text-[10px] text-muted-foreground">Total Expends</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  {spendingByCategory.slice(0, 8).map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: SPENDING_COLORS[i % SPENDING_COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-medium">
                        {totalSpending > 0 ? `${Math.round((item.value / totalSpending) * 100)}%` : "0%"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No spending data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Transactions + Goals/FIRE */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-5">
              <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground uppercase tracking-wider pb-2 border-b">
                <span>Category</span>
                <span>Type</span>
                <span>Date</span>
                <span className="text-right">Amount</span>
              </div>
            </div>
            <div className="divide-y">
              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No transactions yet</div>
              ) : (
                recentTransactions.map((t) => {
                  const cat = getCategoryById(t.category_id);
                  return (
                    <div key={t.id} className="grid grid-cols-4 items-center px-5 py-3 text-sm">
                      <span className="font-medium truncate">
                        {cat ? `${cat.emoji} ${cat.name}` : "Unknown"}
                        {t.note && <span className="block text-xs text-muted-foreground truncate">{t.note}</span>}
                      </span>
                      <span>
                        <Badge variant="outline" className={`text-[10px] font-medium ${getTypeBadgeColor(t.type)}`}>
                          {t.type === "income" ? "Income" : t.type === "investing" ? "Invest" : t.type === "saving" ? "Save" : "Expense"}
                        </Badge>
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(t.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span className={`text-right font-medium ${t.type === "income" ? "text-primary" : ""}`}>
                        {t.type === "income" ? "+" : "-"} {formatVND(t.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Net Worth + FIRE */}
        <div className="lg:col-span-2 space-y-4">
          {/* Net Worth */}
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Net Worth</span>
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">{formatVND(netWorth)}</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Savings</p>
                  <p className="text-sm font-semibold">{formatVND(totalSavings)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Investments</p>
                  <p className="text-sm font-semibold">{formatVND(totalInvestments)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* F.I. Progress */}
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">F.I. Progress</span>
                <span className="text-sm font-bold text-primary">{fireProgress.toFixed(1)}%</span>
              </div>
              <Progress value={fireProgress} className="h-2 mb-3" />
              <p className="text-xs text-muted-foreground mb-3">
                Target: {formatVND(fiNumber)} (Rule of 25)
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <span>Monthly required</span>
                <span className="font-semibold text-foreground">{formatVND(Math.ceil(requiredMonthlySavings))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stock/Bond Split */}
          <Card>
            <CardContent className="py-5 px-5">
              <p className="text-sm font-semibold mb-3">Investment Split (Age {currentAge})</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-sm">Stocks ({100 - currentAge}%)</span>
                  </div>
                  <span className="text-sm font-semibold">{formatVND(Math.ceil(stockAllocation))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm">Bonds ({currentAge}%)</span>
                  </div>
                  <span className="text-sm font-semibold">{formatVND(Math.ceil(bondAllocation))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
