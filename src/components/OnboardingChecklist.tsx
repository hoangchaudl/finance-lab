import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Circle, X, ArrowRight } from "lucide-react";
import { getMonthKey } from "@/lib/format";

const STORAGE_KEY = "onboarding_checklist_dismissed";

export default function OnboardingChecklist() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(STORAGE_KEY),
  );

  const monthKey = getMonthKey();

  const items = useMemo(() => {
    const hasIncome = data.transactions.some((t) => t.type === "income");
    const hasCategories = data.categories.length >= 3;
    const plan = data.monthlyPlans[monthKey] ?? {};
    const hasBudget = Object.values(plan).some((p) => (p?.planned ?? 0) > 0);
    const hasAsset = (data.portfolio?.length ?? 0) > 0;
    return [
      { label: "Set monthly income", done: hasIncome, path: "/transactions" },
      {
        label: "Create your first 3 categories",
        done: hasCategories,
        path: "/categories",
      },
      { label: "Set budget for this month", done: hasBudget, path: "/budget" },
      { label: "Add a portfolio asset", done: hasAsset, path: "/portfolio" },
    ];
  }, [data, monthKey]);

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  useEffect(() => {
    if (allDone && !localStorage.getItem(STORAGE_KEY + "_completed")) {
      localStorage.setItem(STORAGE_KEY + "_completed", "1");
    }
  }, [allDone]);

  if (dismissed || allDone) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <Card className="border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Get started with Finance Lab
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {doneCount} of {items.length} complete — finish setup to unlock
              your full dashboard.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <Progress
          value={(doneCount / items.length) * 100}
          className="h-1.5"
        />

        <ul className="divide-y divide-slate-100 -mx-2">
          {items.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => navigate(item.path)}
                className="flex items-center gap-3 w-full px-2 py-2.5 hover:bg-slate-50/80 rounded-lg text-left group"
              >
                {item.done ? (
                  <span className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check
                      className="h-3 w-3 text-white"
                      strokeWidth={2.5}
                    />
                  </span>
                ) : (
                  <Circle
                    className="h-5 w-5 text-slate-300 shrink-0"
                    strokeWidth={1.5}
                  />
                )}
                <span
                  className={`flex-1 text-sm ${
                    item.done
                      ? "text-slate-400 line-through"
                      : "text-slate-700"
                  }`}
                >
                  {item.label}
                </span>
                {!item.done && (
                  <ArrowRight
                    className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors"
                    strokeWidth={1.5}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
