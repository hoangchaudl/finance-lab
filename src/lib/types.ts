export interface IncomeAllocations {
  essentials_pct: number;
  lifestyle_pct: number;
  savings_pct: number;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  type: "essential" | "nonessential" | "income" | "savings" | "investment";
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  // New: quantity allows calculating the new average price when buying assets
  quantity?: number;
  type: "income" | "expense" | "investing" | "saving" | "sell";
  category_id: string;
  note?: string;
  portfolio_entry_id?: string;
  realized_gain?: number;
}

export interface MonthlyPlan {
  [categoryId: string]: { planned: number };
}

export interface Asset {
  id: string;
  name: string;
  emoji: string;
  value: number;
}

export interface Goal {
  id: string;
  name: string;
  current: number;
  target: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  due_day: number;
}

export interface PortfolioEntry {
  id: string;
  name: string;
  type: string;
  account: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  notes?: string;
}

export interface AppData {
  incomeAllocations: IncomeAllocations;
  categories: Category[];
  transactions: Transaction[];
  monthlyPlans: { [monthKey: string]: MonthlyPlan };
  assets: Asset[];
  goals: Goal[];
  subscriptions: Subscription[];
  categoryAllocations?: { [categoryId: string]: number };
  portfolio?: PortfolioEntry[];
  fireSettings: {
    monthlyExpenses: number;
    inflationRate: number;
    returnRate: number;
    currentAge: number;
    birthYear: number;
  };
}
