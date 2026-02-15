import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey, getMonthLabel, generateId } from "@/lib/format";
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
import { Trash2, Plus } from "lucide-react";

export default function Transactions() {
  const {
    data,
    addTransaction,
    deleteTransaction,
    getMonthTransactions,
    getActualForCategory,
  } = useApp();

  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNote, setFormNote] = useState("");

  const transactions = getMonthTransactions(selectedMonth).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filteredCategories = data.categories.filter((c) =>
    formType === "income" ? c.type === "income" : c.type !== "income"
  );

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getMonthKey(d);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formAmount) return;
    addTransaction({
      date: formDate,
      amount: parseFloat(formAmount),
      type: formType,
      category_id: formCategory,
      note: formNote || undefined,
    });
    setFormAmount("");
    setFormNote("");
  };

  const getCategoryById = (id: string) =>
    data.categories.find((c) => c.id === id);

  const getEvaluation = (categoryId: string) => {
    const plan = data.monthlyPlans[selectedMonth]?.[categoryId]?.planned ?? 0;
    if (plan === 0) return null;
    const actual = getActualForCategory(selectedMonth, categoryId);
    if (actual > plan) return "over";
    if (actual < plan) return "under";
    return "equal";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Giao dịch</h1>
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

      {/* Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thêm giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div>
              <Label>Loại</Label>
              <Select value={formType} onValueChange={(v) => { setFormType(v as any); setFormCategory(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Thu nhập</SelectItem>
                  <SelectItem value="expense">Chi tiêu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Danh mục</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Số tiền</Label>
              <Input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Ngày</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Tùy chọn" />
            </div>
            <Button type="submit" className="gap-1">
              <Plus className="h-4 w-4" /> Thêm
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Đánh giá</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Chưa có giao dịch nào
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => {
                  const cat = getCategoryById(t.category_id);
                  const evaluation = t.type === "expense" ? getEvaluation(t.category_id) : null;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cat ? `${cat.emoji} ${cat.name}` : t.category_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.type === "income" ? "default" : "secondary"} className="text-xs">
                          {t.type === "income" ? "Thu" : "Chi"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                        {t.type === "income" ? "+" : "-"}{formatVND(t.amount)}
                      </TableCell>
                      <TableCell>
                        {evaluation === "over" && <span className="text-destructive">😰 Vượt KH</span>}
                        {evaluation === "under" && <span className="text-primary">😍 Tốt</span>}
                        {evaluation === "equal" && <span className="text-muted-foreground">— Đúng KH</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.note}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteTransaction(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
