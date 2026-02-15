import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)"];

export default function Dashboard() {
  const { data, getTotalIncome, getTotalExpenses, getNetWorth } = useApp();
  const monthKey = getMonthKey();
  const income = getTotalIncome(monthKey);
  const expenses = getTotalExpenses(monthKey);
  const savings = income - expenses;
  const ratio = income > 0 ? ((expenses / income) * 100).toFixed(1) : "0";
  const netWorth = getNetWorth();

  const allocData = [
    { name: "Thiết yếu", value: data.incomeAllocations.essentials_pct },
    { name: "Lifestyle", value: data.incomeAllocations.lifestyle_pct },
    { name: "Tiết kiệm", value: data.incomeAllocations.savings_pct },
  ];

  const today = new Date();
  const currentDay = today.getDate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan — {getMonthLabel(monthKey)}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tổng thu nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatVND(income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tổng chi tiêu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatVND(expenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tiết kiệm</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${savings >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatVND(savings)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Chi/Thu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ratio}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth */}
        <Card>
          <CardHeader>
            <CardTitle>Tổng tài sản ròng</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary mb-4">{formatVND(netWorth)}</p>
            <div className="space-y-2">
              {data.assets.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span>{a.emoji} {a.name}</span>
                  <span className="text-muted-foreground">{formatVND(a.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Income Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ thu nhập</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" stroke="none">
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
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span>{d.name}: {d.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Mục tiêu tiết kiệm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.goals.map((g) => {
              const pct = Math.min(100, (g.current / g.target) * 100);
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatVND(g.current)} / {formatVND(g.target)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng ký định kỳ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.subscriptions.map((s) => {
              const daysUntil = s.due_day - currentDay;
              const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Ngày {s.due_day} hàng tháng</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{formatVND(s.amount)}</span>
                    {isUpcoming && (
                      <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">Sắp đến hạn</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
