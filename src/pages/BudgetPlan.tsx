import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import HintBanner from "@/components/HintBanner";
import PageTourButton from "@/components/PageTourButton";
import { usePageTour } from "@/hooks/use-page-tour";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TYPE_LABELS: Record<string, string> = {
  income: "Income Sources",
  essential: "Essential Expenses",
  nonessential: "Non-essential Expenses",
  savings: "Savings",
  investment: "Investments",
};

import { Wallet, FolderCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";

export default function BudgetPlan() {
  const navigate = useNavigate();
  const {
    data,
    updatePlan,
    updateCategoryAllocation,
    getActualForCategory,
    getTotalIncome,
    getTotalExpenses,
  } = useApp();
  const { toast } = useToast();
  const { startTour } = usePageTour("budget");
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getMonthKey(d);
  });

  const incomeCategories = data.categories.filter((c) => c.type === "income");
  const expenseCategories = data.categories.filter((c) => c.type !== "income");

  const grouped = expenseCategories.reduce(
    (acc, cat) => {
      if (!acc[cat.type]) acc[cat.type] = [];
      acc[cat.type].push(cat);
      return acc;
    },
    {} as Record<string, typeof expenseCategories>,
  );

  const incomeGrouped =
    incomeCategories.length > 0 ? { income: incomeCategories } : {};

  // --- 1. CORE CALCULATIONS ---
  const actualIncome = getTotalIncome(selectedMonth);
  const expenses = getTotalExpenses(selectedMonth);
  const surplus = actualIncome - expenses;

  // Planned Income
  const plannedIncome = incomeCategories.reduce((sum, cat) => {
    return sum + (data.monthlyPlans[selectedMonth]?.[cat.id]?.planned ?? 0);
  }, 0);

  // Effective Income (Use Planned if Actual is 0 so percentages show up)
  const effectiveIncome = actualIncome > 0 ? actualIncome : plannedIncome;

  // --- 2. SUBSCRIPTION CALCULATIONS ---
  const totalSubscriptions = data.subscriptions.reduce(
    (sum, sub) => sum + sub.amount,
    0,
  );

  // Try to match actual transactions to subscriptions by Note
  const getActualForSubscription = (monthKey: string, subName: string) => {
    return data.transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.date.startsWith(monthKey) &&
          t.note?.toLowerCase().includes(subName.toLowerCase()),
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };
  const totalActualSubscriptions = data.subscriptions.reduce(
    (sum, sub) => sum + getActualForSubscription(selectedMonth, sub.name),
    0,
  );

  // --- 3. BUCKET CALCULATIONS (PLANNED) ---
  const getPlannedBucketTotal = (types: string[]) =>
    data.categories
      .filter((c) => types.includes(c.type))
      .reduce((sum, c) => {
        const planned = data.monthlyPlans[selectedMonth]?.[c.id]?.planned || 0;
        return sum + planned;
      }, 0);

  const plannedEssential = getPlannedBucketTotal(["essential"]);
  const plannedLifestyle = getPlannedBucketTotal(["nonessential"]);
  const plannedSavingsBucket = getPlannedBucketTotal(["savings"]); // Strict Savings
  const plannedInvestingBucket = getPlannedBucketTotal(["investment"]); // Strict Investment
  const plannedSavingsCombined = plannedSavingsBucket + plannedInvestingBucket; // For Allocation View

  // --- 4. BUCKET CALCULATIONS (ACTUAL) ---
  const getActualBucketTotal = (types: string[]) =>
    data.categories
      .filter((c) => types.includes(c.type))
      .reduce((sum, c) => {
        return sum + getActualForCategory(selectedMonth, c.id);
      }, 0);

  const actualEssential = getActualBucketTotal(["essential"]);
  const actualLifestyle = getActualBucketTotal(["nonessential"]);
  const actualSavingsBucket = getActualBucketTotal(["savings"]); // Strict Savings
  const actualInvestingBucket = getActualBucketTotal(["investment"]); // Strict Investment
  const actualSavingsCombined = actualSavingsBucket + actualInvestingBucket; // For Allocation View

  // --- 5. FINANCIAL RATIOS CALCULATIONS ---
  // Expenses = Essentials + Lifestyle + Subscriptions
  const plannedTotalExpenses =
    plannedEssential + plannedLifestyle + totalSubscriptions;
  const actualTotalExpenses =
    actualEssential + actualLifestyle + totalActualSubscriptions;

  // Total Planned (Everything)
  const totalPlannedAll = plannedTotalExpenses + plannedSavingsCombined;
  const overAllocated =
    effectiveIncome > 0 && totalPlannedAll > effectiveIncome;

  // Helper to get % of effective income
  const getPct = (amount: number) => {
    if (!effectiveIncome || effectiveIncome <= 0) return 0;
    return (amount / effectiveIncome) * 100;
  };

  const getActualForIncome = (monthKey: string, categoryId: string) => {
    return data.transactions
      .filter(
        (t) =>
          t.category_id === categoryId &&
          t.date.startsWith(monthKey) &&
          t.type === "income",
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handlePlanChange = async (categoryId: string, value: string) => {
    const num = parseFloat(value) || 0;
    try {
      await updatePlan(selectedMonth, categoryId, num);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <HintBanner
        pageKey="budget"
        message="📋 Set monthly spending targets per category. At the end of each month, compare planned vs actual to see where you overspent."
      />

      <div className="flex items-center justify-between">
        <h1 data-tour="page-title" className="text-2xl font-bold flex items-center gap-1">
          Budget Plan
          <PageTourButton onClick={startTour} />
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/categories")}>
            <FolderCog className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
            Manage Categories
          </Button>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {data.categories.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="No budget set yet"
          description="Add a few categories first, then come back here to assign a planned amount to each one for the month."
          actionLabel="Go to Categories"
          onAction={() => navigate("/categories")}
        />
      )}

      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Total Income {actualIncome === 0 && "(Planned)"}
            </p>
            <p className="text-xl font-bold text-primary">
              {formatVND(effectiveIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Planned</p>
            <p
              className={`text-xl font-bold ${overAllocated ? "text-destructive" : ""}`}
            >
              {formatVND(totalPlannedAll)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Monthly Surplus (Actual)
            </p>
            <p
              className={`text-xl font-bold ${surplus >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {formatVND(surplus)}
            </p>
          </CardContent>
        </Card>
      </div>

      {overAllocated && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          ⚠️ Total planned ({formatVND(totalPlannedAll)}) exceeds income (
          {formatVND(effectiveIncome)}). Please adjust.
        </div>
      )}

      {/* --- ANALYSIS SECTIONS --- */}
      <div className="space-y-6">
        {/* 1. Allocation Breakdown (Detailed) */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Allocation Breakdown (Detailed)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {/* Essentials */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Essentials</span>
                <Badge variant="outline">
                  Target: {data.incomeAllocations.essentials_pct}%
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Planned</span>
                  <span>{getPct(plannedEssential).toFixed(1)}%</span>
                </div>
                <Progress
                  value={
                    (getPct(plannedEssential) /
                      data.incomeAllocations.essentials_pct) *
                    100
                  }
                  className="h-1.5 opacity-50"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formatVND(plannedEssential)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>Actual</span>
                  <span
                    className={
                      getPct(actualEssential) >
                      data.incomeAllocations.essentials_pct
                        ? "text-destructive"
                        : "text-primary"
                    }
                  >
                    {getPct(actualEssential).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={
                    (getPct(actualEssential) /
                      data.incomeAllocations.essentials_pct) *
                    100
                  }
                  className="h-2"
                />
                <p className="text-xs font-medium text-right">
                  {formatVND(actualEssential)}
                </p>
              </div>
            </div>

            {/* Lifestyle */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Lifestyle</span>
                <Badge variant="outline">
                  Target: {data.incomeAllocations.lifestyle_pct}%
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Planned</span>
                  <span>{getPct(plannedLifestyle).toFixed(1)}%</span>
                </div>
                <Progress
                  value={
                    (getPct(plannedLifestyle) /
                      data.incomeAllocations.lifestyle_pct) *
                    100
                  }
                  className="h-1.5 opacity-50"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formatVND(plannedLifestyle)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>Actual</span>
                  <span
                    className={
                      getPct(actualLifestyle) >
                      data.incomeAllocations.lifestyle_pct
                        ? "text-destructive"
                        : "text-primary"
                    }
                  >
                    {getPct(actualLifestyle).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={
                    (getPct(actualLifestyle) /
                      data.incomeAllocations.lifestyle_pct) *
                    100
                  }
                  className="h-2"
                />
                <p className="text-xs font-medium text-right">
                  {formatVND(actualLifestyle)}
                </p>
              </div>
            </div>

            {/* Savings (Combined) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Savings (All)</span>
                <Badge variant="outline">
                  Target: {data.incomeAllocations.savings_pct}%
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Planned</span>
                  <span>{getPct(plannedSavingsCombined).toFixed(1)}%</span>
                </div>
                <Progress
                  value={
                    (getPct(plannedSavingsCombined) /
                      data.incomeAllocations.savings_pct) *
                    100
                  }
                  className="h-1.5 opacity-50"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formatVND(plannedSavingsCombined)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>Actual</span>
                  <span className="text-primary">
                    {getPct(actualSavingsCombined).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={
                    (getPct(actualSavingsCombined) /
                      data.incomeAllocations.savings_pct) *
                    100
                  }
                  className="h-2"
                />
                <p className="text-xs font-medium text-right">
                  {formatVND(actualSavingsCombined)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Financial Ratios (High Level) */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Financial Ratios (% of Income)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {/* Total Expenses */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Total Expenses</span>
                <Badge variant="secondary">Target: &lt;70%</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Planned</span>
                  <span>{getPct(plannedTotalExpenses).toFixed(1)}%</span>
                </div>
                <Progress
                  value={getPct(plannedTotalExpenses)}
                  className="h-1.5 opacity-50"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formatVND(plannedTotalExpenses)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>Actual</span>
                  <span
                    className={
                      getPct(actualTotalExpenses) > 80
                        ? "text-destructive"
                        : "text-primary"
                    }
                  >
                    {getPct(actualTotalExpenses).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getPct(actualTotalExpenses)} className="h-2" />
                <p className="text-xs font-medium text-right">
                  {formatVND(actualTotalExpenses)}
                </p>
              </div>
            </div>

            {/* Pure Savings */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Total Savings</span>
                <Badge variant="outline" className="bg-primary/5 text-primary">
                  Grow this
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Planned</span>
                  <span>{getPct(plannedSavingsBucket).toFixed(1)}%</span>
                </div>
                <Progress
                  value={getPct(plannedSavingsBucket) * 2}
                  className="h-1.5 opacity-50"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formatVND(plannedSavingsBucket)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>Actual</span>
                  <span className="text-primary">
                    {getPct(actualSavingsBucket).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={getPct(actualSavingsBucket) * 2}
                  className="h-2"
                />
                <p className="text-xs font-medium text-right">
                  {formatVND(actualSavingsBucket)}
                </p>
              </div>
            </div>

            {/* Investing */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Total Investing</span>
                <Badge variant="default">Future</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Planned</span>
                  <span>{getPct(plannedInvestingBucket).toFixed(1)}%</span>
                </div>
                <Progress
                  value={getPct(plannedInvestingBucket) * 2}
                  className="h-1.5 opacity-50"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formatVND(plannedInvestingBucket)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>Actual</span>
                  <span className="text-primary">
                    {getPct(actualInvestingBucket).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={getPct(actualInvestingBucket) * 2}
                  className="h-2"
                />
                <p className="text-xs font-medium text-right">
                  {formatVND(actualInvestingBucket)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- BUDGET MATRIX --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Budget Matrix</span>
            {!overAllocated && effectiveIncome > totalPlannedAll && (
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20 font-normal"
              >
                {formatVND(effectiveIncome - totalPlannedAll)} left to plan
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table data-tour="budget-table">
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead data-tour="budget-planned-col" className="text-right">Planned</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">+/-</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Income Section */}
              {Object.entries(incomeGrouped).map(([type, cats]) => {
                const totalPlanned = cats.reduce(
                  (s, c) =>
                    s +
                    (data.monthlyPlans[selectedMonth]?.[c.id]?.planned ?? 0),
                  0,
                );
                const totalActual = cats.reduce(
                  (s, c) => s + getActualForIncome(selectedMonth, c.id),
                  0,
                );
                const totalDiff = totalActual - totalPlanned;

                return (
                  <>
                    <TableRow key={`header-${type}`}>
                      <TableCell
                        colSpan={5}
                        className="bg-muted/50 font-semibold text-sm"
                      >
                        {TYPE_LABELS[type] || type}
                      </TableCell>
                    </TableRow>
                    {cats.map((cat) => {
                      const planned =
                        data.monthlyPlans[selectedMonth]?.[cat.id]?.planned ??
                        0;
                      const actual = getActualForIncome(selectedMonth, cat.id);
                      const diff = actual - planned;
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="text-sm">
                            {cat.emoji} {cat.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <PlannedInput
                              value={planned}
                              onChange={(raw) => handlePlanChange(cat.id, raw)}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            -
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatVND(actual)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm font-medium ${
                              diff < 0
                                ? "text-destructive"
                                : diff > 0
                                  ? "text-primary"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {formatVND(diff)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow key={`total-${type}`}>
                      <TableCell className="font-semibold text-sm">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatVND(totalPlanned)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm text-muted-foreground">
                        -
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatVND(totalActual)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold text-sm ${
                          totalDiff < 0
                            ? "text-destructive"
                            : totalDiff > 0
                              ? "text-primary"
                              : "text-muted-foreground"
                        }`}
                      >
                        {totalDiff > 0 ? "+" : ""}
                        {formatVND(totalDiff)}
                      </TableCell>
                    </TableRow>
                  </>
                );
              })}

              {/* Subscriptions Section in Table */}
              {data.subscriptions.length > 0 && (
                <>
                  <TableRow key="header-subscriptions">
                    <TableCell
                      colSpan={5}
                      className="bg-muted/50 font-semibold text-sm"
                    >
                      Recurring Subscriptions (Fixed)
                    </TableCell>
                  </TableRow>
                  {data.subscriptions.map((sub) => {
                    const actual = getActualForSubscription(
                      selectedMonth,
                      sub.name,
                    );
                    const pct = getPct(sub.amount);

                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="text-sm">
                          💳 {sub.name} (Day {sub.due_day})
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatVND(sub.amount)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {pct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {actual > 0 ? formatVND(actual) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          -
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow key="total-subscriptions">
                    <TableCell className="font-semibold text-sm">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatVND(totalSubscriptions)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm text-muted-foreground">
                      {getPct(totalSubscriptions).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatVND(totalActualSubscriptions)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm text-muted-foreground">
                      -
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* Expenses Section */}
              {Object.entries(grouped).map(([type, cats]) => {
                const totalPlanned = cats.reduce(
                  (s, c) =>
                    s +
                    (data.monthlyPlans[selectedMonth]?.[c.id]?.planned ?? 0),
                  0,
                );
                const totalActual = cats.reduce(
                  (s, c) => s + getActualForCategory(selectedMonth, c.id),
                  0,
                );
                const totalDiff = totalPlanned - totalActual;

                return (
                  <>
                    <TableRow key={`header-${type}`}>
                      <TableCell
                        colSpan={5}
                        className="bg-muted/50 font-semibold text-sm"
                      >
                        {TYPE_LABELS[type] || type}
                      </TableCell>
                    </TableRow>
                    {cats.map((cat) => {
                      const planned =
                        data.monthlyPlans[selectedMonth]?.[cat.id]?.planned ??
                        0;
                      const pct = getPct(planned);
                      const actual = getActualForCategory(
                        selectedMonth,
                        cat.id,
                      );
                      const diff = planned - actual;
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="text-sm">
                            {cat.emoji} {cat.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <PlannedInput
                              value={planned}
                              onChange={(raw) => handlePlanChange(cat.id, raw)}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {pct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatVND(actual)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm font-medium ${
                              diff < 0
                                ? "text-destructive"
                                : diff > 0
                                  ? "text-primary"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {formatVND(diff)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow key={`total-${type}`}>
                      <TableCell className="font-semibold text-sm">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatVND(totalPlanned)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm text-muted-foreground">
                        {getPct(totalPlanned).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatVND(totalActual)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold text-sm ${
                          totalDiff < 0
                            ? "text-destructive"
                            : totalDiff > 0
                              ? "text-primary"
                              : "text-muted-foreground"
                        }`}
                      >
                        {totalDiff > 0 ? "+" : ""}
                        {formatVND(totalDiff)}
                      </TableCell>
                    </TableRow>
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ... Keep InlineAmount and PlannedInput components unchanged ...
function InlineAmount({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [temp, setTemp] = useState("");

  if (isEditing) {
    return (
      <Input
        type="text"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={() => {
          onChange(parseFloat(temp.replace(/\./g, "").replace(",", ".")) || 0);
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(
              parseFloat(temp.replace(/\./g, "").replace(",", ".")) || 0,
            );
            setIsEditing(false);
          }
        }}
        className="w-28 ml-auto text-right h-8"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => {
        setTemp(value ? value.toLocaleString("de-DE") : "");
        setIsEditing(true);
      }}
      className="text-sm hover:underline cursor-pointer"
    >
      {value > 0 ? (
        formatVND(value)
      ) : (
        <span className="text-muted-foreground">0 ₫</span>
      )}
    </button>
  );
}

function PlannedInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (raw: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [temp, setTemp] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const parseRaw = (str: string): number => {
    const digits = str.replace(/\D/g, "");
    return parseInt(digits, 10) || 0;
  };

  const formatWithDots = (num: number): string => {
    if (num === 0) return "";
    return num.toLocaleString("de-DE");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw, 10) || 0;
    const formatted = formatWithDots(num);
    
    // Calculate cursor position relative to end
    const el = e.target;
    const distFromEnd = el.value.length - (el.selectionStart || 0);
    
    setTemp(formatted);

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const newPos = Math.max(0, formatted.length - distFromEnd);
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const submit = () => {
    const num = parseRaw(temp);
    onChange(String(num));
    setFocused(false);
  };

  const focusNextPlannedInput = (reverse = false) => {
    // When this input is focused, the parent div has data-planned-active
    const all = Array.from(document.querySelectorAll<HTMLElement>("[data-planned-input]"));
    const activeParent = inputRef.current?.closest("[data-planned-input]");
    const idx = activeParent ? all.indexOf(activeParent as HTMLElement) : -1;
    const next = all[reverse ? idx - 1 : idx + 1];
    if (next) {
      const btn = next.querySelector("button");
      btn?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
      focusNextPlannedInput();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      submit();
      focusNextPlannedInput(e.shiftKey);
    }
    if (e.key === "Escape") {
      setFocused(false);
    }
    // Allow: digits, backspace, delete, arrows, tab
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  if (focused) {
    return (
      <div data-planned-input>
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={temp}
          onChange={handleChange}
          onBlur={submit}
          onKeyDown={handleKeyDown}
          className="w-32 ml-auto text-right h-8"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div data-planned-input>
      <button
        onClick={() => {
          setTemp(value ? formatWithDots(value) : "");
          setFocused(true);
        }}
        className="text-sm hover:underline cursor-pointer w-full text-right"
      >
        {value > 0 ? (
          formatVND(value)
        ) : (
          <span className="text-muted-foreground">0 ₫</span>
        )}
      </button>
    </div>
  );
}
