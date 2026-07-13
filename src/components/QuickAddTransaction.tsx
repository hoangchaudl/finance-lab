import { useState, forwardRef, useImperativeHandle } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { formatVND } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useImperativeHandle(ref, () => ({ open: () => setIsOpen(true) }));

  const filteredCategories = data.categories.filter((c) => {
    if (type === "income" || type === "dividend") return c.type === "income";
    if (type === "investing" || type === "sell") return c.type === "investment";
    if (type === "saving") return c.type === "savings";
    return c.type === "essential" || c.type === "nonessential";
  });

  const formatDisplay = (v: string) => {
    const num = v.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const reset = () => {
    setType("expense");
    setCategoryId("");
    setAmountRaw("");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountRaw);
    if (!categoryId || !amount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addTransaction({
        date,
        amount,
        type,
        category_id: categoryId,
        note: note || undefined,
      });
      toast({ title: "Transaction added" });
      reset();
      setIsOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to add transaction", variant: "destructive" });
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
                  onClick={() => { setType(t); setCategoryId(""); }}
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
                inputMode="numeric"
                placeholder="0"
                value={formatDisplay(amountRaw)}
                onChange={(e) => setAmountRaw(e.target.value.replace(/\D/g, ""))}
                className="text-lg font-semibold"
              />
              {amountRaw && (
                <p className="text-xs text-muted-foreground">{formatVND(parseFloat(amountRaw) || 0)}</p>
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
              <Button type="submit" className="flex-1" disabled={!categoryId || !amountRaw || isSubmitting}>
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
