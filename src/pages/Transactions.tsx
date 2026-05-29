import { useState, useMemo, useEffect, useRef } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Plus,
  Link as LinkIcon,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Download,
  Briefcase,
  Layers,
  Leaf,
  ArrowRightLeft,
  CheckSquare,
  Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import EmptyState from "@/components/EmptyState";
import MonthPicker from "@/components/MonthPicker";
import { useToast } from "@/hooks/use-toast";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import HintBanner from "@/components/HintBanner";
import PageTourButton from "@/components/PageTourButton";
import { usePageTour } from "@/hooks/use-page-tour";

type TxType = "income" | "expense" | "investing" | "saving" | "sell" | "dividend";

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
  const { startTour } = usePageTour("transactions");

  const amountInputRef = useRef<HTMLInputElement>(null);

  // N = focus amount field to add a new transaction
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        amountInputRef.current?.focus();
        amountInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);


  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [formType, setFormType] = useState<TxType>("expense");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [formNote, setFormNote] = useState("");
  const [formPortfolioId, setFormPortfolioId] = useState<string>("none");
  const [formQuantity, setFormQuantity] = useState("");
  const [formQuality, setFormQuality] = useState<"active" | "scalable" | "passive">("active");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Category search filter
  const [categorySearch, setCategorySearch] = useState("");

  // Reset to page 1 when category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categorySearch]);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<TxType>("expense");
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPortfolioId, setEditPortfolioId] = useState<string>("none");
  const [editQuality, setEditQuality] = useState<"active" | "scalable" | "passive">("active");

  const allTransactions = getMonthTransactions(selectedMonth).sort((a, b) => {
    const dateComparison =
      new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    return b.id.localeCompare(a.id);
  });

  const transactions = useMemo(() => {
    if (!categorySearch.trim()) return allTransactions;
    const query = categorySearch.toLowerCase().trim();
    return allTransactions.filter((t) => {
      const cat = getCategoryById(t.category_id);
      const catName = cat?.name?.toLowerCase() ?? "";
      const catEmoji = cat?.emoji?.toLowerCase() ?? "";
      return catName.includes(query) || catEmoji.includes(query);
    });
  }, [allTransactions, categorySearch]);

  const formatAmountDisplay = (value: string): string => {
    if (!value) return "";
    const numStr = value.replace(/\D/g, "");
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseFormattedAmount = (value: string): string => {
    return value.replace(/\./g, "");
  };

  const filteredCategories = data.categories.filter((c) => {
    if (formType === "income" || formType === "dividend") return c.type === "income";
    if (formType === "investing" || formType === "sell") return c.type === "investment";
    if (formType === "saving") return c.type === "savings";
    return c.type === "essential" || c.type === "nonessential";
  });

  const editFilteredCategories = data.categories.filter((c) => {
    if (editType === "income" || editType === "dividend") return c.type === "income";
    if (editType === "investing" || editType === "sell") return c.type === "investment";
    if (editType === "saving") return c.type === "savings";
    return c.type === "essential" || c.type === "nonessential";
  });

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
  const isSellType = formType === "sell";
  const isDividendType = formType === "dividend";
  const isAssetLinkedType = isPortfolioType || isSellType;

  const isEditPortfolioType = editType === "investing" || editType === "saving";
  const isEditSellType = editType === "sell";
  const isEditDividendType = editType === "dividend";
  const isEditAssetLinkedType = isEditPortfolioType || isEditSellType;

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getMonthKey(d);
  });

  const impliedPrice =
    parseFloat(formAmount) && parseFloat(formQuantity)
      ? parseFloat(formAmount) / parseFloat(formQuantity)
      : 0;

  // Sell profit preview
  const selectedSellAsset = isSellType && formPortfolioId !== "none"
    ? data.portfolio?.find((p) => p.id === formPortfolioId)
    : null;

  const sellProfitPreview = useMemo(() => {
    if (!isSellType || !selectedSellAsset || !formAmount || !formQuantity) return null;
    const saleAmount = parseFloat(formAmount);
    const qty = parseFloat(formQuantity);
    if (!saleAmount || !qty) return null;
    const costBasis = selectedSellAsset.purchasePrice * qty;
    const gain = saleAmount - costBasis;
    return { gain, costBasis, salePrice: saleAmount / qty };
  }, [isSellType, selectedSellAsset, formAmount, formQuantity]);

  const handleAmountChange = (value: string) => {
    const numeric = parseFormattedAmount(value);
    setFormAmount(numeric);
  };

  const handleEditAmountChange = (value: string) => {
    const numeric = parseFormattedAmount(value);
    setEditAmount(numeric);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formAmount || isSubmitting) return;

    let categoryId: string | null = formCategory;
    let note = formNote || undefined;
    if (formCategory.startsWith("sub_")) {
      const subId = formCategory.replace("sub_", "");
      const subscription = data.subscriptions?.find((s) => s.id === subId);
      categoryId = null;
      note = subscription ? `📅 ${subscription.name}${formNote ? ` – ${formNote}` : ""}` : note;
    }

    setIsSubmitting(true);
    try {
      // For sell type, calculate realized_gain
      let realized_gain: number | undefined;
      if (isSellType && selectedSellAsset) {
        const qty = parseFloat(formQuantity) || 0;
        const saleAmount = parseFloat(formAmount);
        const costBasis = selectedSellAsset.purchasePrice * qty;
        realized_gain = saleAmount - costBasis;
      }

      await addTransaction({
        date: formDate,
        amount: parseFloat(formAmount),
        quantity: isAssetLinkedType ? parseFloat(formQuantity) || 0 : undefined,
        type: formType,
        category_id: categoryId as string,
        note,
        portfolio_entry_id:
          (isAssetLinkedType || isDividendType) && formPortfolioId !== "none"
            ? formPortfolioId
            : undefined,
        realized_gain,
        quality: formType === "income" ? formQuality : undefined,
      });

      toast({
        title: "Success",
        description: isSellType
          ? `Asset sold! Realized gain: ${formatVND(realized_gain || 0)}`
          : "Transaction added successfully",
      });

      setFormAmount("");
      setFormQuantity("");
      setFormNote("");
      setFormCategory("");
      if (isAssetLinkedType || isDividendType) setFormPortfolioId("none");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to add transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (t: Transaction) => {
    setEditingTx(t);
    setEditType(t.type as TxType);
    setEditCategory(t.category_id || "");
    setEditAmount(String(t.amount));
    setEditDate(t.date);
    setEditNote(t.note || "");
    setEditQuantity(t.quantity ? String(t.quantity) : "");
    setEditPortfolioId(t.portfolio_entry_id || "none");
    setEditQuality(t.quality || "active");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editCategory || !editAmount || isSubmitting) return;

    let categoryId: string | null = editCategory;
    let note = editNote || undefined;
    if (editCategory.startsWith("sub_")) {
      const subId = editCategory.replace("sub_", "");
      const subscription = data.subscriptions?.find((s) => s.id === subId);
      categoryId = null;
      note = subscription ? `📅 ${subscription.name}${editNote ? ` – ${editNote}` : ""}` : note;
    }

    setIsSubmitting(true);
    try {
      await updateTransaction(editingTx.id, {
        date: editDate,
        amount: parseFloat(editAmount),
        quantity: isEditAssetLinkedType ? parseFloat(editQuantity) || 0 : undefined,
        type: editType,
        category_id: categoryId as string,
        note,
        portfolio_entry_id:
          (isEditAssetLinkedType || isEditDividendType) && editPortfolioId !== "none"
            ? editPortfolioId
            : undefined,
        quality: editType === "income" ? editQuality : undefined,
      });

      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });

      setEditingTx(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      await deleteTransaction(deletingId);
      toast({
        title: "Deleted",
        description: "Transaction deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete transaction",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setIsSubmitting(false);
    }
  };

  const getCategoryById = (id?: string) => {
    if (!id) return undefined;
    if (id.startsWith("sub_")) {
      const subId = id.replace("sub_", "");
      const subscription = data.subscriptions?.find((s) => s.id === subId);
      if (subscription) {
        return { emoji: "📅", name: subscription.name };
      }
    }
    return data.categories.find((c) => c.id === id);
  };
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
      case "sell":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            Sell
          </Badge>
        );
      case "dividend":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            Dividend
          </Badge>
        );
      default:
        return <Badge variant="secondary">Expense</Badge>;
    }
  };

  const getQualityBadge = (quality?: string) => {
    switch (quality) {
      case "active":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs inline-flex items-center gap-1">
            <Briefcase className="h-3 w-3" strokeWidth={1.5} /> Active
          </Badge>
        );
      case "scalable":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs inline-flex items-center gap-1">
            <Layers className="h-3 w-3" strokeWidth={1.5} /> Scalable
          </Badge>
        );
      case "passive":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs inline-flex items-center gap-1">
            <Leaf className="h-3 w-3" strokeWidth={1.5} /> Passive
          </Badge>
        );
      default:
        return null;
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTransactions.length && paginatedTransactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTransactions.map((t) => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => deleteTransaction(id)));
      toast({ title: `Deleted ${selectedIds.size} transaction${selectedIds.size !== 1 ? "s" : ""}` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Error", description: "Some deletions failed", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Type", "Category", "Amount", "Quality", "Note", "Portfolio Asset"];
    const rows = transactions.map((t) => {
      const cat = getCategoryById(t.category_id);
      const category = cat ? `${cat.emoji} ${cat.name}` : "";
      const portfolioAsset = getPortfolioName(t.portfolio_entry_id) ?? "";
      return [
        t.date,
        t.type,
        category,
        t.amount,
        t.quality ?? "",
        t.note ?? "",
        portfolioAsset,
      ];
    });

    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-lab-transactions-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <HintBanner
        pageKey="transactions"
        message="💡 Log every income, expense, investment, and dividend here. Use Categories to organize your spending. The more you log, the better your reports become."
      />

      <div className="flex items-center justify-between">
        <h1 data-tour="page-title" className="text-2xl font-bold flex items-center gap-1">
          Transactions
          <PageTourButton onClick={startTour} />
        </h1>
        <div data-tour="tx-month" className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search category..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="pl-9 w-44"
            />
          </div>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={transactions.length === 0}>
            <Download className="h-4 w-4 mr-1" strokeWidth={1.5} /> Export CSV
          </Button>
        </div>
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

      <Card data-tour="tx-form">
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
                  setFormType(v as TxType);
                  setFormCategory("");
                  setFormPortfolioId("none");
                  setFormQuantity("");
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
                  <SelectItem value="sell">Sell Asset</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formType === "income" && (
              <div>
                <Label>Quality</Label>
                <Select
                  value={formQuality}
                  onValueChange={(v) => setFormQuality(v as typeof formQuality)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-red-500" strokeWidth={1.5} />
                        Active (salary, freelance)
                      </span>
                    </SelectItem>
                    <SelectItem value="scalable">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-yellow-500" strokeWidth={1.5} />
                        Scalable (courses, SaaS)
                      </span>
                    </SelectItem>
                    <SelectItem value="passive">
                      <span className="inline-flex items-center gap-1.5">
                        <Leaf className="h-3.5 w-3.5 text-green-500" strokeWidth={1.5} />
                        Passive (dividends, interest)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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

            {isAssetLinkedType && (
              <>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label className={`flex items-center gap-1 ${isSellType ? "text-amber-600" : "text-blue-600"}`}>
                    <LinkIcon className="h-3 w-3" strokeWidth={1.5} /> {isSellType ? "Sell Asset" : "Link Asset"}
                  </Label>
                  <Select
                    value={formPortfolioId}
                    onValueChange={setFormPortfolioId}
                    required
                  >
                    <SelectTrigger className={isSellType ? "border-amber-200 bg-amber-50/50" : "border-blue-200 bg-blue-50/50"}>
                      <SelectValue placeholder="Select Asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        Select Asset
                      </SelectItem>
                      {data.portfolio?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.account}) {isSellType ? `- Qty: ${p.quantity}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSellType && selectedSellAsset && (
                    <span className="text-[10px] text-muted-foreground">
                      Avg Cost: {formatVND(selectedSellAsset.purchasePrice)} · Qty: {selectedSellAsset.quantity}
                    </span>
                  )}
                </div>
                <div>
                  <Label className={isSellType ? "text-amber-600" : "text-blue-600"}>Quantity</Label>
                  <Input
                    type="number"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="0"
                    className={isSellType ? "border-amber-200" : "border-blue-200"}
                    required
                    max={isSellType && selectedSellAsset ? selectedSellAsset.quantity : undefined}
                  />
                </div>
              </>
            )}

            {isDividendType && (
              <div className="sm:col-span-2 lg:col-span-1">
                <Label className="flex items-center gap-1 text-emerald-600">
                  <LinkIcon className="h-3 w-3" strokeWidth={1.5} /> Source Holding
                </Label>
                <Select value={formPortfolioId} onValueChange={setFormPortfolioId}>
                  <SelectTrigger className="border-emerald-200 bg-emerald-50/50">
                    <SelectValue placeholder="Select Asset (optional)" />
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
            )}

            <div className={isAssetLinkedType ? "" : "lg:col-span-1"}>
              <Label>{isSellType ? "Sale Amount" : isPortfolioType ? "Total Cost" : "Amount"}</Label>
              <Input
                ref={amountInputRef}
                type="text"
                value={formatAmountDisplay(formAmount)}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
              />
              {isPortfolioType && impliedPrice > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  @{formatVND(impliedPrice)} / unit
                </span>
              )}
            </div>
            <div className={isAssetLinkedType ? "" : "lg:col-span-1"}>
              <Label>Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div
              className={isAssetLinkedType ? "lg:col-span-6" : "lg:col-span-1"}
            >
              <Label>Note</Label>
              <Input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Optional"
              />
            </div>

            {/* Sell Profit Preview */}
            {isSellType && sellProfitPreview && (
              <div className="lg:col-span-6">
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
                  sellProfitPreview.gain >= 0
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {sellProfitPreview.gain >= 0 ? (
                    <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <TrendingDown className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  <span>
                    Est. {sellProfitPreview.gain >= 0 ? "Profit" : "Loss"}:{" "}
                    <strong>{formatVND(Math.abs(sellProfitPreview.gain))}</strong>
                    {" "}(Sale @ {formatVND(sellProfitPreview.salePrice)} vs Avg Cost @ {formatVND(selectedSellAsset!.purchasePrice)})
                  </span>
                </div>
              </div>
            )}

            <Button type="submit" className="gap-1 lg:col-span-6" disabled={isSubmitting}>
              <Plus className="h-4 w-4" strokeWidth={1.5} /> {isSubmitting ? "Processing..." : isSellType ? "Sell" : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.transactions.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No transactions yet"
          description="Add your first income, expense, or investment to start tracking — your reports and dashboard will fill in automatically."
          actionLabel="Add your first transaction"
          onAction={() => {
            amountInputRef.current?.focus();
            amountInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      ) : (
      <Card data-tour="tx-list">
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
              {bulkDeleting ? "Deleting..." : "Delete selected"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
              Clear
            </Button>
          </div>
        )}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={paginatedTransactions.length > 0 && selectedIds.size === paginatedTransactions.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
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
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    {transactions.length === 0
                      ? "No transactions yet"
                      : "No transactions on this page"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((t) => (
                  <TableRow key={t.id} className={selectedIds.has(t.id) ? "bg-primary/5" : undefined}>
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selectedIds.has(t.id)}
                        onCheckedChange={() => toggleSelect(t.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
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
                          <LinkIcon className="h-2 w-2" strokeWidth={1.5} />{" "}
                          {getPortfolioName(t.portfolio_entry_id)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getTypeBadge(t.type)}
                        {t.type === "income" && getQualityBadge(t.quality)}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        t.type === "income" || t.type === "dividend" ? "text-primary" :
                        t.type === "sell" ? "text-amber-600" : "text-foreground"
                      }`}
                    >
                      {t.type === "income" || t.type === "sell" || t.type === "dividend" ? "+" : "-"}
                      {formatVND(t.amount)}
                      {t.type === "sell" && t.realized_gain !== undefined && (
                        <span className={`block text-[10px] ${t.realized_gain >= 0 ? "text-success" : "text-red-600"}`}>
                          {t.realized_gain >= 0 ? "+" : ""}{formatVND(t.realized_gain)} gain
                        </span>
                      )}
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
                          <Pencil className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" strokeWidth={1.5} />
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
      )}

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
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
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
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
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
                  setEditType(v as TxType);
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
                  <SelectItem value="sell">Sell Asset</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editType === "income" && (
              <div>
                <Label>Quality</Label>
                <Select
                  value={editQuality}
                  onValueChange={(v) => setEditQuality(v as typeof editQuality)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-red-500" strokeWidth={1.5} />
                        Active (salary, freelance)
                      </span>
                    </SelectItem>
                    <SelectItem value="scalable">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-yellow-500" strokeWidth={1.5} />
                        Scalable (courses, SaaS)
                      </span>
                    </SelectItem>
                    <SelectItem value="passive">
                      <span className="inline-flex items-center gap-1.5">
                        <Leaf className="h-3.5 w-3.5 text-green-500" strokeWidth={1.5} />
                        Passive (dividends, interest)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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

            {isEditAssetLinkedType && (
              <>
                <div>
                  <Label className={`flex items-center gap-1 ${isEditSellType ? "text-amber-600" : "text-blue-600"}`}>
                    <LinkIcon className="h-3 w-3" strokeWidth={1.5} /> {isEditSellType ? "Sell Asset" : "Link Asset"}
                  </Label>
                  <Select
                    value={editPortfolioId}
                    onValueChange={setEditPortfolioId}
                  >
                    <SelectTrigger className={isEditSellType ? "border-amber-200 bg-amber-50/50" : "border-blue-200 bg-blue-50/50"}>
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
                  <Label className={isEditSellType ? "text-amber-600" : "text-blue-600"}>Quantity</Label>
                  <Input
                    type="number"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    placeholder="0"
                    className={isEditSellType ? "border-amber-200" : "border-blue-200"}
                  />
                </div>
              </>
            )}

            {isEditDividendType && (
              <div>
                <Label className="flex items-center gap-1 text-emerald-600">
                  <LinkIcon className="h-3 w-3" strokeWidth={1.5} /> Source Holding
                </Label>
                <Select value={editPortfolioId} onValueChange={setEditPortfolioId}>
                  <SelectTrigger className="border-emerald-200 bg-emerald-50/50">
                    <SelectValue placeholder="Select Asset (optional)" />
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
            )}

            <div>
              <Label>{isEditSellType ? "Sale Amount" : isEditPortfolioType ? "Total Cost" : "Amount"}</Label>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
