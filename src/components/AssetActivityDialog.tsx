import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  formatVND,
  formatDate,
  todayLocalISO,
  parseAmountInput,
  sanitizeAmountTyping,
  formatAmountTyping,
} from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Coins,
  History,
} from "lucide-react";
import { TX_TYPE_BADGE, QUICK_LOG_TYPE_BADGE } from "@/lib/tx-style";

type LogType = "investing" | "sell" | "dividend";

interface AssetActivityDialogProps {
  entryId: string | null;
  onOpenChange: (open: boolean) => void;
}

export default function AssetActivityDialog({ entryId, onOpenChange }: AssetActivityDialogProps) {
  const { data, addTransaction } = useApp();
  const { toast } = useToast();

  const entry = useMemo(
    () => data.portfolio?.find((p) => p.id === entryId) ?? null,
    [data.portfolio, entryId],
  );

  const history = useMemo(
    () =>
      data.transactions
        .filter((t) => t.portfolio_entry_id === entryId)
        .sort((a, b) => {
          const d = new Date(b.date).getTime() - new Date(a.date).getTime();
          return d !== 0 ? d : b.id.localeCompare(a.id);
        }),
    [data.transactions, entryId],
  );

  const [logType, setLogType] = useState<LogType>("investing");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const relevantCategories = useMemo(
    () =>
      data.categories.filter((c) =>
        logType === "dividend" ? c.type === "income" : c.type === "investment",
      ),
    [data.categories, logType],
  );

  // Reset the form whenever a different asset is opened, and keep the
  // category selection valid whenever the log type changes.
  useEffect(() => {
    setLogType("investing");
    setAmount("");
    setQuantity("");
    setDate(todayLocalISO());
    setNote("");
  }, [entryId]);

  useEffect(() => {
    setCategoryId((prev) =>
      relevantCategories.some((c) => c.id === prev) ? prev : (relevantCategories[0]?.id ?? ""),
    );
  }, [relevantCategories]);

  if (!entry) return null;

  const qty = Number(entry.quantity) || 0;
  const avgCost = Number(entry.purchasePrice) || 0;
  const mktPrice = Number(entry.currentPrice) || 0;
  const currentValue = Math.ceil(qty * mktPrice);
  const costBasis = Math.ceil(qty * avgCost);
  const gain = currentValue - costBasis;
  const roi = costBasis > 0 ? (gain / costBasis) * 100 : 0;

  const amountValue = parseAmountInput(amount) ?? 0;
  const qtyValue = parseFloat(quantity) || 0;
  const isQtyType = logType === "investing" || logType === "sell";
  const impliedPrice = isQtyType && qtyValue > 0 ? amountValue / qtyValue : 0;

  const sellPreview =
    logType === "sell" && amountValue > 0 && qtyValue > 0
      ? { gain: amountValue - avgCost * qtyValue, salePrice: amountValue / qtyValue }
      : null;

  const canSubmit =
    amountValue > 0 &&
    !!categoryId &&
    (!isQtyType || (qtyValue > 0 && (logType !== "sell" || qtyValue <= qty)));

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await addTransaction({
        date,
        amount: amountValue,
        quantity: isQtyType ? qtyValue : undefined,
        type: logType,
        category_id: categoryId,
        note: note || undefined,
        portfolio_entry_id: entry.id,
      });
      toast({
        title: "Logged",
        description: `${QUICK_LOG_TYPE_BADGE[logType].label} recorded for ${entry.name}.`,
      });
      setAmount("");
      setQuantity("");
      setNote("");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to log transaction",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!entryId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {entry.name}
            <span className="text-sm font-normal text-muted-foreground">
              {entry.account} · {qty.toLocaleString("de-DE")} units
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className="text-lg font-bold text-primary">{formatVND(currentValue)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Cost Basis</p>
            <p className="text-lg font-bold text-muted-foreground">{formatVND(costBasis)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg / Mkt Price</p>
            <p className="text-sm font-medium">
              {formatVND(avgCost)} <span className="text-muted-foreground">/</span> {formatVND(mktPrice)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Gain / ROI</p>
            <p className={`text-lg font-bold flex items-center gap-1 ${gain >= 0 ? "text-success" : "text-destructive"}`}>
              {gain >= 0 ? <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> : <TrendingDown className="h-4 w-4" strokeWidth={1.5} />}
              {roi > 0 ? "+" : ""}
              {roi.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Quick log form */}
        <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
          <Tabs value={logType} onValueChange={(v) => setLogType(v as LogType)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="investing" className="gap-1">
                <ArrowUpCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Buy
              </TabsTrigger>
              <TabsTrigger value="sell" className="gap-1">
                <ArrowDownCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Sell
              </TabsTrigger>
              <TabsTrigger value="dividend" className="gap-1">
                <Coins className="h-3.5 w-3.5" strokeWidth={1.5} /> Dividend
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{logType === "sell" ? "Sale Amount" : logType === "dividend" ? "Amount" : "Total Cost"}</Label>
              <Input
                value={formatAmountTyping(amount)}
                onChange={(e) => setAmount(sanitizeAmountTyping(e.target.value))}
                placeholder="e.g. 2tr, 500k"
              />
            </div>
            {isQtyType && (
              <div className="space-y-1">
                <Label className="text-xs">
                  Quantity {logType === "sell" && <span className="text-muted-foreground">(avail: {qty.toLocaleString("de-DE")})</span>}
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max={logType === "sell" ? qty : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {isQtyType && impliedPrice > 0 && (
            <p className="text-xs text-muted-foreground">
              @{formatVND(Math.round(impliedPrice))}/unit
            </p>
          )}

          {sellPreview && (
            <div
              className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border-2 ${
                sellPreview.gain >= 0
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }`}
            >
              {sellPreview.gain >= 0 ? <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} /> : <TrendingDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
              Est. {sellPreview.gain >= 0 ? "profit" : "loss"}: <strong>{formatVND(Math.abs(sellPreview.gain))}</strong>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {relevantCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>

          <Button className="w-full" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "Saving…" : `Log ${QUICK_LOG_TYPE_BADGE[logType].label}`}
          </Button>
        </div>

        {/* History */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <History className="h-4 w-4" strokeWidth={1.5} /> Transaction History ({history.length})
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions logged yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {history.map((t) => {
                const badge = TX_TYPE_BADGE[t.type] ?? { label: t.type, variant: "secondary" as const };
                return (
                  <div key={t.id} className="flex items-center justify-between text-sm border-b pb-1.5 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                      <span className="text-muted-foreground text-xs">{formatDate(t.date)}</span>
                      {t.quantity ? (
                        <span className="text-xs text-muted-foreground">· {t.quantity.toLocaleString("de-DE")} units</span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatVND(t.amount)}</span>
                      {t.type === "sell" && t.realized_gain !== undefined && (
                        <span className={`block text-[10px] ${t.realized_gain >= 0 ? "text-success" : "text-destructive"}`}>
                          {t.realized_gain >= 0 ? "+" : ""}
                          {formatVND(t.realized_gain)} gain
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
