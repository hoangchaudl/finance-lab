import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatVND } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ open, onClose }: Props) {
  const { data, updateFireSettings } = useApp();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [targetAge, setTargetAge] = useState("45");
  const [returnRate, setReturnRate] = useState("10");
  const [submitting, setSubmitting] = useState(false);

  const displayAmount = (raw: string) =>
    raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    setter(e.target.value.replace(/\D/g, ""));
  };

  const parsedExpenses = parseFloat(monthlyExpenses) || 0;
  const fiNumber = parsedExpenses * 12 * 25;
  const today = new Date().toISOString().split("T")[0];

  const dismiss = () => {
    localStorage.setItem("onboarding_complete", "true");
    onClose();
  };

  const handleFinish = async (withSampleData: boolean) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const expenses = withSampleData ? 14_000_000 : parsedExpenses;
      const rate = parseFloat(returnRate) || 10;
      const age = parseInt(targetAge) || 45;
      const birthYear = new Date().getFullYear() - age;

      if (withSampleData) {
        // Insert all categories in one batch, get IDs back
        const { data: cats } = await supabase
          .from("categories")
          .insert([
            { user_id: user.id, name: "Food & Dining", emoji: "🍜", type: "essential" },
            { user_id: user.id, name: "Housing", emoji: "🏠", type: "essential" },
            { user_id: user.id, name: "Transport", emoji: "🚗", type: "essential" },
            { user_id: user.id, name: "Entertainment", emoji: "🎮", type: "nonessential" },
            { user_id: user.id, name: "Health", emoji: "💊", type: "essential" },
            { user_id: user.id, name: "Salary", emoji: "💼", type: "income" },
          ])
          .select();

        const catId = (name: string): string =>
          (cats as any[])?.find((c) => c.name === name)?.id ?? "";

        // Create portfolio entry, get ID back
        const { data: portEntry } = await supabase
          .from("portfolio_entries")
          .insert({
            user_id: user.id,
            name: "E1VFVN30",
            type: "ETF",
            tier: "Income",
            account: "SSI",
            quantity: 100,
            purchase_price: 32400,
            current_price: 32400,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        // Batch insert all transactions
        await supabase.from("transactions").insert([
          {
            user_id: user.id,
            date: today,
            amount: 20_000_000,
            type: "income",
            quality: "active",
            category_id: catId("Salary"),
            note: "Monthly salary",
          },
          {
            user_id: user.id,
            date: today,
            amount: 4_000_000,
            type: "expense",
            category_id: catId("Food & Dining"),
            note: "Monthly food expenses",
          },
          {
            user_id: user.id,
            date: today,
            amount: 6_200_000,
            type: "expense",
            category_id: catId("Housing"),
            note: "Rent",
          },
          {
            user_id: user.id,
            date: today,
            amount: 500_000,
            type: "expense",
            category_id: catId("Transport"),
            note: "Fuel",
          },
          {
            user_id: user.id,
            date: today,
            amount: 500_000,
            type: "expense",
            category_id: catId("Entertainment"),
            note: "Netflix, Spotify",
          },
          {
            user_id: user.id,
            date: today,
            amount: 1_500_000,
            type: "expense",
            category_id: catId("Health"),
            note: "Gym membership",
          },
          {
            user_id: user.id,
            date: today,
            amount: 500_000,
            type: "dividend",
            quality: "passive",
            category_id: null,
            portfolio_entry_id: (portEntry as any)?.id ?? null,
            note: "E1VFVN30 dividend",
          },
        ]);
      }

      // updateFireSettings calls loadFromDB internally — refreshes all app data
      await updateFireSettings({
        ...data.fireSettings,
        monthlyExpenses: expenses,
        returnRate: rate,
        currentAge: age,
        birthYear,
      });

      localStorage.setItem("onboarding_complete", "true");
      setStep(4);
    } catch (e) {
      console.error("Onboarding error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 4 is the success screen — progress bar stays fully filled at 3/3
  const progressStep = Math.min(step, 3);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      {/* [&>button]:hidden suppresses the default absolute close button rendered by DialogContent */}
      <DialogContent className="sm:max-w-md p-0 [&>button]:hidden">
        <div className="flex flex-col">
          {/* Progress bar — very top, no padding above */}
          <div className="flex gap-1.5 px-6 pt-5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= progressStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step indicator + X button — clearly below the bar */}
          <div className="flex items-center justify-between px-6 pt-2 pb-1">
            {step <= 3 ? (
              <span className="text-xs font-medium text-muted-foreground">
                Step {step}/3
              </span>
            ) : (
              <span />
            )}
            <button
              className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
              onClick={dismiss}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step content */}
          <div className="px-6 pb-6 pt-2">
            {step === 1 && (
              <>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">
                    Welcome to Finance Lab 👋
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Monthly Income</Label>
                    <Input
                      value={displayAmount(monthlyIncome)}
                      onChange={(e) => handleAmountChange(e, setMonthlyIncome)}
                      placeholder="22.000.000"
                    />
                  </div>
                  <div>
                    <Label>Monthly Expenses</Label>
                    <Input
                      value={displayAmount(monthlyExpenses)}
                      onChange={(e) =>
                        handleAmountChange(e, setMonthlyExpenses)
                      }
                      placeholder="14.000.000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The amount you spend on living expenses each month
                    </p>
                  </div>
                  <Button className="w-full" onClick={() => setStep(2)}>
                    Next →
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">
                    Financial Independence Goal 🎯
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Target Retirement Age</Label>
                    <Input
                      type="number"
                      value={targetAge}
                      onChange={(e) => setTargetAge(e.target.value)}
                      min={20}
                      max={80}
                    />
                  </div>
                  <div>
                    <Label>Expected Return Rate (%)</Label>
                    <Input
                      type="number"
                      value={returnRate}
                      onChange={(e) => setReturnRate(e.target.value)}
                      min={1}
                      max={30}
                      step={0.5}
                    />
                  </div>
                  {fiNumber > 0 && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                      <p className="text-xs text-muted-foreground">
                        FI Number (Rule of 25)
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatVND(fiNumber)}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(1)}
                    >
                      ← Back
                    </Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>
                      Next →
                    </Button>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">
                    Start with sample data? 📊
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Card
                    className="cursor-pointer border-2 hover:border-primary transition-colors"
                    onClick={() => !submitting && handleFinish(true)}
                  >
                    <CardContent className="pt-4 pb-4">
                      <p className="font-semibold">Use Sample Data</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Start with Minh's profile, 25 years old, Marketing.
                        Includes ETF E1VFVN30, salary, monthly expenses, and
                        dividend income.
                      </p>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer border-2 hover:border-primary transition-colors"
                    onClick={() => !submitting && handleFinish(false)}
                  >
                    <CardContent className="pt-4 pb-4">
                      <p className="font-semibold">Start from Scratch</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Save your settings and begin with an empty slate.
                      </p>
                    </CardContent>
                  </Card>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep(2)}
                    disabled={submitting}
                  >
                    ← Back
                  </Button>
                  {submitting && (
                    <p className="text-center text-sm text-muted-foreground animate-pulse">
                      Setting up your account...
                    </p>
                  )}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">
                    You're all set! 🎉
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Here's what you can do next:
                  </p>
                  <ul className="space-y-2.5 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      Go to <strong>Categories</strong> to set up your income,
                      expense, and investment categories — do this first before
                      logging transactions
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      Go to <strong>Transactions</strong> to log your daily
                      income and expenses
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      Go to <strong>Portfolio</strong> to track your investment
                      portfolio
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      Visit <strong>Dashboard</strong> to track your Crossover
                      Point
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      Go to <strong>Reports</strong> to view your financial
                      reports
                    </li>
                  </ul>
                  <Button className="w-full" onClick={onClose}>
                    Get Started →
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
