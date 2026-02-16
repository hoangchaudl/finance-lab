import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  PieChart,
  BarChart3,
  FolderCog,
  Menu,
  X,
  LogOut,
  Search } from
"lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "@/contexts/AuthContext";
import financeLogo from "@/assets/finance-logo.png";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

const NAV_ITEMS = [
{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
{ label: "Reports", path: "/report", icon: BarChart3 },
{ label: "Budget Plan", path: "/budget", icon: Wallet },
{ label: "Transactions", path: "/transactions", icon: ArrowRightLeft },
{ label: "Portfolio", path: "/portfolio", icon: PieChart },




export default function Layout({ children }: {children: React.ReactNode;}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { signOut, user } = useAuth();

  const getInitials = () => {
    const metadata = user?.user_metadata || {};
    const fullName = metadata.full_name as string;
    if (!fullName) return user?.email?.charAt(0).toUpperCase() || "U";
    return fullName.
    split(" ").
    map((name) => name.charAt(0)).
    join("").
    toUpperCase();
  };

  const avatarUrl = (user?.user_metadata as any)?.avatar_url;

  const filteredNavItems = NAV_ITEMS.filter((item) =>
  item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white border-slate-200">
        <div className="flex items-center gap-2">
          <img src={financeLogo} alt="Finance Hub" className="h-7 w-7" />
          <span className="font-bold text-lg text-slate-900">Finance Lab</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>

          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 flex flex-col h-full
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>


        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" strokeWidth={1.5} />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm" />

          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <div key={item.path} className="relative">
                <Link
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive ?
                  "bg-blue-50 text-blue-600" :
                  "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`
                  }>

                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </div>);

          })}
        </nav>

        {/* Footer Section */}
        <div className="border-t border-slate-200 p-3 space-y-2">
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">

            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="mx-3 mb-3 mt-auto">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={avatarUrl}
                alt={user?.user_metadata?.full_name as string} />
              <AvatarFallback className="text-sm font-semibold bg-blue-100 text-blue-700">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium truncate text-slate-900">
                {user?.user_metadata?.full_name as string || user?.email}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen &&
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => setIsMobileMenuOpen(false)} />

      }
    </div>);

}
