import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  formatVND,
  getMonthKey,
  getMonthLabel,
  formatDate,
} from "@/lib/format";
import { Transaction } from "@/lib/types";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  Plus,
  Link as LinkIcon,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";

export default function Transactions() {
  const {
    data,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getMonthTransactions,
    getActualForCategory,
    getTotalIncome,
  } = useApp();
  const { toast } = useToast();

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<
    "income" | "expense" | "investing" | "saving"
  >("expense");
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPortfolioId, setEditPortfolioId] = useState<string>("none");

  const transactions = getMonthTransactions(selectedMonth).sort((a, b) => {
    // First, sort by date descending (newer dates first)
    const dateComparison =
      new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    // If dates are the same, sort by ID descending (newer transactions first)
    return b.id.localeCompare(a.id);
  });

  // Format amount with dot thousands separator for display
  const formatAmountDisplay = (value: string): string => {
    if (!value) return "";
    const numStr = value.replace(/\D/g, "");
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Parse formatted amount back to number
  const parseFormattedAmount = (value: string): string => {
    return value.replace(/\./g, "");
  };

  const filteredCategories = data.categories.filter((c) => {
    if (formType === "income") return c.type === "income";
    if (formType === "investing") return c.type === "investment";
    if (formType === "saving") return c.type === "savings";
    return c.type === "essential" || c.type === "nonessential";
  });

  const editFilteredCategories = data.categories.filter((c) => {
    if (editType === "income") return c.type === "income";
    if (editType === "investing") return c.type === "investment";
    if (editType === "saving") return c.type === "savings";
    return c.type === "essential" || c.type === "nonessential";
  });

  // Merge categories and subscriptions into combobox options
  const getCategoryComboboxOptions = (
    categories: typeof filteredCategories,
  ): ComboboxOption[] => {
    const options: ComboboxOption[] = categories.map((c) => ({
      value: c.id,
      label: `${c.emoji} ${c.name}`,
    }));

    if (formType === "expense") {
      data.subscriptions?.forEach((sub) => {
        options.push({
          value: `sub_${sub.id}`,
          label: `📅 ${sub.name}`,
        });
      });
    }

    return options;
  };

  const getEditCategoryComboboxOptions = (
    categories: typeof editFilteredCategories,
  ): ComboboxOption[] => {
    const options: ComboboxOption[] = categories.map((c) => ({
      value: c.id,
      label: `${c.emoji} ${c.name}`,
    }));

    if (editType === "expense") {
      data.subscriptions?.forEach((sub) => {
        options.push({
          value: `sub_${sub.id}`,
          label: `📅 ${sub.name}`,
        });
      });
    }

    return options;
  };

  const isPortfolioType = formType === "investing" || formType === "saving";
  const isEditPortfolioType = editType === "investing" || editType === "saving";

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getMonthKey(d);
  });

  const impliedPrice =
    parseFloat(formAmount) && parseFloat(formQuantity)
      ? parseFloat(formAmount) / parseFloat(formQuantity)
      : 0;

  const handleAmountChange = (value: string) => {
    const numeric = parseFormattedAmount(value);
    setFormAmount(numeric);
  };

  const handleEditAmountChange = (value: string) => {
    const numeric = parseFormattedAmount(value);
    setEditAmount(numeric);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formAmount) return;

    addTransaction({
      date: formDate,
      amount: parseFloat(formAmount),
      quantity: isPortfolioType ? parseFloat(formQuantity) || 0 : undefined,
      type: formType,
      category_id: formCategory.startsWith("sub_") ? undefined : formCategory,
      note: formNote || undefined,
      portfolio_entry_id:
        isPortfolioType && formPortfolioId !== "none"
          ? formPortfolioId
          : undefined,
    });

    toast({
      title: "Success",
      description: "Transaction added successfully",
    });

    setFormAmount("");
    setFormQuantity("");
    setFormNote("");
    if (isPortfolioType) setFormPortfolioId("none");
  };

  const openEdit = (t: Transaction) => {
    setEditingTx(t);
    setEditType(t.type);
    setEditCategory(t.category_id);
    setEditAmount(String(t.amount));
    setEditDate(t.date);
    setEditNote(t.note || "");
    setEditQuantity(t.quantity ? String(t.quantity) : "");
    setEditPortfolioId(t.portfolio_entry_id || "none");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editCategory || !editAmount) return;

    updateTransaction(editingTx.id, {
      date: editDate,
      amount: parseFloat(editAmount),
      quantity: isEditPortfolioType ? parseFloat(editQuantity) || 0 : undefined,
      type: editType,
      category_id: editCategory.startsWith("sub_") ? undefined : editCategory,
      note: editNote || undefined,
      portfolio_entry_id:
        isEditPortfolioType && editPortfolioId !== "none"
          ? editPortfolioId
          : undefined,
    });

    toast({
      title: "Success",
      description: "Transaction updated successfully",
    });

    setEditingTx(null);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    toast({
      title: "Deleted",
      description: "Transaction deleted successfully",
    });
  };

  const getCategoryById = (id?: string) =>
    id ? data.categories.find((c) => c.id === id) : undefined;
  const getPortfolioName = (id?: string) =>
    data.portfolio?.find((p) => p.id === id)?.name;
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

  // Pagination logic
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
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
              <Combobox
                options={getCategoryComboboxOptions(filteredCategories)}
                value={formCategory}
                onValueChange={setFormCategory}
                placeholder="Select category..."
                searchPlaceholder="Search categories..."
              />
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
              <Label>{isPortfolioType ? "Total Cost" : "Amount"}</Label>
              <Input
                type="text"
                value={formatAmountDisplay(formAmount)}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
              />
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
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {transactions.length === 0
                      ? "No transactions yet"
                      : "No transactions on this page"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">
                      {formatDate(t.date)}
                    </TableCell>
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {transactions.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({transactions.length} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="min-w-10"
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingTx}
        onOpenChange={(open) => !open && setEditingTx(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                value={editType}
                onValueChange={(v) => {
                  setEditType(v as any);
                  setEditCategory("");
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
              <Combobox
                options={getEditCategoryComboboxOptions(editFilteredCategories)}
                value={editCategory}
                onValueChange={setEditCategory}
                placeholder="Select category..."
                searchPlaceholder="Search categories..."
              />
            </div>

            {isEditPortfolioType && (
              <>
                <div>
                  <Label className="text-blue-600 flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" /> Link Asset
                  </Label>
                  <Select
                    value={editPortfolioId}
                    onValueChange={setEditPortfolioId}
                  >
                    <SelectTrigger className="border-blue-200 bg-blue-50/50">
                      <SelectValue placeholder="Select Asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    placeholder="0"
                    className="border-blue-200"
                  />
                </div>
              </>
            )}

            <div>
              <Label>{isEditPortfolioType ? "Total Cost" : "Amount"}</Label>
              <Input
                type="text"
                value={formatAmountDisplay(editAmount)}
                onChange={(e) => handleEditAmountChange(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <Label>Note</Label>
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTx(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
