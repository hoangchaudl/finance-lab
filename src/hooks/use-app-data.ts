import { useState, useEffect, useCallback } from "react";
import {
  AppData,
  Transaction,
  Category,
  PortfolioEntry,
  Subscription,
} from "@/lib/types";
import { initialData } from "@/lib/initial-data";
import { generateId } from "@/lib/format";

const STORAGE_KEY = "savedi-app-data";

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      // --- STRICT TYPE MIGRATION ---
      if (parsed.portfolio && parsed.portfolio.length > 0) {
        parsed.portfolio = parsed.portfolio.map((p: any) => ({
          ...p,
          // Force Number() to prevent string concatenation bugs
          quantity:
            typeof p.quantity === "number"
              ? p.quantity
              : parseFloat(p.quantity) || (p.quantity !== undefined ? 1 : 1),
          currentPrice:
            typeof p.currentPrice === "number"
              ? p.currentPrice
              : parseFloat(p.currentPrice) || parseFloat(p.value) || 0,
          purchasePrice:
            typeof p.purchasePrice === "number"
              ? p.purchasePrice
              : parseFloat(p.purchasePrice) || parseFloat(p.contribution) || 0,
          account: p.account || "Unassigned",
        }));
      }

      return {
        ...initialData,
        ...parsed,
        fireSettings: { ...initialData.fireSettings, ...parsed.fireSettings },
      };
    }
  } catch (e) {
    console.error("Data load error:", e);
  }
  return initialData;
}

export function useAppData() {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => fn(prev));
  }, []);

  const addTransaction = useCallback(
    (t: Omit<Transaction, "id">) => {
      update((d) => {
        let newPortfolio = d.portfolio;

        if (t.portfolio_entry_id && newPortfolio) {
          newPortfolio = newPortfolio.map((p) => {
            if (p.id === t.portfolio_entry_id) {
              if (["investing", "saving", "expense"].includes(t.type)) {
                // Ensure we are working with numbers
                const txQty = Number(t.quantity) || 0;
                const txAmount = Number(t.amount) || 0;

                const currentQty = Number(p.quantity) || 0;
                const currentAvg = Number(p.purchasePrice) || 0;

                const newQty = currentQty + txQty;

                const oldTotalCost = currentQty * currentAvg;
                const newTotalCost = oldTotalCost + txAmount;

                const newAvgPrice =
                  newQty > 0 ? Math.ceil(newTotalCost / newQty) : 0;

                return {
                  ...p,
                  quantity: newQty,
                  purchasePrice: newAvgPrice,
                };
              }
            }
            return p;
          });
        }

        return {
          ...d,
          transactions: [...d.transactions, { ...t, id: generateId() }],
          portfolio: newPortfolio,
        };
      });
    },
    [update],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      update((d) => {
        const tx = d.transactions.find((t) => t.id === id);
        let newPortfolio = d.portfolio;

        if (
          tx &&
          tx.portfolio_entry_id &&
          newPortfolio &&
          ["investing", "saving", "expense"].includes(tx.type)
        ) {
          newPortfolio = newPortfolio.map((p) => {
            if (p.id === tx.portfolio_entry_id) {
              const txQty = Number(tx.quantity) || 0;
              const txAmount = Number(tx.amount) || 0;

              const currentQty = Number(p.quantity) || 0;
              const currentAvg = Number(p.purchasePrice) || 0;

              const newQty = currentQty - txQty;

              const currentTotalCost = currentQty * currentAvg;
              const newTotalCost = currentTotalCost - txAmount;

              const newAvgPrice =
                newQty > 0 ? Math.ceil(newTotalCost / newQty) : currentAvg;

              return {
                ...p,
                quantity: newQty,
                purchasePrice: newAvgPrice,
              };
            }
            return p;
          });
        }

        return {
          ...d,
          transactions: d.transactions.filter((t) => t.id !== id),
          portfolio: newPortfolio,
        };
      });
    },
    [update],
  );

  // Standard updaters
  const updatePlan = useCallback(
    (m: string, c: string, p: number) =>
      update((d) => ({
        ...d,
        monthlyPlans: {
          ...d.monthlyPlans,
          [m]: { ...d.monthlyPlans[m], [c]: { planned: p } },
        },
      })),
    [update],
  );

  const updateAsset = useCallback(
    (id: string, v: number) =>
      update((d) => ({
        ...d,
        assets: d.assets.map((a) => (a.id === id ? { ...a, value: v } : a)),
      })),
    [update],
  );

  const updateGoal = useCallback(
    (id: string, c: number) =>
      update((d) => ({
        ...d,
        goals: d.goals.map((g) => (g.id === id ? { ...g, current: c } : g)),
      })),
    [update],
  );

  const updateAllocations = useCallback(
    (a: AppData["incomeAllocations"]) =>
      update((d) => ({ ...d, incomeAllocations: a })),
    [update],
  );

  const updateFireSettings = useCallback(
    (s: AppData["fireSettings"]) => update((d) => ({ ...d, fireSettings: s })),
    [update],
  );

  const addCategory = useCallback(
    (c: Omit<Category, "id">) =>
      update((d) => ({
        ...d,
        categories: [...d.categories, { ...c, id: generateId() }],
      })),
    [update],
  );

  const updateCategory = useCallback(
    (id: string, u: Partial<Omit<Category, "id">>) =>
      update((d) => ({
        ...d,
        categories: d.categories.map((c) => (c.id === id ? { ...c, ...u } : c)),
      })),
    [update],
  );

  const deleteCategory = useCallback(
    (id: string) =>
      update((d) => {
        const { [id]: _, ...r } = d.categoryAllocations ?? {};
        return {
          ...d,
          categories: d.categories.filter((c) => c.id !== id),
          categoryAllocations: r,
        };
      }),
    [update],
  );

  const updateCategoryAllocation = useCallback(
    (id: string, p: number) =>
      update((d) => ({
        ...d,
        categoryAllocations: { ...(d.categoryAllocations ?? {}), [id]: p },
      })),
    [update],
  );

  const addSubscription = useCallback(
    (s: Omit<Subscription, "id">) =>
      update((d) => ({
        ...d,
        subscriptions: [...d.subscriptions, { ...s, id: generateId() }],
      })),
    [update],
  );

  const updateSubscription = useCallback(
    (id: string, u: Partial<Omit<Subscription, "id">>) =>
      update((d) => ({
        ...d,
        subscriptions: d.subscriptions.map((s) =>
          s.id === id ? { ...s, ...u } : s,
        ),
      })),
    [update],
  );

  const deleteSubscription = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        subscriptions: d.subscriptions.filter((s) => s.id !== id),
      })),
    [update],
  );

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
    (m: string) =>
      data.transactions
        .filter((t) => t.date.startsWith(m) && t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
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

  const resetData = useCallback(() => setData(initialData), []);

  const addPortfolioEntry = useCallback(
    (e: Omit<PortfolioEntry, "id">) =>
      update((d) => ({
        ...d,
        portfolio: [...(d.portfolio ?? []), { ...e, id: generateId() }],
      })),
    [update],
  );

  const updatePortfolioEntry = useCallback(
    (id: string, u: Partial<Omit<PortfolioEntry, "id">>) =>
      update((d) => ({
        ...d,
        portfolio: (d.portfolio ?? []).map((e) =>
          e.id === id ? { ...e, ...u } : e,
        ),
      })),
    [update],
  );

  const deletePortfolioEntry = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        portfolio: (d.portfolio ?? []).filter((e) => e.id !== id),
      })),
    [update],
  );

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
        .filter((e) => e.type !== "Savings")
        .reduce((s, e) => s + (e.quantity || 0) * (e.currentPrice || 0), 0),
    [data.portfolio],
  );

  return {
    data,
    addTransaction,
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
    resetData,
  };
}
