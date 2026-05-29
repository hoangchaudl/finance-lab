import { useState } from "react";
import { AlertTriangle, TrendingDown, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  budgetAlerts: string[];
  portfolioAlerts: string[];
  subscriptionAlerts: string[];
}

export default function CollapsibleAlerts({ budgetAlerts, portfolioAlerts, subscriptionAlerts }: Props) {
  const storageKey = "dashboard_alerts_collapsed";
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === "true");

  const allAlerts = [...budgetAlerts, ...portfolioAlerts, ...subscriptionAlerts];
  if (allAlerts.length === 0) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(storageKey, String(next));
  };

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors w-fit"
        aria-label="Show alerts"
      >
        <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
        {allAlerts.length} alert{allAlerts.length > 1 ? "s" : ""}
        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Alerts</span>
        <button
          onClick={toggle}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors text-xs"
          aria-label="Collapse alerts"
        >
          <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      {budgetAlerts.map((msg, i) => (
        <Alert key={`budget-${i}`} className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">{msg}</AlertDescription>
        </Alert>
      ))}
      {portfolioAlerts.map((msg, i) => (
        <Alert key={`portfolio-${i}`} className="border-red-200 bg-red-50">
          <TrendingDown className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">{msg}</AlertDescription>
        </Alert>
      ))}
      {subscriptionAlerts.map((msg, i) => (
        <Alert key={`sub-${i}`} className="border-blue-200 bg-blue-50">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">{msg}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
