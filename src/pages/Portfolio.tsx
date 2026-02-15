import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatVND } from "@/lib/format";
import { PortfolioEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

const TYPE_OPTIONS = ["Savings", "Stocks", "Crypto", "Gold", "ETF", "Other"] as const;

const TYPE_COLORS: Record<string, string> = {
  Savings: "bg-primary/10 text-primary border-primary/20",
  Stocks: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Crypto: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Gold: "bg-warning/10 text-warning border-warning/20",
  ETF: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  Other: "bg-secondary/10 text-secondary-foreground border-secondary/20",
};

interface EditState {
  id: string;
  name: string;
  type: string;
  value: number;
  contribution: number;
  notes: string;
}

export default function Portfolio() {
  const { data, addPortfolioEntry, updatePortfolioEntry, deletePortfolioEntry } = useApp();
  const entries = data.portfolio ?? [];
  const totalValue = entries.reduce((s, e) => s + e.value, 0);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [form, setForm] = useState({ name: "", type: "Savings", value: "", contribution: "", notes: "" });

  const handleAdd = () => {
    if (!form.name.trim() || !form.value) return;
    addPortfolioEntry({
      name: form.name.trim(),
      type: form.type,
      value: parseFloat(form.value) || 0,
      contribution: parseFloat(form.contribution) || 0,
      notes: form.notes || undefined,
    });
    setForm({ name: "", type: "Savings", value: "", contribution: "", notes: "" });
    setAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editing || !editing.name.trim()) return;
    updatePortfolioEntry(editing.id, {
      name: editing.name,
      type: editing.type,
      value: editing.value,
      contribution: editing.contribution,
      notes: editing.notes || undefined,
    });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portfolio Tracker</h1>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Add Entry
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Portfolio Value</span>
          <span className="text-2xl font-bold text-primary">{formatVND(totalValue)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Contribution</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <TableRow>
                  <TableCell>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Asset name" autoFocus />
                  </TableCell>
                  <TableCell>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" className="text-right" /></TableCell>
                  <TableCell><Input type="number" value={form.contribution} onChange={(e) => setForm({ ...form, contribution: e.target.value })} placeholder="0" className="text-right" /></TableCell>
                  <TableCell><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={handleAdd}><Check className="h-4 w-4 text-primary" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {entries.length === 0 && !adding ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No portfolio entries yet</TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  if (editing?.id === entry.id) {
                    return (
                      <TableRow key={entry.id}>
                        <TableCell><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></TableCell>
                        <TableCell>
                          <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" value={editing.value} onChange={(e) => setEditing({ ...editing, value: parseFloat(e.target.value) || 0 })} className="text-right" /></TableCell>
                        <TableCell><Input type="number" value={editing.contribution} onChange={(e) => setEditing({ ...editing, contribution: parseFloat(e.target.value) || 0 })} className="text-right" /></TableCell>
                        <TableCell><Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={handleSaveEdit}><Check className="h-4 w-4 text-primary" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell><Badge variant="outline" className={TYPE_COLORS[entry.type] ?? ""}>{entry.type}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatVND(entry.value)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{entry.contribution ? formatVND(entry.contribution) : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.notes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing({ id: entry.id, name: entry.name, type: entry.type, value: entry.value, contribution: entry.contribution ?? 0, notes: entry.notes ?? "" })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deletePortfolioEntry(entry.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
