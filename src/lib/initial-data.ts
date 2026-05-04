import { AppData } from "./types";

export const initialData: AppData = {
  fireSettings: {
    monthlyExpenses: 16500000,
    inflationRate: 4,
    returnRate: 10,
    currentAge: 24,
    birthYear: 2001,
  },
  portfolio: [
    // 1. Cash: Treated as 1 unit = 1 VND for simplicity, or 100m units @ 1 VND
    {
      id: "p1",
      name: "Tiền mặt",
      type: "Savings",
      account: "Bank",
      tier: "Defensive",
      quantity: 100000000,
      purchasePrice: 1,
      currentPrice: 1,
      notes: "Emergency Fund",
    },
    // 2. ETF: Assumed ~41M Value, ~12M Cost
    {
      id: "p2",
      name: "ETF (VN30)",
      type: "ETF",
      account: "TCInvest",
      tier: "Growth",
      quantity: 1000,
      purchasePrice: 12000, // 12M Cost
      currentPrice: 41698, // 41.6M Value
      notes: "DCA Monthly",
    },
    // 3. Crypto: Assumed 0.5 units
    {
      id: "p3",
      name: "Bitcoin/ETH",
      type: "Crypto",
      account: "Binance",
      tier: "Risk",
      quantity: 0.5,
      purchasePrice: 80000000, // 40M Cost (Estimate)
      currentPrice: 81000000, // 40.5M Value
    },
    // 4. Stocks: Assumed 1000 shares
    {
      id: "p4",
      name: "Cổ phiếu lẻ",
      type: "Stocks",
      account: "TCInvest",
      tier: "Growth",
      quantity: 1000,
      purchasePrice: 35000,
      currentPrice: 38989, // ~38.9M Value
    },
    // 5. Gold: 3 units (chỉ)
    {
      id: "p5",
      name: "Vàng nhẫn",
      type: "Gold",
      account: "Home Safe",
      tier: "Safe",
      quantity: 3,
      purchasePrice: 7000000, // 21M Cost (Estimate)
      currentPrice: 9780000, // 29.34M Value
      notes: "3 chỉ",
    },
  ],
  assets: [
    { id: "a1", name: "Laptop", emoji: "💻", value: 58000000 },
    { id: "a2", name: "Điện thoại", emoji: "📱", value: 15000000 },
    { id: "a3", name: "DZS", emoji: "🎬", value: 15000000 },
    { id: "a4", name: "Deposit House", emoji: "🏠", value: 12000000 },
    { id: "a5", name: "Xe", emoji: "🏍️", value: 10000000 },
    { id: "a6", name: "Đồng hồ", emoji: "⌚", value: 5000000 },
    { id: "a7", name: "Lending (Chị Trang)", emoji: "🔖", value: 1500000 },
  ],
  goals: [
    {
      id: "g1",
      name: "Financial Independence",
      current: 343027390,
      target: 4950000000,
    },
    { id: "g2", name: "Emergency Fund", current: 100000000, target: 99000000 },
  ],
  incomeAllocations: { essentials_pct: 50, lifestyle_pct: 30, savings_pct: 20 },
  categories: [
    { id: "c1", name: "Salary", emoji: "💰", type: "income" },
    { id: "c2", name: "Freelance", emoji: "👨‍💻", type: "income" },
    { id: "c3", name: "Food", emoji: "🍔", type: "essential" },
    { id: "c4", name: "Rent", emoji: "🏠", type: "essential" },
    { id: "c5", name: "Transport", emoji: "🛵", type: "essential" },
    { id: "c6", name: "Shopping", emoji: "🛍️", type: "nonessential" },
    { id: "c7", name: "Entertainment", emoji: "🎬", type: "nonessential" },
    { id: "c8", name: "Travel", emoji: "✈️", type: "nonessential" },
    { id: "c9", name: "Investments", emoji: "📈", type: "investment" },
    { id: "c10", name: "Savings", emoji: "🏦", type: "savings" },
  ],
  transactions: [],
  monthlyPlans: {},
  subscriptions: [],
};
