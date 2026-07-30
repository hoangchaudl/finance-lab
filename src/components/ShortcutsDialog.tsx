import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const GROUPS: { page: string; rows: { keys: string[]; action: string }[] }[] = [
  {
    page: "Budget",
    rows: [
      {
        keys: ["Enter", "Tab"],
        action: "Save current cell → jump to next planned cell",
      },
      {
        keys: ["Shift", "Tab"],
        action: "Save current cell → jump to previous planned cell",
      },
    ],
  },
  {
    page: "Transactions",
    rows: [{ keys: ["N"], action: "Focus the Amount field to start adding" }],
  },
  {
    page: "Categories",
    rows: [{ keys: ["N"], action: "Open the add-category row" }],
  },
  {
    page: "Portfolio",
    rows: [
      { keys: ["N"], action: "Open the add-asset row" },
      { keys: ["↓", "↑"], action: "Navigate between asset groups" },
      { keys: ["Enter"], action: "Expand / collapse the focused group" },
    ],
  },
  {
    page: "Global",
    rows: [{ keys: ["?"], action: "Open this shortcuts panel" }],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded-md border-2 border-outline bg-muted text-[11px] font-mono text-foreground">
      {children}
    </kbd>
  );
}

export function useGlobalShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const tag = t?.tagName;
      const inInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t?.isContentEditable;
      if (inInput) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}

export default function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow. Press{" "}
            <Kbd>?</Kbd> anytime to open this panel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {GROUPS.map((g) => (
            <div key={g.page}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {g.page}
              </p>
              <ul className="space-y-1.5">
                {g.rows.map((r, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <span className="text-foreground flex-1">{r.action}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {r.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
