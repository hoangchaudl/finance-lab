import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey, getMonthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Link as LinkIcon } from "lucide-react";

export default function Transactions() {
  const {
    data,
    addTransaction,
    deleteTransaction,
    getMonthTransactions,
    getActualForCategory,
    getTotalIncome,
  } = useApp();

  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [formType, setFormType] = useState<
    "income" | "expense" | "investing" | "saving"
  >("expense");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [formNote, setFormNote] = useState("");
  const [formPortfolioId, setFormPortfolioId] = useState<string>("none");
  const [formQuantity, setFormQuantity] = useState("");

  const transactions = getMonthTransactions(selectedMonth).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const filteredCategories = data.categories.filter((c) => {
    if (formType === "income") return c.type === "income";
    if (formType === "investing") return c.type === "investment";
    if (formType === "saving") return c.type === "savings";
    return c.type === "essential" || c.type === "nonessential";
  });

  const isPortfolioType = formType === "investing" || formType === "saving";

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getMonthKey(d);
  });

  // Calculate Implied Price for display
  const impliedPrice =
    parseFloat(formAmount) && parseFloat(formQuantity)
      ? parseFloat(formAmount) / parseFloat(formQuantity)
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formAmount) return;

    addTransaction({
      date: formDate,
      amount: parseFloat(formAmount),
      quantity: isPortfolioType ? parseFloat(formQuantity) || 0 : undefined,
      type: formType,
      category_id: formCategory,
      note: formNote || undefined,
      portfolio_entry_id:
        isPortfolioType && formPortfolioId !== "none"
          ? formPortfolioId
          : undefined,
    });

    setFormAmount("");
    setFormQuantity("");
    setFormNote("");
    if (isPortfolioType) setFormPortfolioId("none");
  };

  const getCategoryById = (id: string) =>
    data.categories.find((c) => c.id === id);
  const getPortfolioName = (id?: string) =>
    data.portfolio?.find((p) => p.id === id)?.name;
  const getEvaluation = (categoryId: string) => {
    const plan = data.monthlyPlans[selectedMonth]?.[categoryId]?.planned ?? 0;
    if (plan === 0) return null;
    const actual = getActualForCategory(selectedMonth, categoryId);
    if (actual > plan) return "over";
    if (actual < plan) return "under";
    return "equal";
  };
  const monthlyIncome = getTotalIncome(selectedMonth);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "income":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            Income
          </Badge>
        );
      case "investing":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            Invest
          </Badge>
        );
      case "saving":
        return (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            Save
          </Badge>
        );
      default:
        return <Badge variant="secondary">Expense</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
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

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Monthly Income
          </span>
          <span className="text-2xl font-bold text-primary">
            {formatVND(monthlyIncome)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end"
          >
            <div>
              <Label>Type</Label>
              <Select
                value={formType}
                onValueChange={(v) => {
                  setFormType(v as any);
                  setFormCategory("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="investing">Investing</SelectItem>
                  <SelectItem value="saving">Saving</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isPortfolioType && (
              <>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label className="text-blue-600 flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" /> Link Asset
                  </Label>
                  <Select
                    value={formPortfolioId}
                    onValueChange={setFormPortfolioId}
                    required
                  >
                    <SelectTrigger className="border-blue-200 bg-blue-50/50">
                      <SelectValue placeholder="Select Asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        Select Asset
                      </SelectItem>
                      {data.portfolio?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.account})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-blue-600">Quantity</Label>
                  <Input
                    type="number"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="0"
                    className="border-blue-200"
                    required
                  />
                </div>
              </>
            )}

            <div className={isPortfolioType ? "" : "lg:col-span-1"}>
              {/* Changed Label based on Type */}
              <Label>{isPortfolioType ? "Total Cost" : "Amount"}</Label>
              <Input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0"
              />
              {/* Helper text showing Price/Unit */}
              {isPortfolioType && impliedPrice > 0 && (
                <span className="text-[10px] text-muted-foreground absolute -bottom-5 right-0 lg:static lg:block">
                  @{formatVND(impliedPrice)} / unit
                </span>
              )}
            </div>
            <div className={isPortfolioType ? "" : "lg:col-span-1"}>
              <Label>Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div
              className={isPortfolioType ? "lg:col-span-6" : "lg:col-span-1"}
            >
              <Label>Note</Label>
              <Input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button type="submit" className="gap-1 lg:col-span-6">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No transactions yet
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.date}</TableCell>
                    <TableCell>
                      <span className="text-sm block">
                        {getCategoryById(t.category_id)?.emoji}{" "}
                        {getCategoryById(t.category_id)?.name}
                      </span>
                      {getPortfolioName(t.portfolio_entry_id) && (
                        <span className="text-[10px] text-blue-600 flex items-center gap-0.5">
                          <LinkIcon className="h-2 w-2" />{" "}
                          {getPortfolioName(t.portfolio_entry_id)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getTypeBadge(t.type)}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${t.type === "income" ? "text-primary" : "text-foreground"}`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatVND(t.amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {t.quantity ? t.quantity : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.note}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTransaction(t.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
