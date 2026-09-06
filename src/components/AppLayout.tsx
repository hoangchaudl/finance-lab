import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  PieChart,
  BarChart3,
  Flame,
  Menu,
  X,
  LogOut,
  Search,
  Keyboard,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import ShortcutsDialog, { useGlobalShortcutsDialog } from "./ShortcutsDialog";
import CommandPalette from "./CommandPalette";
import QuickAddTransaction, { QuickAddHandle } from "./QuickAddTransaction";

// Ordered to follow the money: see it → log it → plan it → grow it → free by it
const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ArrowRightLeft },
  { label: "Budget Plan", path: "/budget", icon: Wallet },
  { label: "Portfolio", path: "/portfolio", icon: PieChart },
  { label: "FIRE Goals", path: "/fire", icon: Flame },
  { label: "Reports", path: "/report", icon: BarChart3 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { signOut, user } = useAuth();
  const { open: shortcutsOpen, setOpen: setShortcutsOpen } = useGlobalShortcutsDialog();
  const quickAddRef = useRef<QuickAddHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // '/' focuses the sidebar search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const getInitials = () => {
    const metadata = user?.user_metadata || {};
    const fullName = metadata.full_name as string;
    if (!fullName) return user?.email?.charAt(0).toUpperCase() || "U";
    return fullName
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase();
  };

  const avatarUrl = (user?.user_metadata as any)?.avatar_url;
  const dob = (user?.user_metadata as any)?.date_of_birth as string | undefined;
  const formattedDob = dob
    ? new Date(dob).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b-2 border-outline bg-primary text-white">
        <div className="flex items-center gap-2">
          <Wallet className="h-7 w-7" strokeWidth={2} />
          <span className="font-display italic uppercase text-xl tracking-wide">Finance Lab</span>
        </div>
        <Button
          variant="bell"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar Navigation — Doraemon belly + pocket */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-primary text-white border-r-2 border-outline transform transition-transform duration-200 ease-in-out
        md:static md:translate-x-0 md:max-w-none flex flex-col h-full overflow-hidden
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* White semicircle "belly pocket" behind lower content */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bg-white border-2 border-outline"
          style={{
            bottom: "-40px",
            width: "150%",
            height: "260px",
            borderRadius: "50% 50% 0 0 / 60% 60% 0 0",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 p-4 pb-2 flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-bell border-2 border-outline flex items-center justify-center card-shadow-sm">
            <Wallet className="h-5 w-5 text-outline" strokeWidth={2} />
          </div>
          <span className="font-display italic uppercase text-2xl tracking-wide text-white">
            Finance Lab
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative z-10 p-4 pt-2 pb-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search… ( / )"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-full bg-white text-foreground text-sm"
            />
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <div key={item.path} className="relative">
                <Link
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-bold transition-all ${
                    isActive
                      ? "nav-bell"
                      : "text-white hover:bg-white/15 border-2 border-transparent"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer Section — inside the white pocket */}
        <div className="relative z-10 mt-2 mx-3 rounded-2xl border-2 border-outline bg-white card-shadow-sm p-2 space-y-1">
          <button
            onClick={() => setShortcutsOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-full text-sm font-bold text-foreground hover:bg-bell/20 transition-colors"
          >
            <Keyboard className="h-4 w-4" strokeWidth={2} />
            <span className="flex-1 text-left">Shortcuts</span>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border-2 border-outline bg-bell text-[10px] font-bold text-outline">⌘K</kbd>
              <kbd className="px-1.5 py-0.5 rounded border-2 border-outline bg-bell text-[10px] font-bold text-outline">?</kbd>
            </div>
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-full text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="relative z-10 mx-3 mb-3 mt-2">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-2xl border-2 border-outline bg-white card-shadow-sm hover:bg-bell/10 transition-colors"
          >
            <Avatar className="h-10 w-10 border-2 border-outline">
              <AvatarImage
                src={avatarUrl}
                alt={user?.user_metadata?.full_name as string}
              />
              <AvatarFallback className="text-sm font-bold bg-bell text-outline">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold truncate text-foreground">
                {(user?.user_metadata?.full_name as string) || user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {formattedDob && (
                <p className="text-xs text-muted-foreground truncate">{formattedDob}</p>
              )}
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 bg-background">
        <div className="w-full">{children}</div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <CommandPalette onAddTransaction={() => quickAddRef.current?.open()} />
      <QuickAddTransaction ref={quickAddRef} />
    </div>
  );
}
