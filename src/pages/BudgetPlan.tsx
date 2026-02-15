import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { data, updatePlan, getActualForCategory, getTotalIncome, getTotalExpenses } = useApp();
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

      <Card>
        <CardHeader>
          <CardTitle>
            Monthly surplus:{" "}
            <span className={surplus >= 0 ? "text-primary" : "text-destructive"}>
              {formatVND(surplus)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Category</TableHead>
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

                return (
                  <> 
                    <TableRow key={`header-${type}`}>
                      <TableCell colSpan={4} className="bg-muted/50 font-semibold text-sm">
                        {TYPE_LABELS[type] || type}
                      </TableCell>
                    </TableRow>
                    {cats.map((cat) => {
                      const planned = data.monthlyPlans[selectedMonth]?.[cat.id]?.planned ?? 0;
                      const actual = getActualForCategory(selectedMonth, cat.id);
                      const diff = actual - planned;
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="text-sm">
                            {cat.emoji} {cat.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="w-32 ml-auto text-right h-8"
                              value={planned || ""}
                              onChange={(e) => handlePlanChange(cat.id, e.target.value)}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatVND(actual)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm font-medium ${
                              diff > 0
                                ? "text-destructive"
                                : diff < 0
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
                      <TableCell className="font-semibold text-sm">Total</TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatVND(totalPlanned)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatVND(totalActual)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold text-sm ${
                          totalDiff > 0
                            ? "text-destructive"
                            : totalDiff < 0
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
