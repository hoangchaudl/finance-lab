import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Category, Subscription } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface EditingSub {
  id: string;
  name: string;
  amount: number;
  due_day: number;
}

export default function CategoriesManager() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Data Management</h1>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriesTab() {
  const { data, addCategory, updateCategory, deleteCategory } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newType, setNewType] = useState<Category["type"]>("essential");
  const [editing, setEditing] = useState<EditingRow | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCategory({
      name: newName.trim(),
      emoji: newEmoji || "📁",
      type: newType,
    });
    setNewName("");
    setNewEmoji("");
    setNewType("essential");
    setAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editing || !editing.name.trim()) return;
    updateCategory(editing.id, {
      name: editing.name,
      emoji: editing.emoji,
      type: editing.type,
    });
    setEditing(null);
  };

  const grouped = TYPE_OPTIONS.map((opt) => ({
    ...opt,
    categories: data.categories.filter((c) => c.type === opt.value),
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)} disabled={adding} size="sm">
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
                    <Select
                      value={newType}
                      onValueChange={(v) => setNewType(v as Category["type"])}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={handleAdd}>
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setAdding(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {grouped.map(
                (group) =>
                  group.categories.length > 0 && (
                    <GroupRows
                      key={group.value}
                      group={group}
                      editing={editing}
                      onStartEdit={(cat) =>
                        setEditing({
                          id: cat.id,
                          name: cat.name,
                          emoji: cat.emoji,
                          type: cat.type,
                        })
                      }
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={() => setEditing(null)}
                      onEditChange={setEditing}
                      onDelete={deleteCategory}
                    />
                  ),
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

function GroupRows({
  group,
  editing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onDelete,
}: GroupRowsProps) {
  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell
          colSpan={4}
          className="py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
        >
          {group.label}
        </TableCell>
      </TableRow>
      {group.categories.map((cat) => {
        if (editing?.id === cat.id) {
          return (
            <TableRow key={cat.id}>
              <TableCell>
                <Input
                  value={editing.emoji}
                  onChange={(e) =>
                    onEditChange({ ...editing, emoji: e.target.value })
                  }
                  className="w-12 text-center"
                  maxLength={4}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    onEditChange({ ...editing, name: e.target.value })
                  }
                  className="max-w-[200px]"
                />
              </TableCell>
              <TableCell>
                <Select
                  value={editing.type}
                  onValueChange={(v) =>
                    onEditChange({ ...editing, type: v as Category["type"] })
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={onSaveEdit}>
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={onCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
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
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onStartEdit(cat)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(cat.id)}
                >
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

function SubscriptionsTab() {
  const { data, addSubscription, updateSubscription, deleteSubscription } =
    useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDay, setNewDay] = useState("");

  const [editing, setEditing] = useState<EditingSub | null>(null);

  const handleAdd = () => {
    if (!newName.trim() || !newAmount) return;
    const amount =
      parseFloat(newAmount.replace(/\./g, "").replace(",", ".")) || 0;
    const day = parseInt(newDay) || 1;

    addSubscription({
      name: newName.trim(),
      amount,
      due_day: Math.min(31, Math.max(1, day)),
    });

    setNewName("");
    setNewAmount("");
    setNewDay("");
    setAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editing || !editing.name.trim()) return;
    updateSubscription(editing.id, {
      name: editing.name,
      amount: editing.amount,
      due_day: Math.min(31, Math.max(1, editing.due_day)),
    });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)} disabled={adding} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Subscription
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Monthly Amount</TableHead>
                <TableHead>Due Day</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Netflix"
                      className="max-w-[200px]"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="Amount (VND)"
                      className="max-w-[150px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newDay}
                      type="number"
                      min={1}
                      max={31}
                      onChange={(e) => setNewDay(e.target.value)}
                      placeholder="1-31"
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={handleAdd}>
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setAdding(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {data.subscriptions.map((sub) => {
                if (editing?.id === sub.id) {
                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <Input
                          value={editing.name}
                          onChange={(e) =>
                            setEditing({ ...editing, name: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editing.amount}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          type="number"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editing.due_day}
                          type="number"
                          min={1}
                          max={31}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              due_day: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleSaveEdit}
                          >
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditing(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell>{formatVND(sub.amount)}</TableCell>
                    <TableCell>Day {sub.due_day}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(sub)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteSubscription(sub.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {data.subscriptions.length === 0 && !adding && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground h-24"
                  >
                    No active subscriptions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
