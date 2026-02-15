import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Category } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
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
}

export default function CategoriesManager() {
  const { data, addCategory, updateCategory, deleteCategory } = useApp();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newType, setNewType] = useState<Category["type"]>("essential");
  const [editing, setEditing] = useState<EditingRow | null>(null);

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
    setEditing(null);
  };

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

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <TableRow>
                  <TableCell>
                    <Input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="😀" className="w-12 text-center" maxLength={4} />
                  </TableCell>
                  <TableCell>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Category name" className="max-w-[200px]" autoFocus />
                  </TableCell>
                  <TableCell>
                    <Select value={newType} onValueChange={(v) => setNewType(v as Category["type"])}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
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
                    editing={editing}
                    onStartEdit={(cat) => setEditing({ id: cat.id, name: cat.name, emoji: cat.emoji, type: cat.type })}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditing(null)}
                    onEditChange={setEditing}
                    onDelete={deleteCategory}
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
  editing: EditingRow | null;
  onStartEdit: (c: Category) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (e: EditingRow) => void;
  onDelete: (id: string) => void;
}

function GroupRows({ group, editing, onStartEdit, onSaveEdit, onCancelEdit, onEditChange, onDelete }: GroupRowsProps) {
  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell colSpan={4} className="py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          {group.label}
        </TableCell>
      </TableRow>
      {group.categories.map((cat) => {
        if (editing?.id === cat.id) {
          return (
            <TableRow key={cat.id}>
              <TableCell>
                <Input value={editing.emoji} onChange={(e) => onEditChange({ ...editing, emoji: e.target.value })} className="w-12 text-center" maxLength={4} />
              </TableCell>
              <TableCell>
                <Input value={editing.name} onChange={(e) => onEditChange({ ...editing, name: e.target.value })} className="max-w-[200px]" />
              </TableCell>
              <TableCell>
                <Select value={editing.type} onValueChange={(v) => onEditChange({ ...editing, type: v as Category["type"] })}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
