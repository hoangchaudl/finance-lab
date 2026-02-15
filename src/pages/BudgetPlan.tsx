import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  essential: "Essential Expenses",
  nonessential: "Non-essential Expenses",
  savings: "Savings",
  investment: "Investments",
};

export default function BudgetPlan() {
  const { data, updatePlan, updateCategoryAllocation, getActualForCategory, getTotalIncome, getTotalExpenses } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getMonthKey(d);
  });

  const expenseCategories = data.categories.filter((c) => c.type !== "income");
  const grouped = expenseCategories.reduce((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type].push(cat);
    return acc;
  }, {} as Record<string, typeof expenseCategories>);

  const income = getTotalIncome(selectedMonth);
  const expenses = getTotalExpenses(selectedMonth);
  const surplus = income - expenses;
  const allocations = data.categoryAllocations ?? {};
  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const overAllocated = income > 0 && totalAllocated > income;

  const getPct = (amount: number) => {
    if (!income || income <= 0) return 0;
    return (amount / income) * 100;
  };

  const handlePlanChange = (categoryId: string, value: string) => {
    const num = parseFloat(value) || 0;
    updatePlan(selectedMonth, categoryId, num);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budget Plan</h1>
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

      {/* Allocation Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-xl font-bold text-primary">{formatVND(income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Allocated</p>
            <p className={`text-xl font-bold ${overAllocated ? "text-destructive" : ""}`}>{formatVND(totalAllocated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Monthly Surplus</p>
            <p className={`text-xl font-bold ${surplus >= 0 ? "text-primary" : "text-destructive"}`}>{formatVND(surplus)}</p>
          </CardContent>
        </Card>
      </div>

      {overAllocated && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          ⚠️ Total allocated ({formatVND(totalAllocated)}) exceeds income ({formatVND(income)}). Please adjust.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Budget Matrix</span>
            {!overAllocated && totalAllocated > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-normal">
                {formatVND(income - totalAllocated)} unallocated
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Allocation</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">+/-</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(grouped).map(([type, cats]) => {
                const totalPlanned = cats.reduce(
                  (s, c) => s + (data.monthlyPlans[selectedMonth]?.[c.id]?.planned ?? 0), 0
                );
                const totalActual = cats.reduce(
                  (s, c) => s + getActualForCategory(selectedMonth, c.id), 0
                );
                const totalDiff = totalActual - totalPlanned;
                const totalAlloc = cats.reduce((s, c) => s + (allocations[c.id] ?? 0), 0);

                return (
                  <> 
                    <TableRow key={`header-${type}`}>
                      <TableCell colSpan={6} className="bg-muted/50 font-semibold text-sm">
                        {TYPE_LABELS[type] || type}
                      </TableCell>
                    </TableRow>
                    {cats.map((cat) => {
                      const alloc = allocations[cat.id] ?? 0;
                      const pct = getPct(alloc);
                      const planned = data.monthlyPlans[selectedMonth]?.[cat.id]?.planned ?? 0;
                      const actual = getActualForCategory(selectedMonth, cat.id);
                      const diff = actual - planned;
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="text-sm">
                            {cat.emoji} {cat.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <InlineAmount
                              value={alloc}
                              onChange={(v) => updateCategoryAllocation(cat.id, v)}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {pct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            <PlannedInput
                              value={planned}
                              onChange={(raw) => handlePlanChange(cat.id, raw)}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatVND(actual)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm font-medium ${
                              diff > 0 ? "text-destructive" : diff < 0 ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {formatVND(diff)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow key={`total-${type}`}>
                      <TableCell className="font-semibold text-sm">Total</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatVND(totalAlloc)}</TableCell>
                      <TableCell className="text-right font-semibold text-sm text-muted-foreground">{getPct(totalAlloc).toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatVND(totalPlanned)}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatVND(totalActual)}</TableCell>
                      <TableCell
                        className={`text-right font-semibold text-sm ${
                          totalDiff > 0 ? "text-destructive" : totalDiff < 0 ? "text-primary" : "text-muted-foreground"
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

function InlineAmount({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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
            onChange(parseFloat(temp.replace(/\./g, "").replace(",", ".")) || 0);
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
      onClick={() => { setTemp(value ? value.toLocaleString("de-DE") : ""); setIsEditing(true); }}
      className="text-sm hover:underline cursor-pointer"
    >
      {value > 0 ? formatVND(value) : <span className="text-muted-foreground">0 ₫</span>}
    </button>
  );
}

function PlannedInput({ value, onChange }: { value: number; onChange: (raw: string) => void }) {
  const [focused, setFocused] = useState(false);
  const [temp, setTemp] = useState("");

  if (focused) {
    return (
      <Input
        type="text"
        value={temp}
        onChange={(e) => {
          setTemp(e.target.value);
          onChange(e.target.value.replace(/\./g, ""));
        }}
        onFocus={() => {}}
        onBlur={() => {
          setFocused(false);
        }}
        className="w-32 ml-auto text-right h-8"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => { setTemp(value ? value.toLocaleString("de-DE") : ""); setFocused(true); }}
      className="text-sm hover:underline cursor-pointer"
    >
      {value > 0 ? formatVND(value) : <span className="text-muted-foreground">0 ₫</span>}
    </button>
  );
}
