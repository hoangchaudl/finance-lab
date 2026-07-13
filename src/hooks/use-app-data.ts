import { useState, useEffect, useCallback } from "react";
import {
  AppData,
  Transaction,
  Category,
  PortfolioEntry,
  Subscription,
} from "@/lib/types";
import { initialData } from "@/lib/initial-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAppData() {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Load all data from Supabase
  const loadFromDB = useCallback(async () => {
    if (!user) {
      setData(initialData);
      setLoading(false);
      return;
    }

    try {
      const [
        profileRes,
        categoriesRes,
        transactionsRes,
        portfolioRes,
        assetsRes,
        goalsRes,
        subscriptionsRes,
        plansRes,
        allocationsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("categories").select("*").eq("user_id", user.id),
        supabase.from("transactions").select("*").eq("user_id", user.id),
        supabase.from("portfolio_entries").select("*").eq("user_id", user.id),
        supabase.from("assets").select("*").eq("user_id", user.id),
        supabase.from("goals").select("*").eq("user_id", user.id),
        supabase.from("subscriptions").select("*").eq("user_id", user.id),
        supabase.from("monthly_plans").select("*").eq("user_id", user.id),
        supabase
          .from("category_allocations")
          .select("*")
          .eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      const categories: Category[] = (categoriesRes.data || []).map(
        (c: any) => ({
          id: c.id,
          name: c.name,
          emoji: c.emoji,
          type: c.type,
        }),
      );

      const transactions: Transaction[] = (transactionsRes.data || []).map(
        (t: any) => ({
          id: t.id,
          date: t.date,
          amount: Number(t.amount),
          quantity: t.quantity ? Number(t.quantity) : undefined,
          type: t.type,
          category_id: t.category_id,
          note: t.note || undefined,
          portfolio_entry_id: t.portfolio_entry_id || undefined,
          realized_gain: t.realized_gain ? Number(t.realized_gain) : undefined,
          quality: (t.quality as Transaction["quality"]) || undefined,
        }),
      );

      const portfolio: PortfolioEntry[] = (portfolioRes.data || []).map(
        (p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          tier: p.tier || "Growth",
          account: p.account,
          quantity: Number(p.quantity),
          purchasePrice: Number(p.purchase_price),
          currentPrice: Number(p.current_price),
          notes: p.notes || undefined,
          updatedAt: p.updated_at,
        }),
      );

      const assets = (assetsRes.data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        value: Number(a.value),
      }));

      const goals = (goalsRes.data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        current: Number(g.current),
        target: Number(g.target),
      }));

      const subscriptions: Subscription[] = (subscriptionsRes.data || []).map(
        (s: any) => ({
          id: s.id,
          name: s.name,
          amount: Number(s.amount),
          due_day: s.due_day,
        }),
      );

      // Build monthlyPlans from flat rows
      const monthlyPlans: AppData["monthlyPlans"] = {};
      (plansRes.data || []).forEach((p: any) => {
        if (!monthlyPlans[p.month_key]) monthlyPlans[p.month_key] = {};
        monthlyPlans[p.month_key][p.category_id] = {
          planned: Number(p.planned),
        };
      });

      // Build categoryAllocations
      const categoryAllocations: Record<string, number> = {};
      (allocationsRes.data || []).forEach((a: any) => {
        categoryAllocations[a.category_id] = Number(a.percentage);
      });

      setDbError(null);
      setData({
        fireSettings: {
          monthlyExpenses: Number(
            profile?.monthly_expenses ??
              initialData.fireSettings.monthlyExpenses,
          ),
          inflationRate: Number(
            profile?.inflation_rate ?? initialData.fireSettings.inflationRate,
          ),
          returnRate: Number(
            profile?.return_rate ?? initialData.fireSettings.returnRate,
          ),
          currentAge: profile?.birth_year
            ? new Date().getFullYear() - Number(profile.birth_year)
            : initialData.fireSettings.currentAge,
          birthYear: profile?.birth_year ?? initialData.fireSettings.birthYear,
        },
        incomeAllocations: {
          essentials_pct: Number(
            profile?.essentials_pct ??
              initialData.incomeAllocations.essentials_pct,
          ),
          lifestyle_pct: Number(
            profile?.lifestyle_pct ??
              initialData.incomeAllocations.lifestyle_pct,
          ),
          savings_pct: Number(
            profile?.savings_pct ?? initialData.incomeAllocations.savings_pct,
          ),
        },
        categories,
        transactions,
        portfolio,
        assets,
        goals,
        subscriptions,
        monthlyPlans,
        categoryAllocations,
      });
    } catch (e) {
      console.error("Failed to load data from database:", e);
      setDbError("Failed to load your data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  // --- PORTFOLIO MATH (single source of truth for buy/sell effects) ---

  /** Apply (direction=1) or reverse (direction=-1) a transaction's effect on
   *  its linked portfolio entry. Reads the entry fresh from DB. */
  const adjustPortfolioForTx = useCallback(
    async (
      tx: Pick<Transaction, "type" | "amount" | "quantity" | "portfolio_entry_id">,
      direction: 1 | -1,
    ) => {
      if (!tx.portfolio_entry_id) return false;
      const isBuy = ["investing", "saving", "expense"].includes(tx.type);
      const isSell = tx.type === "sell";
      if (!isBuy && !isSell) return false;

      const txQty = Number(tx.quantity) || 0;
      if (txQty <= 0) return false; // no quantity → nothing to move

      const { data: entry } = await supabase
        .from("portfolio_entries")
        .select("id, quantity, purchase_price")
        .eq("id", tx.portfolio_entry_id)
        .maybeSingle();
      if (!entry) return false;

      const txAmount = Number(tx.amount) || 0;
      const curQty = Number(entry.quantity) || 0;
      const curAvg = Number(entry.purchase_price) || 0;

      let newQty = curQty;
      let newAvg = curAvg;
      if (isBuy) {
        newQty = curQty + direction * txQty;
        const newTotal = curQty * curAvg + direction * txAmount;
        newAvg = newQty > 0 ? Math.ceil(newTotal / newQty) : curAvg;
      } else {
        // sell: reduces on apply, restores on reverse; avg price unchanged
        newQty = curQty - direction * txQty;
      }

      await supabase
        .from("portfolio_entries")
        .update({
          quantity: newQty,
          purchase_price: newAvg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id);
      return true;
    },
    [],
  );

  /** Realized gain for a sell = sale amount − qty × current avg price. */
  const computeRealizedGain = useCallback(
    async (
      tx: Pick<Transaction, "amount" | "quantity" | "portfolio_entry_id">,
    ): Promise<number | null> => {
      if (!tx.portfolio_entry_id) return null;
      const { data: entry } = await supabase
        .from("portfolio_entries")
        .select("purchase_price")
        .eq("id", tx.portfolio_entry_id)
        .maybeSingle();
      if (!entry) return null;
      const qty = Number(tx.quantity) || 0;
      return Math.round(Number(tx.amount) - qty * Number(entry.purchase_price));
    },
    [],
  );

  // --- TRANSACTION ---
  const addTransaction = useCallback(
    async (t: Omit<Transaction, "id">) => {
      if (!user) return;

      // Validate sells and compute realized gain BEFORE inserting, so an
      // invalid sell can't leave an orphan transaction row behind
      let realizedGain: number | null = t.realized_gain ?? null;
      if (t.type === "sell" && t.portfolio_entry_id) {
        const { data: entry } = await supabase
          .from("portfolio_entries")
          .select("quantity, purchase_price")
          .eq("id", t.portfolio_entry_id)
          .maybeSingle();
        if (!entry) throw new Error("Portfolio entry not found");
        const sellQty = Number(t.quantity) || 0;
        if (sellQty <= 0) throw new Error("Sell quantity must be greater than 0.");
        if (sellQty > Number(entry.quantity)) {
          throw new Error(
            `Insufficient quantity. You only have ${entry.quantity} units.`,
          );
        }
        // Central computation — same result no matter which form logged it
        realizedGain = Math.round(
          Number(t.amount) - sellQty * Number(entry.purchase_price),
        );
      }

      const { data: inserted, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          date: t.date,
          amount: t.amount,
          quantity: t.quantity ?? null,
          type: t.type,
          category_id: t.category_id,
          note: t.note ?? null,
          portfolio_entry_id: t.portfolio_entry_id ?? null,
          realized_gain: realizedGain,
          quality: t.quality ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        throw new Error(error.message);
      }

      // Optimistically add the transaction to local state
      const newTx: Transaction = {
        id: inserted.id,
        date: inserted.date,
        amount: Number(inserted.amount),
        quantity: inserted.quantity ? Number(inserted.quantity) : undefined,
        type: inserted.type as Transaction["type"],
        category_id: inserted.category_id ?? "",
        note: inserted.note || undefined,
        portfolio_entry_id: inserted.portfolio_entry_id || undefined,
        realized_gain: inserted.realized_gain
          ? Number(inserted.realized_gain)
          : undefined,
        quality: ((inserted as any).quality as Transaction["quality"]) || undefined,
      };

      // Apply the buy/sell effect on the linked portfolio entry
      await adjustPortfolioForTx(t, 1);

      // Reload only if portfolio was affected, otherwise optimistic update
      if (t.portfolio_entry_id) {
        await loadFromDB();
      } else {
        setData((prev) => ({
          ...prev,
          transactions: [...prev.transactions, newTx],
        }));
      }
    },
    [user, adjustPortfolioForTx, loadFromDB],
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Omit<Transaction, "id">>) => {
      if (!user) return;

      const oldTx = data.transactions.find((t) => t.id === id);
      const merged = oldTx ? { ...oldTx, ...updates } : undefined;
      const touchesPortfolio = (
        tx?: Pick<Transaction, "type" | "portfolio_entry_id">,
      ) =>
        !!tx?.portfolio_entry_id &&
        ["investing", "saving", "expense", "sell"].includes(tx.type);

      const dbUpdate: any = {};
      if (updates.date !== undefined) dbUpdate.date = updates.date;
      if (updates.amount !== undefined) dbUpdate.amount = updates.amount;
      if (updates.quantity !== undefined)
        dbUpdate.quantity = updates.quantity ?? null;
      if (updates.type !== undefined) dbUpdate.type = updates.type;
      if (updates.category_id !== undefined)
        dbUpdate.category_id = updates.category_id;
      if (updates.note !== undefined) dbUpdate.note = updates.note ?? null;
      if (updates.portfolio_entry_id !== undefined)
        dbUpdate.portfolio_entry_id = updates.portfolio_entry_id ?? null;
      if (updates.quality !== undefined) dbUpdate.quality = updates.quality ?? null;

      // Keep the portfolio in sync: reverse the old effect, apply the new one
      let portfolioTouched = false;
      if (oldTx && merged && (touchesPortfolio(oldTx) || touchesPortfolio(merged))) {
        await adjustPortfolioForTx(oldTx, -1);
        if (merged.type === "sell" && merged.portfolio_entry_id) {
          const rg = await computeRealizedGain(merged);
          if (rg !== null) dbUpdate.realized_gain = rg;
        }
        await adjustPortfolioForTx(merged, 1);
        portfolioTouched = true;
      }

      const { error } = await supabase
        .from("transactions")
        .update(dbUpdate)
        .eq("id", id);
      if (error) throw new Error(error.message);

      if (portfolioTouched) {
        await loadFromDB();
      } else {
        // Optimistic update
        setData((prev) => ({
          ...prev,
          transactions: prev.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        }));
      }
    },
    [user, data.transactions, adjustPortfolioForTx, computeRealizedGain, loadFromDB],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user) return;

      const tx = data.transactions.find((t) => t.id === id);

      // Reverse the transaction's portfolio effect (buy or sell)
      if (tx) await adjustPortfolioForTx(tx, -1);

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);

      // Reload if portfolio affected, otherwise optimistic
      if (tx?.portfolio_entry_id) {
        await loadFromDB();
      } else {
        setData((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== id),
        }));
      }
    },
    [user, data.transactions, adjustPortfolioForTx, loadFromDB],
  );

  // --- BUDGET PLAN ---
  const updatePlan = useCallback(
    async (m: string, c: string, p: number) => {
      if (!user) return;
      await supabase
        .from("monthly_plans")
        .upsert(
          { user_id: user.id, month_key: m, category_id: c, planned: p },
          { onConflict: "user_id,month_key,category_id" },
        );
      await loadFromDB();
    },
    [user, loadFromDB],
  );

  // --- ASSETS ---
  const updateAsset = useCallback(
    async (id: string, v: number) => {
      await supabase.from("assets").update({ value: v }).eq("id", id);
      await loadFromDB();
    },
    [loadFromDB],
  );

  // --- GOALS ---
  const updateGoal = useCallback(
    async (id: string, c: number) => {
      await supabase.from("goals").update({ current: c }).eq("id", id);
      await loadFromDB();
    },
    [loadFromDB],
  );

  // --- ALLOCATIONS ---
  const updateAllocations = useCallback(
    async (a: AppData["incomeAllocations"]) => {
      if (!user) return;
      await supabase
        .from("profiles")
        .update({
          essentials_pct: a.essentials_pct,
          lifestyle_pct: a.lifestyle_pct,
          savings_pct: a.savings_pct,
        })
        .eq("id", user.id);
      await loadFromDB();
    },
    [user, loadFromDB],
  );

  // --- FIRE SETTINGS ---
  const updateFireSettings = useCallback(
    async (s: AppData["fireSettings"]) => {
      if (!user) return;
      const birthYear = s.currentAge
        ? new Date().getFullYear() - s.currentAge
        : s.birthYear;
      await supabase
        .from("profiles")
        .update({
          monthly_expenses: s.monthlyExpenses,
          inflation_rate: s.inflationRate,
          return_rate: s.returnRate,
          birth_year: birthYear,
        })
        .eq("id", user.id);
      await loadFromDB();
    },
    [user, loadFromDB],
  );

  // --- CATEGORIES ---
  const addCategory = useCallback(
    async (c: Omit<Category, "id">) => {
      if (!user) return;
      await supabase.from("categories").insert({
        user_id: user.id,
        name: c.name,
        emoji: c.emoji,
        type: c.type,
      });
      await loadFromDB();
    },
    [user, loadFromDB],
  );

  const updateCategory = useCallback(
    async (id: string, u: Partial<Omit<Category, "id">>) => {
      await supabase.from("categories").update(u).eq("id", id);
      await loadFromDB();
    },
    [loadFromDB],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await supabase
        .from("category_allocations")
        .delete()
        .eq("category_id", id);
      await supabase.from("categories").delete().eq("id", id);
      await loadFromDB();
    },
    [loadFromDB],
  );

  const updateCategoryAllocation = useCallback(
    async (id: string, p: number) => {
      if (!user) return;
      await supabase
        .from("category_allocations")
        .upsert(
          { user_id: user.id, category_id: id, percentage: p },
          { onConflict: "user_id,category_id" },
        );
      await loadFromDB();
    },
    [user, loadFromDB],
  );

  // --- SUBSCRIPTIONS ---
  const addSubscription = useCallback(
    async (s: Omit<Subscription, "id">) => {
      if (!user) return;
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        name: s.name,
        amount: s.amount,
        due_day: s.due_day,
      });
      await loadFromDB();
    },
    [user, loadFromDB],
  );

  const updateSubscription = useCallback(
    async (id: string, u: Partial<Omit<Subscription, "id">>) => {
      await supabase.from("subscriptions").update(u).eq("id", id);
      await loadFromDB();
    },
    [loadFromDB],
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      await supabase.from("subscriptions").delete().eq("id", id);
      await loadFromDB();
    },
    [loadFromDB],
  );

  // --- PORTFOLIO ---
  const addPortfolioEntry = useCallback(
    async (e: Omit<PortfolioEntry, "id">) => {
      if (!user) return;
      const { data: inserted, error } = await supabase
        .from("portfolio_entries")
        .insert({
          user_id: user.id,
          name: e.name,
          type: e.type,
          tier: e.tier,
          account: e.account,
          quantity: e.quantity,
          purchase_price: e.purchasePrice,
          current_price: e.currentPrice,
          notes: e.notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      await supabase.from("transactions").insert({
        user_id: user.id,
        date: new Date().toISOString().split("T")[0],
        amount: e.quantity * e.purchasePrice,
        type: "investing",
        portfolio_entry_id: inserted.id,
        note: "Initial position — " + e.name,
        quantity: e.quantity,
        category_id: null,
      });
      await loadFromDB();
    },
    [user, loadFromDB],
  );

  const updatePortfolioEntry = useCallback(
    async (id: string, u: Partial<Omit<PortfolioEntry, "id">>) => {
      const dbUpdate: any = {};
      if (u.name !== undefined) dbUpdate.name = u.name;
      if (u.type !== undefined) dbUpdate.type = u.type;
      if (u.tier !== undefined) dbUpdate.tier = u.tier;
      if (u.account !== undefined) dbUpdate.account = u.account;
      if (u.quantity !== undefined) dbUpdate.quantity = u.quantity;
      if (u.purchasePrice !== undefined)
        dbUpdate.purchase_price = u.purchasePrice;
      if (u.currentPrice !== undefined) dbUpdate.current_price = u.currentPrice;
      if (u.notes !== undefined) dbUpdate.notes = u.notes;

      dbUpdate.updated_at = new Date().toISOString();
      const { error } = await supabase.from("portfolio_entries").update(dbUpdate).eq("id", id);
      if (error) throw new Error(error.message);
      await loadFromDB();
    },
    [loadFromDB],
  );

  const deletePortfolioEntry = useCallback(
    async (id: string) => {
      await supabase.from("portfolio_entries").delete().eq("id", id);
      await loadFromDB();
    },
    [loadFromDB],
  );

  // --- COMPUTED VALUES ---
  const getActualForCategory = useCallback(
    (m: string, id: string) =>
      data.transactions
        .filter(
          (t) =>
            t.category_id === id &&
            t.date.startsWith(m) &&
            ["expense", "investing", "saving"].includes(t.type),
        )
        .reduce((s, t) => s + t.amount, 0),
    [data.transactions],
  );

  const getMonthTransactions = useCallback(
    (m: string) => data.transactions.filter((t) => t.date.startsWith(m)),
    [data.transactions],
  );

  const getTotalIncome = useCallback(
    (m: string) => {
      const regularIncome = data.transactions
        .filter((t) => t.date.startsWith(m) && t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const capitalGains = data.transactions
        .filter(
          (t) => t.date.startsWith(m) && t.type === "sell" && t.realized_gain,
        )
        .reduce((s, t) => s + (t.realized_gain || 0), 0);
      return regularIncome + capitalGains;
    },
    [data.transactions],
  );

  const getTotalExpenses = useCallback(
    (m: string) =>
      data.transactions
        .filter((t) => t.date.startsWith(m) && t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [data.transactions],
  );

  const getNetWorth = useCallback(() => {
    const a = data.assets.reduce((s, x) => s + x.value, 0);
    const p = (data.portfolio ?? []).reduce(
      (s, x) => s + (x.quantity || 0) * (x.currentPrice || 0),
      0,
    );
    return a + p;
  }, [data.assets, data.portfolio]);

  const getTotalSavings = useCallback(
    () =>
      (data.portfolio ?? [])
        .filter((e) => e.type === "Savings")
        .reduce((s, e) => s + (e.quantity || 0) * (e.currentPrice || 0), 0),
    [data.portfolio],
  );

  const getTotalInvestments = useCallback(
    () =>
      (data.portfolio ?? [])
        .filter((e) => e.type !== "Savings" && e.type !== "Other")
        .reduce((s, e) => s + (e.quantity || 0) * (e.currentPrice || 0), 0),
    [data.portfolio],
  );

  const getTotalInvestmentCost = useCallback(
    () =>
      (data.portfolio ?? [])
        .filter((e) => e.type !== "Savings" && e.type !== "Other")
        .reduce((s, e) => s + (e.quantity || 0) * (e.purchasePrice || 0), 0),
    [data.portfolio],
  );

  const resetData = useCallback(() => setData(initialData), []);
  const resetError = useCallback(() => setDbError(null), []);

  return {
    data,
    loading,
    dbError,
    resetError,
    loadFromDB,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updatePlan,
    updateAsset,
    updateGoal,
    updateAllocations,
    updateFireSettings,
    addCategory,
    updateCategory,
    deleteCategory,
    updateCategoryAllocation,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    addPortfolioEntry,
    updatePortfolioEntry,
    deletePortfolioEntry,
    getActualForCategory,
    getMonthTransactions,
    getTotalIncome,
    getTotalExpenses,
    getNetWorth,
    getTotalSavings,
    getTotalInvestments,
    getTotalInvestmentCost,
    resetData,
  };
}
