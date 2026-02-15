import { useApp } from "@/contexts/AppContext";
import { formatVND } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const ASSET_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
];

export default function FireGoals() {
  const { data, updateAsset, updateFireSettings, getNetWorth } = useApp();
  const { fireSettings } = data;
  const netWorth = getNetWorth();

  const annualExpenses = fireSettings.monthlyExpenses * 12;
  const fiNumber = annualExpenses * 25;
  const futureFI = fiNumber * Math.pow(1 + fireSettings.inflationRate / 100, 10);
  const fireProgress = Math.min(100, (netWorth / fiNumber) * 100);

  const projectionData = Array.from({ length: 21 }, (_, i) => {
    const year = new Date().getFullYear() + i;
    const monthlySavings = fireSettings.monthlyExpenses * 0.3;
    const projectedNW =
      netWorth * Math.pow(1 + fireSettings.returnRate / 100, i) +
      monthlySavings * 12 * ((Math.pow(1 + fireSettings.returnRate / 100, i) - 1) / (fireSettings.returnRate / 100));
    return { year: year.toString(), netWorth: Math.round(projectedNW), fiTarget: Math.round(futureFI) };
  });

  const formatAxis = (v: number) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    return v.toString();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">FIRE Goals 🔥</h1>

      <Card>
        <CardHeader>
          <CardTitle>FIRE Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-2">
            <Progress value={fireProgress} className="flex-1 h-4" />
            <span className="text-xl font-bold text-primary">{fireProgress.toFixed(1)}% 🥳</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatVND(netWorth)} / {formatVND(fiNumber)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>FIRE Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Monthly Expenses</Label>
              <Input
                type="number"
                value={fireSettings.monthlyExpenses}
                onChange={(e) =>
                  updateFireSettings({ ...fireSettings, monthlyExpenses: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inflation Rate (%)</Label>
                <Input
                  type="number"
                  value={fireSettings.inflationRate}
                  onChange={(e) =>
                    updateFireSettings({ ...fireSettings, inflationRate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Expected Return (%)</Label>
                <Input
                  type="number"
                  value={fireSettings.returnRate}
                  onChange={(e) =>
                    updateFireSettings({ ...fireSettings, returnRate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2 text-sm pt-2 border-t border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Expenses</span>
                <span>{formatVND(annualExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FI Number (×25)</span>
                <span className="font-semibold text-primary">{formatVND(fiNumber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FI after 10 years (inflation)</span>
                <span>{formatVND(Math.round(futureFI))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.assets}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {data.assets.map((_, i) => (
                        <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => formatVND(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                <Table>
                  <TableBody>
                    {data.assets.map((a, i) => (
                      <TableRow key={a.id}>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: ASSET_COLORS[i % ASSET_COLORS.length] }} />
                            <span className="text-sm">{a.emoji} {a.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="number"
                            className="w-36 h-8 text-right"
                            value={a.value}
                            onChange={(e) => updateAsset(a.id, parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-right font-bold mt-2">
                  Total: {formatVND(netWorth)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FIRE Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 88%)" />
                <XAxis dataKey="year" stroke="hsl(0, 0%, 45%)" fontSize={12} />
                <YAxis tickFormatter={formatAxis} stroke="hsl(0, 0%, 45%)" fontSize={12} />
                <RechartsTooltip
                  formatter={(v: number) => formatVND(v)}
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(0, 0%, 88%)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="hsl(160, 84%, 39%)"
                  strokeWidth={2}
                  dot={false}
                  name="Net Worth"
                />
                <ReferenceLine
                  y={Math.round(futureFI)}
                  stroke="hsl(0, 72%, 51%)"
                  strokeDasharray="5 5"
                  label={{ value: "FI Target", fill: "hsl(0, 72%, 51%)", fontSize: 12 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
