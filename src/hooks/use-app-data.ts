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
    if (raw) return JSON.parse(raw);
  } catch {}
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
      update((d) => ({
        ...d,
        transactions: [...d.transactions, { ...t, id: generateId() }],
      }));
    },
    [update],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      update((d) => ({
        ...d,
        transactions: d.transactions.filter((t) => t.id !== id),
      }));
    },
    [update],
  );

  const updatePlan = useCallback(
    (monthKey: string, categoryId: string, planned: number) => {
      update((d) => ({
        ...d,
        monthlyPlans: {
          ...d.monthlyPlans,
          [monthKey]: {
            ...d.monthlyPlans[monthKey],
            [categoryId]: { planned },
          },
        },
      }));
    },
    [update],
  );

  const updateAsset = useCallback(
    (id: string, value: number) => {
      update((d) => ({
        ...d,
        assets: d.assets.map((a) => (a.id === id ? { ...a, value } : a)),
      }));
    },
    [update],
  );

  const updateGoal = useCallback(
    (id: string, current: number) => {
      update((d) => ({
        ...d,
        goals: d.goals.map((g) => (g.id === id ? { ...g, current } : g)),
      }));
    },
    [update],
  );

  const updateAllocations = useCallback(
    (alloc: AppData["incomeAllocations"]) => {
      update((d) => ({ ...d, incomeAllocations: alloc }));
    },
    [update],
  );

  const updateFireSettings = useCallback(
    (settings: AppData["fireSettings"]) => {
      update((d) => ({ ...d, fireSettings: settings }));
    },
    [update],
  );

  const addCategory = useCallback(
    (cat: Omit<Category, "id">) => {
      update((d) => ({
        ...d,
        categories: [...d.categories, { ...cat, id: generateId() }],
      }));
    },
    [update],
  );

  const updateCategory = useCallback(
    (id: string, updates: Partial<Omit<Category, "id">>) => {
      update((d) => ({
        ...d,
        categories: d.categories.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      }));
    },
    [update],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      update((d) => {
        const { [id]: _, ...restAlloc } = d.categoryAllocations ?? {};
        return {
          ...d,
          categories: d.categories.filter((c) => c.id !== id),
          categoryAllocations: restAlloc,
        };
      });
    },
    [update],
  );

  const updateCategoryAllocation = useCallback(
    (categoryId: string, pct: number) => {
      update((d) => ({
        ...d,
        categoryAllocations: {
          ...(d.categoryAllocations ?? {}),
          [categoryId]: pct,
        },
      }));
    },
    [update],
  );

  // --- Subscription Functions ---
  const addSubscription = useCallback(
    (sub: Omit<Subscription, "id">) => {
      update((d) => ({
        ...d,
        subscriptions: [...d.subscriptions, { ...sub, id: generateId() }],
      }));
    },
    [update],
  );

  const updateSubscription = useCallback(
    (id: string, updates: Partial<Omit<Subscription, "id">>) => {
      update((d) => ({
        ...d,
        subscriptions: d.subscriptions.map((s) =>
          s.id === id ? { ...s, ...updates } : s,
        ),
      }));
    },
    [update],
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      update((d) => ({
        ...d,
        subscriptions: d.subscriptions.filter((s) => s.id !== id),
      }));
    },
    [update],
  );
  // -----------------------------

  const getActualForCategory = useCallback(
    (monthKey: string, categoryId: string) => {
      return data.transactions
        .filter(
          (t) =>
            t.category_id === categoryId &&
            t.date.startsWith(monthKey) &&
            t.type === "expense",
        )
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [data.transactions],
  );

  const getMonthTransactions = useCallback(
    (monthKey: string) => {
      return data.transactions.filter((t) => t.date.startsWith(monthKey));
    },
    [data.transactions],
  );

  const getTotalIncome = useCallback(
    (monthKey: string) => {
      return data.transactions
        .filter((t) => t.date.startsWith(monthKey) && t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [data.transactions],
  );

  const getTotalExpenses = useCallback(
    (monthKey: string) => {
      return data.transactions
        .filter((t) => t.date.startsWith(monthKey) && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [data.transactions],
  );

  const getNetWorth = useCallback(() => {
    return data.assets.reduce((sum, a) => sum + a.value, 0);
  }, [data.assets]);

  const resetData = useCallback(() => {
    setData(initialData);
  }, []);

  const addPortfolioEntry = useCallback(
    (entry: Omit<PortfolioEntry, "id">) => {
      update((d) => ({
        ...d,
        portfolio: [...(d.portfolio ?? []), { ...entry, id: generateId() }],
      }));
    },
    [update],
  );

  const updatePortfolioEntry = useCallback(
    (id: string, updates: Partial<Omit<PortfolioEntry, "id">>) => {
      update((d) => ({
        ...d,
        portfolio: (d.portfolio ?? []).map((e) =>
          e.id === id ? { ...e, ...updates } : e,
        ),
      }));
    },
    [update],
  );

  const deletePortfolioEntry = useCallback(
    (id: string) => {
      update((d) => ({
        ...d,
        portfolio: (d.portfolio ?? []).filter((e) => e.id !== id),
      }));
    },
    [update],
  );

  const getTotalSavings = useCallback(() => {
    return (data.portfolio ?? [])
      .filter((e) => e.type === "Savings")
      .reduce((s, e) => s + e.value, 0);
  }, [data.portfolio]);

  const getTotalInvestments = useCallback(() => {
    return (data.portfolio ?? [])
      .filter((e) => e.type !== "Savings")
      .reduce((s, e) => s + e.value, 0);
  }, [data.portfolio]);

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
    addSubscription, // Exported
    updateSubscription, // Exported
    deleteSubscription, // Exported
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
