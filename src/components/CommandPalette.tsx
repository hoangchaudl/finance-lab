import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  PieChart,
  BarChart3,
  FolderCog,
  Plus,
  Flame,
} from "lucide-react";

interface CommandPaletteProps {
  onAddTransaction?: () => void;
}

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, shortcut: "" },
  { label: "Transactions", path: "/transactions", icon: ArrowRightLeft, shortcut: "" },
  { label: "Budget Plan", path: "/budget", icon: Wallet, shortcut: "" },
  { label: "Portfolio", path: "/portfolio", icon: PieChart, shortcut: "" },
  { label: "Reports", path: "/report", icon: BarChart3, shortcut: "" },
  { label: "Categories", path: "/categories", icon: FolderCog, shortcut: "" },
  { label: "FIRE Goals", path: "/fire", icon: Flame, shortcut: "" },
];

export default function CommandPalette({ onAddTransaction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "F1") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runCommand(() => onAddTransaction?.())}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.path}
                onSelect={() => runCommand(() => navigate(item.path))}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
