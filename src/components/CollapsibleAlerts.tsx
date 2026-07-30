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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-outline bg-warning/15 text-warning-foreground text-xs font-bold hover:bg-warning/25 transition-colors w-fit"
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
        <span className="text-xs font-medium text-muted-foreground">Alerts</span>
        <button
          onClick={toggle}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-xs"
          aria-label="Collapse alerts"
        >
          <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      {budgetAlerts.map((msg, i) => (
        <Alert key={`budget-${i}`} variant="warning">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
          <AlertDescription className="text-sm">{msg}</AlertDescription>
        </Alert>
      ))}
      {portfolioAlerts.map((msg, i) => (
        <Alert key={`portfolio-${i}`} variant="destructive">
          <TrendingDown className="h-4 w-4" strokeWidth={1.5} />
          <AlertDescription className="text-sm">{msg}</AlertDescription>
        </Alert>
      ))}
      {subscriptionAlerts.map((msg, i) => (
        <Alert key={`sub-${i}`} variant="default">
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          <AlertDescription className="text-sm">{msg}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
