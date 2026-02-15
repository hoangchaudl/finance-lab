import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type ReportType = "monthly" | "yearly";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Report() {
  const { data } = useApp();
  const { transactions } = data;

  const [view, setView] = useState<ReportType>("monthly");
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );
  // NEW: State for selected month ("all" or "01"-"12")
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // 1. Extract unique years for the filter
  const years = useMemo(() => {
    const uniqueYears = Array.from(
      new Set(transactions.map((t) => new Date(t.date).getFullYear())),
    );
    return uniqueYears.sort((a, b) => b - a).map(String);
  }, [transactions]);

  // 2. Aggregate Data
  const reportData = useMemo(() => {
    const grouped: Record<
      string,
      {
        income: number;
        expense: number;
        saving: number;
        investing: number;
        netChange: number;
      }
    > = {};

    transactions.forEach((t) => {
      const date = new Date(t.date);
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");

      // Determine grouping key
      let key = view === "monthly" ? `${year}-${month}` : year;

      // Filter Logic
      if (view === "monthly") {
        // Filter by Year
        if (year !== selectedYear) return;
        // Filter by Month (if specific month selected)
        if (selectedMonth !== "all" && month !== selectedMonth) return;
      }

      if (!grouped[key]) {
        grouped[key] = {
          income: 0,
          expense: 0,
          saving: 0,
          investing: 0,
          netChange: 0,
        };
      }

      const amount = t.amount;
      if (t.type === "income") {
        grouped[key].income += amount;
        grouped[key].netChange += amount;
      } else if (t.type === "expense") {
        grouped[key].expense += amount;
        grouped[key].netChange -= amount;
      } else if (t.type === "saving") {
        grouped[key].saving += amount;
      } else if (t.type === "investing") {
        grouped[key].investing += amount;
      }
    });

    return Object.entries(grouped)
      .map(([period, values]) => ({
        period,
        ...values,
        savedInvested: values.saving + values.investing,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [transactions, view, selectedYear, selectedMonth]);

  // Calculations for Summary Cards
  const totalIncome = reportData.reduce((s, d) => s + d.income, 0);
  const totalExpenses = reportData.reduce((s, d) => s + d.expense, 0);
  const totalSavedInvested = reportData.reduce(
    (s, d) => s + d.saving + d.investing,
    0,
  );
  const netChange = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Financial Report</h1>

        <div className="flex flex-wrap items-center gap-2">
          {view === "monthly" && (
            <>
              {/* Year Selector */}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.length > 0 ? (
                    years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={new Date().getFullYear().toString()}>
                      {new Date().getFullYear()}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Month Selector */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTH_NAMES.map((name, index) => (
                    <SelectItem
                      key={name}
                      value={(index + 1).toString().padStart(2, "0")}
                    >
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <Tabs
            value={view}
            onValueChange={(v) => {
              setView(v as ReportType);
              if (v === "yearly") setSelectedMonth("all"); // Reset month filter when switching to yearly
            }}
          >
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* --- SUMMARY CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-600">
            {formatVND(totalIncome)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">
            {formatVND(totalExpenses)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">
              Saved & Invested
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-blue-600">
            {formatVND(totalSavedInvested)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-bold ${netChange >= 0 ? "text-primary" : "text-destructive"}`}
          >
            {netChange > 0 ? "+" : ""}
            {formatVND(netChange)}
          </CardContent>
        </Card>
      </div>

      {/* --- CHART --- */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={reportData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(val) => `${val / 1000000}M`} />
              <Tooltip
                formatter={(val: number) => formatVND(val)}
                labelStyle={{ color: "black" }}
              />
              <Legend />
              <Bar
                dataKey="income"
                name="Income"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="Expense"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="savedInvested"
                name="Saved/Invested"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* --- DETAILED TABLE --- */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right text-green-600">
                  Income
                </TableHead>
                <TableHead className="text-right text-red-600">
                  Expenses
                </TableHead>
                <TableHead className="text-right text-purple-600">
                  Savings
                </TableHead>
                <TableHead className="text-right text-blue-600">
                  Investment
                </TableHead>
                <TableHead className="text-right">Net Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No transaction data found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium">{row.period}</TableCell>
                    <TableCell className="text-right">
                      {formatVND(row.income)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVND(row.expense)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVND(row.saving)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVND(row.investing)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${row.netChange >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {row.netChange > 0 ? "+" : ""}
                      {formatVND(row.netChange)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
