import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import HintBanner from "@/components/HintBanner";
import PageTourButton from "@/components/PageTourButton";
import { usePageTour } from "@/hooks/use-page-tour";
import { useApp } from "@/contexts/AppContext";
import { formatVND } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Building2,
  ChevronDown,
  ChevronRight,
  PieChart as PieIcon,
  Layers,
  Shield,
  Banknote,
  Coins,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const ICON_STROKE = 1.5;

const TIER_OPTIONS = [
  { value: "Defensive" },
  { value: "Safe" },
  { value: "Income" },
  { value: "Growth" },
  { value: "Risk" },
];

const TOWER_TIERS = TIER_OPTIONS;

const TIER_STYLES: Record<string, { border: string; bar: string }> = {
  Defensive: { border: "border-l-4 border-blue-400", bar: "bg-blue-400" },
  Safe: { border: "border-l-4 border-green-400", bar: "bg-green-400" },
  Income: { border: "border-l-4 border-yellow-400", bar: "bg-yellow-400" },
  Growth: { border: "border-l-4 border-purple-400", bar: "bg-purple-400" },
  Risk: { border: "border-l-4 border-red-400", bar: "bg-red-400" },
};

const getTierIcon = (tierName: string, size = "h-4 w-4") => {
  const map: Record<string, { Icon: typeof Shield; cls: string }> = {
    Defensive: { Icon: Shield, cls: "text-blue-500" },
    Safe: { Icon: Banknote, cls: "text-green-500" },
    Income: { Icon: Coins, cls: "text-yellow-500" },
    Growth: { Icon: TrendingUp, cls: "text-purple-500" },
    Risk: { Icon: Zap, cls: "text-red-500" },
  };
  const entry = map[tierName];
  if (!entry) return null;
  const { Icon, cls } = entry;
  return <Icon className={`${size} ${cls} shrink-0`} strokeWidth={1.5} />;
};

const getTierBadge = (
  name: string,
  value: number,
  pct: number,
  isPortfolioEmpty: boolean,
) => {
  const ok = (
    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
      ✅ OK
    </Badge>
  );
  const warn = (msg: string) => (
    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
      ⚠️ {msg}
    </Badge>
  );
  const danger = (msg: string) => (
    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
      🔴 {msg}
    </Badge>
  );

  // When entire portfolio is empty, Risk target is 0% so it's OK; all others are empty
  if (isPortfolioEmpty) return name === "Risk" ? ok : warn("Empty");

  if (name === "Defensive") return value > 0 ? ok : warn("Empty");
  if (name === "Safe") {
    if (pct === 0) return warn("Empty");
    return pct >= 20 && pct <= 30 ? ok : warn("Out of range");
  }
  if (name === "Income") {
    if (pct === 0) return warn("Empty");
    if (pct >= 30 && pct <= 40) return ok;
    return pct < 30 ? warn("Below target") : warn("Out of range");
  }
  if (name === "Growth") {
    if (pct === 0) return warn("Empty");
    return pct >= 15 && pct <= 25 ? ok : warn("Out of range");
  }
  if (name === "Risk") {
    if (pct === 0) return warn("Empty");
    return pct <= 10 ? ok : danger("Exceeded limit");
  }
  return null;
};

const TYPE_OPTIONS = [
  "Savings",
  "Stocks",
  "Crypto",
  "Gold",
  "ETF",
  "Other",
] as const;

const CHART_COLORS: Record<string, string> = {
  Savings: "#22c55e",
  Stocks: "#3b82f6",
  Crypto: "#a855f7",
  Gold: "#eab308",
  ETF: "#14b8a6",
  Other: "#64748b",
};

// --- HELPER: FORMAT INPUT AS 1.000.000 ---
const formatInputWithDots = (value: string) => {
  // 1. Remove everything except digits and comma (for decimals if needed)
  let clean = value.replace(/[^\d]/g, "");

  // 2. Remove leading zeros
  clean = clean.replace(/^0+/, "");

  if (!clean) return "";

  // 3. Add dots every 3 digits
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Helper to parse "1.000.000" back to number 1000000
const parseFormattedNumber = (str: string) =>
  parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;

interface EditState {
  id: string;
  name: string;
  type: string;
  tier: string;
  account: string;
  quantity: number;
  // Store these as strings in Edit state to support formatting while typing
  purchasePrice: string;
  currentPrice: string;
  notes?: string;
}

export default function Portfolio() {
  const {
    data,
    addPortfolioEntry,
    updatePortfolioEntry,
    deletePortfolioEntry,
  } = useApp();
  const { toast } = useToast();
  const { startTour } = usePageTour("portfolio");
  const entries = data.portfolio ?? [];

  // --- 1. CALCULATIONS & GROUPING ---
  const calculatedEntries = entries.map((entry) => {
    const qty = Number(entry.quantity) || 0;
    const buy = Number(entry.purchasePrice) || 0;
    const cur = Number(entry.currentPrice) || 0;

    const costBasis = Math.ceil(qty * buy);
    const currentValue = Math.ceil(qty * cur);

    const gain = currentValue - costBasis;
    const roi = costBasis > 0 ? (gain / costBasis) * 100 : 0;
    return {
      ...entry,
      quantity: qty,
      purchasePrice: buy,
      currentPrice: cur,
      costBasis,
      currentValue,
      gain,
      roi,
    };
  });

  type Group = {
    name: string;
    type: string;
    totalQty: number;
    totalCost: number;
    totalValue: number;
    avgPrice: number;
    children: typeof calculatedEntries;
  };

  const groupedAssets = Object.values(
    calculatedEntries.reduce(
      (acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = {
            name: item.name,
            type: item.type,
            totalQty: 0,
            totalCost: 0,
            totalValue: 0,
            avgPrice: 0,
            children: [],
          };
        }
        const group = acc[item.name];
        group.children.push(item);
        group.totalQty += item.quantity;
        group.totalCost += item.costBasis;
        group.totalValue += item.currentValue;
        return acc;
      },
      {} as Record<string, Group>,
    ),
  ).map((g) => ({
    ...g,
    avgPrice: g.totalQty > 0 ? Math.ceil(g.totalCost / g.totalQty) : 0,
    roi:
      g.totalCost > 0 ? ((g.totalValue - g.totalCost) / g.totalCost) * 100 : 0,
  }));

  const investmentEntries = calculatedEntries.filter((e) => e.type !== "Other");

  const totalCostBasis = investmentEntries.reduce((s, e) => s + e.costBasis, 0);
  const totalCurrentValue = investmentEntries.reduce(
    (s, e) => s + e.currentValue,
    0,
  );
  const totalGain = totalCurrentValue - totalCostBasis;
  const totalROI = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

  const categoryChartData = Object.entries(
    investmentEntries.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + e.currentValue;
        return acc;
      },
      {} as Record<string, number>,
    ),
  )
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  const accountTotals = investmentEntries.reduce(
    (acc, entry) => {
      const acct = entry.account || "Unassigned";
      acc[acct] = (acc[acct] || 0) + entry.currentValue;
      return acc;
    },
    {} as Record<string, number>,
  );

  const sortedAccounts = Object.entries(accountTotals).sort(
    (a, b) => b[1] - a[1],
  );

  // --- STATE ---
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);

  const toggleExpand = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const [form, setForm] = useState({
    name: "",
    type: "Stocks",
    tier: "Growth",
    account: "",
    quantity: "",
    purchasePrice: "",
    currentPrice: "",
    notes: "",
  });
  const existingAccounts = Array.from(
    new Set(entries.map((e) => e.account).filter(Boolean)),
  );

  const handleAdd = async () => {
    if (!form.name.trim() || !form.currentPrice) return;
    try {
      await addPortfolioEntry({
        name: form.name.trim(),
        type: form.type,
        tier: form.tier,
        account: form.account.trim() || "General",
        quantity: parseFormattedNumber(form.quantity),
        purchasePrice: parseFormattedNumber(form.purchasePrice),
        currentPrice: parseFormattedNumber(form.currentPrice),
        notes: form.notes || undefined,
      });
      setForm({
        name: "",
        type: "Stocks",
        tier: "Growth",
        account: "",
        quantity: "",
        purchasePrice: "",
        currentPrice: "",
        notes: "",
      });
      setAdding(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    try {
      await updatePortfolioEntry(editing.id, {
        name: editing.name,
        type: editing.type,
        tier: editing.tier,
        account: editing.account,
        quantity: editing.quantity,
        purchasePrice: parseFormattedNumber(editing.purchasePrice),
        currentPrice: parseFormattedNumber(editing.currentPrice),
        notes: editing.notes || undefined,
      });
      setEditing(null);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Tower calculations
  const towerTotal = calculatedEntries.reduce((s, e) => s + e.currentValue, 0);
  const towerData = TOWER_TIERS.map(({ value: tierName }) => {
    const val = calculatedEntries
      .filter((e) => e.tier === tierName)
      .reduce((s, e) => s + e.currentValue, 0);
    const pct = towerTotal > 0 ? (val / towerTotal) * 100 : 0;
    return { name: tierName, value: val, pct };
  });

  // Live Calc for Add Form
  const addFormValue =
    parseFormattedNumber(form.quantity) *
    parseFormattedNumber(form.currentPrice);

  return (
    <div className="space-y-6">
      <HintBanner
        pageKey="portfolio"
        message="🏗️ Add your investments here and assign each one to a tier: Defensive (emergency fund), Safe (bonds/gold), Income (dividend stocks/ETFs), Growth (stocks), or Risk (crypto). The Asset Tower shows your allocation health."
      />

      <div className="flex items-center justify-between">
        <h1 data-tour="page-title" className="text-2xl font-bold flex items-center gap-1">
          Portfolio Manager
          <PageTourButton onClick={startTour} />
        </h1>
        <Button data-tour="portfolio-add" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" strokeWidth={ICON_STROKE} /> Add Asset
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Cost Basis</p>
            <p className="text-xl font-bold text-muted-foreground">
              {formatVND(totalCostBasis)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <p className="text-sm text-primary font-medium">
              Total Current Value
            </p>
            <p className="text-2xl font-bold text-primary">
              {formatVND(totalCurrentValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Overall ROI</p>
            <div className="flex items-end gap-2">
              <p
                className={`text-2xl font-bold ${totalROI >= 0 ? "text-green-600" : "text-destructive"}`}
              >
                {totalROI > 0 ? "+" : ""}
                {totalROI.toFixed(2)}%
              </p>
              <p
                className={`text-sm font-medium ${totalGain >= 0 ? "text-green-600" : "text-destructive"}`}
              >
                ({totalGain >= 0 ? "+" : ""}
                {formatVND(Math.ceil(totalGain))})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <PieIcon className="h-4 w-4" strokeWidth={ICON_STROKE} />{" "}
              Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[entry.name] || "#8884d8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => formatVND(Math.ceil(val))}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value: string) => {
                    const item = categoryChartData.find(
                      (d) => d.name === value,
                    );
                    const pct =
                      item && totalCurrentValue > 0
                        ? ((item.value / totalCurrentValue) * 100).toFixed(1)
                        : "0";
                    return `${value} (${pct}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" strokeWidth={ICON_STROKE} />{" "}
              Account Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sortedAccounts.map(([acct, val]) => (
                <div
                  key={acct}
                  className="flex flex-col p-3 rounded-lg border bg-card"
                >
                  <span
                    className="text-xs font-semibold text-muted-foreground uppercase truncate"
                    title={acct}
                  >
                    {acct}
                  </span>
                  <span className="text-md font-bold">
                    {formatVND(Math.ceil(val))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Tower */}
      <Card className="bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers size={20} className="text-slate-600" />
            Asset Tower
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const isPortfolioEmpty = towerTotal === 0;
            return towerData.map(({ name, value, pct }) => (
              <div
                key={name}
                className={`space-y-1 pl-3 ${TIER_STYLES[name]?.border ?? ""}`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    {getTierIcon(name)}
                    {name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {formatVND(Math.round(value))}
                    </span>
                    <span className="font-semibold w-14 text-right">
                      {pct.toFixed(1)}%
                    </span>
                    {getTierBadge(name, value, pct, isPortfolioEmpty)}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${TIER_STYLES[name]?.bar ?? "bg-slate-400"}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            ));
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-6"></TableHead>
                <TableHead className="w-[18%]">Asset</TableHead>
                <TableHead className="w-[9%]">Type</TableHead>
                <TableHead className="w-[9%]">Tier</TableHead>
                <TableHead className="text-right w-[8%]">Qty</TableHead>
                <TableHead className="text-right w-[11%]">Avg Price</TableHead>
                <TableHead className="text-right w-[11%]">Mkt Price</TableHead>
                <TableHead className="text-right font-bold text-primary w-[12%]">
                  Total Value
                </TableHead>
                <TableHead className="text-right w-[7%]">ROI %</TableHead>
                <TableHead className="text-right w-[10%]">ROI ₫</TableHead>
                <TableHead className="text-right w-[7%]">Updated</TableHead>
                <TableHead className="w-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <TableRow className="bg-muted/30">
                  <TableCell></TableCell>
                  <TableCell>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Asset Name"
                      className="h-7 text-sm mb-1"
                      autoFocus
                    />
                    <Input
                      value={form.account}
                      onChange={(e) =>
                        setForm({ ...form, account: e.target.value })
                      }
                      placeholder="Account"
                      className="h-6 text-xs"
                      list="acct-list"
                    />
                    <datalist id="acct-list">
                      {existingAccounts.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm({ ...form, type: v })}
                    >
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={form.tier}
                      onValueChange={(v) => setForm({ ...form, tier: v })}
                    >
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIER_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="flex items-center gap-1.5">
                              {getTierIcon(t.value, "h-3.5 w-3.5")}
                              {t.value}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm({ ...form, quantity: e.target.value })
                      }
                      placeholder="Qty"
                      className="h-7 text-sm text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={form.purchasePrice}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          purchasePrice: formatInputWithDots(e.target.value),
                        })
                      }
                      placeholder="Buy"
                      className="h-7 text-sm text-right w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={form.currentPrice}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          currentPrice: formatInputWithDots(e.target.value),
                        })
                      }
                      placeholder="Now"
                      className="h-7 text-sm text-right w-full"
                    />
                  </TableCell>
                  <TableCell
                    colSpan={4}
                    className="text-center text-xs font-bold text-primary"
                  >
                    {addFormValue > 0
                      ? formatVND(Math.ceil(addFormValue))
                      : "Auto-calc"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleAdd}
                      >
                        <Check
                          className="h-4 w-4 text-green-600"
                          strokeWidth={ICON_STROKE}
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setAdding(false)}
                      >
                        <X className="h-4 w-4" strokeWidth={ICON_STROKE} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {groupedAssets.map((group) => {
                const isExpanded = expandedGroups[group.name];

                // Calculate Last Edited
                const lastEditedTimestamp = group.children
                  .map((c) =>
                    c.updatedAt ? new Date(c.updatedAt).getTime() : 0,
                  )
                  .reduce((max, current) => Math.max(max, current), 0);

                const lastEditedString =
                  lastEditedTimestamp > 0
                    ? (() => {
                        const d = new Date(lastEditedTimestamp);
                        const dd = String(d.getDate()).padStart(2, "0");
                        const mm = String(d.getMonth() + 1).padStart(2, "0");
                        const yyyy = d.getFullYear();
                        return `${dd}/${mm}/${yyyy}`;
                      })()
                    : null;

                return (
                  <React.Fragment key={group.name}>
                    <TableRow
                      key={group.name}
                      className="bg-muted/10 hover:bg-muted/20 cursor-pointer"
                      onClick={() => toggleExpand(group.name)}
                    >
                      <TableCell>
                        <div className="flex items-center">
                          {isExpanded ? (
                            <ChevronDown
                              className="h-4 w-4"
                              strokeWidth={ICON_STROKE}
                            />
                          ) : (
                            <ChevronRight
                              className="h-4 w-4"
                              strokeWidth={ICON_STROKE}
                            />
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-bold text-base">
                        {group.name}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">{group.type}</Badge>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-medium">
                        {group.totalQty.toLocaleString("de-DE")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground italic">
                        {formatVND(group.avgPrice)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {group.children.length > 0
                          ? formatVND(Math.ceil(group.children[0].currentPrice))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-base">
                        {formatVND(Math.ceil(group.totalValue))}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${group.roi >= 0 ? "text-green-600" : "text-destructive"}`}
                      >
                        {group.roi > 0 ? "+" : ""}
                        {group.roi.toFixed(1)}%
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${group.totalValue - group.totalCost >= 0 ? "text-green-600" : "text-destructive"}`}
                      >
                        {group.totalValue - group.totalCost >= 0 ? "+" : ""}
                        {formatVND(
                          Math.ceil(group.totalValue - group.totalCost),
                        )}
                      </TableCell>

                      <TableCell className="text-right text-xs text-muted-foreground">
                        {lastEditedString || "—"}
                      </TableCell>

                      <TableCell></TableCell>
                    </TableRow>

                    {isExpanded &&
                      group.children.map((child) => {
                        if (editing?.id === child.id) {
                          return (
                            <TableRow key={child.id} className="bg-blue-50/50">
                              <TableCell></TableCell>
                              <TableCell className="pl-8">
                                <Input
                                  value={editing.name}
                                  onChange={(e) =>
                                    setEditing({
                                      ...editing,
                                      name: e.target.value,
                                    })
                                  }
                                  className="h-7 text-sm mb-1"
                                />
                                <Input
                                  value={editing.account}
                                  onChange={(e) =>
                                    setEditing({
                                      ...editing,
                                      account: e.target.value,
                                    })
                                  }
                                  className="h-6 text-xs"
                                  list="acct-list"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={editing.type}
                                  onValueChange={(v) =>
                                    setEditing({ ...editing, type: v })
                                  }
                                >
                                  <SelectTrigger className="h-7 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TYPE_OPTIONS.map((t) => (
                                      <SelectItem key={t} value={t}>
                                        {t}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={editing.tier}
                                  onValueChange={(v) =>
                                    setEditing({ ...editing, tier: v })
                                  }
                                >
                                  <SelectTrigger className="h-7 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIER_OPTIONS.map((t) => (
                                      <SelectItem key={t.value} value={t.value}>
                                        <span className="flex items-center gap-1.5">
                                          {getTierIcon(t.value, "h-3.5 w-3.5")}
                                          {t.value}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editing.quantity}
                                  onChange={(e) =>
                                    setEditing({
                                      ...editing,
                                      quantity: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="h-7 text-sm text-right"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editing.purchasePrice}
                                  onChange={(e) =>
                                    setEditing({
                                      ...editing,
                                      purchasePrice: formatInputWithDots(
                                        e.target.value,
                                      ),
                                    })
                                  }
                                  className="h-7 text-sm text-right w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editing.currentPrice}
                                  onChange={(e) =>
                                    setEditing({
                                      ...editing,
                                      currentPrice: formatInputWithDots(
                                        e.target.value,
                                      ),
                                    })
                                  }
                                  className="h-7 text-sm text-right w-full"
                                />
                              </TableCell>
                              <TableCell colSpan={4}></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={handleSaveEdit}
                                  >
                                    <Check
                                      className="h-4 w-4 text-green-600"
                                      strokeWidth={ICON_STROKE}
                                    />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => setEditing(null)}
                                  >
                                    <X
                                      className="h-4 w-4"
                                      strokeWidth={ICON_STROKE}
                                    />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return (
                          <TableRow key={child.id}>
                            <TableCell></TableCell>
                            <TableCell className="pl-10 text-sm flex items-center gap-2">
                              <Building2
                                className="h-3 w-3 text-muted-foreground"
                                strokeWidth={ICON_STROKE}
                              />
                              {child.account}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                {getTierIcon(child.tier, "h-3 w-3")}
                                {child.tier}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {child.quantity.toLocaleString("de-DE")}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {formatVND(Math.ceil(child.purchasePrice))}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {formatVND(Math.ceil(child.currentPrice))}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatVND(Math.ceil(child.currentValue))}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {child.roi.toFixed(1)}%
                            </TableCell>
                            <TableCell
                              className={`text-right text-sm ${child.gain >= 0 ? "text-green-600" : "text-destructive"}`}
                            >
                              {child.gain >= 0 ? "+" : ""}
                              {formatVND(Math.ceil(child.gain))}
                            </TableCell>

                            <TableCell className="text-right text-xs text-muted-foreground">
                              {child.updatedAt
                                ? (() => {
                                    const d = new Date(child.updatedAt);
                                    const dd = String(d.getDate()).padStart(
                                      2,
                                      "0",
                                    );
                                    const mm = String(
                                      d.getMonth() + 1,
                                    ).padStart(2, "0");
                                    const yyyy = d.getFullYear();
                                    return `${dd}/${mm}/${yyyy}`;
                                  })()
                                : "—"}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditing({
                                      ...child,
                                      purchasePrice: formatInputWithDots(
                                        Math.ceil(
                                          child.purchasePrice,
                                        ).toString(),
                                      ),
                                      currentPrice: formatInputWithDots(
                                        Math.ceil(
                                          child.currentPrice,
                                        ).toString(),
                                      ),
                                    });
                                  }}
                                >
                                  <Pencil
                                    className="h-3 w-3"
                                    strokeWidth={ICON_STROKE}
                                  />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await deletePortfolioEntry(child.id);
                                    } catch (err) {
                                      toast({
                                        title: "Error",
                                        description:
                                          err instanceof Error
                                            ? err.message
                                            : "Something went wrong. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Trash2
                                    className="h-3 w-3 text-destructive"
                                    strokeWidth={ICON_STROKE}
                                  />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
