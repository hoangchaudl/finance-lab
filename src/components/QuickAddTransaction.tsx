import { useState, forwardRef, useImperativeHandle } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  formatVND,
  todayLocalISO,
  parseAmountInput,
  sanitizeAmountTyping,
  formatAmountTyping,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type TxType = "income" | "expense" | "investing" | "saving" | "sell" | "dividend";

export interface QuickAddHandle {
  open: () => void;
}

const QuickAddTransaction = forwardRef<QuickAddHandle>((_, ref) => {
  const { data, addTransaction } = useApp();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<TxType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [note, setNote] = useState("");
  const [portfolioEntryId, setPortfolioEntryId] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // investing/sell must move a real asset; dividend link is optional
  const showAssetLink = ["investing", "sell", "dividend"].includes(type);
  const assetRequired = type === "investing" || type === "sell";
  const qty = parseFloat(qtyStr) || 0;
  const sortedAssets = [...(data.portfolio ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  useImperativeHandle(ref, () => ({ open: () => setIsOpen(true) }));

  const filteredCategories = data.categories.filter((c) => {
    if (type === "income" || type === "dividend") return c.type === "income";
    if (type === "investing" || type === "sell") return c.type === "investment";
    if (type === "saving") return c.type === "savings";
    return c.type === "essential" || c.type === "nonessential";
  });

  const parsedAmount = parseAmountInput(amountRaw) ?? 0;

  const reset = () => {
    setType("expense");
    setCategoryId("");
    setAmountRaw("");
    setDate(todayLocalISO());
    setNote("");
    setPortfolioEntryId("");
    setQtyStr("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmountInput(amountRaw) ?? 0;
    if (!categoryId || !amount || isSubmitting) return;
    if (assetRequired && (!portfolioEntryId || qty <= 0)) return;

    setIsSubmitting(true);
    try {
      await addTransaction({
        date,
        amount,
        type,
        category_id: categoryId,
        note: note || undefined,
        portfolio_entry_id: (showAssetLink && portfolioEntryId) || undefined,
        quantity: assetRequired && qty > 0 ? qty : undefined,
      });
      toast({ title: "Transaction added" });
      reset();
      setIsOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 md:bottom-8 md:right-8"
        aria-label="Add transaction"
      >
        <Plus className="h-6 w-6" strokeWidth={2} />
      </button>

      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) reset(); }}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Quick Add Transaction</DialogTitle>
          </DialogHeader>

          {/* min-w-0: DialogContent is a grid; without this, wide children
              (category chips) inflate the form past the dialog width */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 min-w-0">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {(["expense", "income", "saving", "investing", "sell", "dividend"] as TxType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setCategoryId(""); setPortfolioEntryId(""); setQtyStr(""); }}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                    type === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-amount">Amount (₫)</Label>
              <Input
                id="qa-amount"
                autoFocus
                placeholder="e.g. 50k, 1.5tr, 50.000"
                value={formatAmountTyping(amountRaw)}
                onChange={(e) => setAmountRaw(sanitizeAmountTyping(e.target.value))}
                className="text-lg font-semibold"
              />
              {amountRaw && (
                <p className="text-xs text-muted-foreground">
                  {parsedAmount > 0 ? formatVND(parsedAmount) : "Keep typing — e.g. 50k, 1.5tr"}
                </p>
              )}
            </div>

            {/* Category — horizontal chips on mobile */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              {filteredCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pb-1">
                  {filteredCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                        categoryId === c.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {c.emoji} {c.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No categories for this type.</p>
              )}
            </div>

            {/* Asset link — investing/sell move real portfolio holdings */}
            {showAssetLink && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Link Asset{assetRequired ? "" : " (optional)"}
                  </Label>
                  {sortedAssets.length > 0 ? (
                    <Select value={portfolioEntryId} onValueChange={setPortfolioEntryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset…" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedAssets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-2">
                      No assets yet — add one in Portfolio first.
                    </p>
                  )}
                </div>
                {assetRequired && (
                  <div className="space-y-1.5">
                    <Label htmlFor="qa-qty">Quantity</Label>
                    <Input
                      id="qa-qty"
                      type="number"
                      step="any"
                      min="0"
                      placeholder={type === "sell" ? "Units sold" : "Units bought"}
                      value={qtyStr}
                      onChange={(e) => setQtyStr(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-date">Date</Label>
              <Input
                id="qa-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-note">Note (optional)</Label>
              <Input
                id="qa-note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setIsOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  !categoryId ||
                  parsedAmount <= 0 ||
                  isSubmitting ||
                  (assetRequired && (!portfolioEntryId || qty <= 0))
                }
              >
                {isSubmitting ? "Saving..." : "Add Transaction"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
});

QuickAddTransaction.displayName = "QuickAddTransaction";
export default QuickAddTransaction;
