import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND, getMonthKey } from "@/lib/format";
import { Category } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

const TYPE_OPTIONS: { value: Category["type"]; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "essential", label: "Essential Expense" },
  { value: "nonessential", label: "Non-Essential Expense" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
];

const TYPE_COLORS: Record<string, string> = {
  income: "bg-primary/10 text-primary border-primary/20",
  essential: "bg-destructive/10 text-destructive border-destructive/20",
  nonessential: "bg-warning/10 text-warning border-warning/20",
  savings: "bg-accent/10 text-accent-foreground border-accent/20",
  investment: "bg-secondary/10 text-secondary-foreground border-secondary/20",
};

function getTypeLabel(type: string) {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

interface EditingRow {
  id: string;
  name: string;
  emoji: string;
  type: Category["type"];
  allocation: number;
}

export default function CategoriesManager() {
  const { data, addCategory, updateCategory, deleteCategory, updateCategoryAllocation, getTotalIncome } = useApp();
  const monthKey = getMonthKey();
  const totalIncome = getTotalIncome(monthKey);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newType, setNewType] = useState<Category["type"]>("essential");

  const [editing, setEditing] = useState<EditingRow | null>(null);

  const allocations = data.categoryAllocations ?? {};
  const totalAlloc = Object.values(allocations).reduce((s, v) => s + v, 0);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCategory({ name: newName.trim(), emoji: newEmoji || "📁", type: newType });
    setNewName("");
    setNewEmoji("");
    setNewType("essential");
    setAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editing || !editing.name.trim()) return;
    updateCategory(editing.id, { name: editing.name, emoji: editing.emoji, type: editing.type });
    if (editing.allocation !== (allocations[editing.id] ?? 0)) {
      updateCategoryAllocation(editing.id, editing.allocation);
    }
    setEditing(null);
  };

  const startEdit = (cat: Category) => {
    setEditing({
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji,
      type: cat.type,
      allocation: allocations[cat.id] ?? 0,
    });
  };

  // Group categories by type for display
  const grouped = TYPE_OPTIONS.map((opt) => ({
    ...opt,
    categories: data.categories.filter((c) => c.type === opt.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories Manager</h1>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      {totalAlloc > 100 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          ⚠️ Total allocation is {totalAlloc.toFixed(1)}% — exceeds 100%. Please adjust your percentages.
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Total Allocation: {totalAlloc.toFixed(1)}% of income ({formatVND(totalIncome)})
            </CardTitle>
            {totalAlloc <= 100 && totalAlloc > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {(100 - totalAlloc).toFixed(1)}% unallocated
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Allocation %</TableHead>
                <TableHead className="text-right">Calculated Amount</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Add row */}
              {adding && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      placeholder="😀"
                      className="w-12 text-center"
                      maxLength={4}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Category name"
                      className="max-w-[200px]"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={newType} onValueChange={(v) => setNewType(v as Category["type"])}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={handleAdd}><Check className="h-4 w-4 text-primary" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {grouped.map((group) =>
                group.categories.length > 0 && (
                  <GroupRows
                    key={group.value}
                    group={group}
                    allocations={allocations}
                    totalIncome={totalIncome}
                    editing={editing}
                    onStartEdit={startEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditing(null)}
                    onEditChange={setEditing}
                    onDelete={deleteCategory}
                    onAllocChange={updateCategoryAllocation}
                  />
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface GroupRowsProps {
  group: { value: string; label: string; categories: Category[] };
  allocations: Record<string, number>;
  totalIncome: number;
  editing: EditingRow | null;
  onStartEdit: (c: Category) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (e: EditingRow) => void;
  onDelete: (id: string) => void;
  onAllocChange: (id: string, pct: number) => void;
}

function GroupRows({ group, allocations, totalIncome, editing, onStartEdit, onSaveEdit, onCancelEdit, onEditChange, onDelete, onAllocChange }: GroupRowsProps) {
  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell colSpan={6} className="py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          {group.label}
        </TableCell>
      </TableRow>
      {group.categories.map((cat) => {
        const isEditing = editing?.id === cat.id;
        const alloc = allocations[cat.id] ?? 0;
        const amount = (alloc / 100) * totalIncome;

        if (isEditing && editing) {
          return (
            <TableRow key={cat.id}>
              <TableCell>
                <Input
                  value={editing.emoji}
                  onChange={(e) => onEditChange({ ...editing, emoji: e.target.value })}
                  className="w-12 text-center"
                  maxLength={4}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={editing.name}
                  onChange={(e) => onEditChange({ ...editing, name: e.target.value })}
                  className="max-w-[200px]"
                />
              </TableCell>
              <TableCell>
                <Select value={editing.type} onValueChange={(v) => onEditChange({ ...editing, type: v as Category["type"] })}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  value={editing.allocation}
                  onChange={(e) => onEditChange({ ...editing, allocation: parseFloat(e.target.value) || 0 })}
                  className="w-20 ml-auto text-right"
                  min={0}
                  max={100}
                  step={0.5}
                />
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatVND((editing.allocation / 100) * totalIncome)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={onSaveEdit}><Check className="h-4 w-4 text-primary" /></Button>
                  <Button size="icon" variant="ghost" onClick={onCancelEdit}><X className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        }

        return (
          <TableRow key={cat.id}>
            <TableCell className="text-center text-lg">{cat.emoji}</TableCell>
            <TableCell className="font-medium">{cat.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className={TYPE_COLORS[cat.type] ?? ""}>
                {getTypeLabel(cat.type)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <InlineAlloc value={alloc} onChange={(v) => onAllocChange(cat.id, v)} />
            </TableCell>
            <TableCell className="text-right text-muted-foreground">{formatVND(amount)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => onStartEdit(cat)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(cat.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

function InlineAlloc({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);

  if (editing) {
    return (
      <Input
        type="number"
        value={temp}
        onChange={(e) => setTemp(parseFloat(e.target.value) || 0)}
        onBlur={() => { onChange(temp); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { onChange(temp); setEditing(false); } }}
        className="w-20 ml-auto text-right"
        autoFocus
        min={0}
        max={100}
        step={0.5}
      />
    );
  }

  return (
    <button
      onClick={() => { setTemp(value); setEditing(true); }}
      className="text-sm hover:underline cursor-pointer"
    >
      {value > 0 ? `${value}%` : <span className="text-muted-foreground">0%</span>}
    </button>
  );
}
