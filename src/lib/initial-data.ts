import { AppData } from "./types";

const now = new Date();
const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export const initialData: AppData = {
  incomeAllocations: {
    essentials_pct: 50,
    lifestyle_pct: 20,
    savings_pct: 30,
  },
  categories: [
    { id: "tien-nha", name: "Tiền nhà", emoji: "🏡", type: "essential" },
    { id: "an-uong", name: "Ăn uống", emoji: "🥘", type: "essential" },
    { id: "di-lai", name: "Đi lại", emoji: "🚗", type: "essential" },
    { id: "dien-nuoc", name: "Điện nước", emoji: "💡", type: "essential" },
    { id: "bao-hiem", name: "Bảo hiểm", emoji: "🛡️", type: "essential" },
    { id: "giai-tri", name: "Giải trí", emoji: "🎬", type: "nonessential" },
    { id: "mua-sam", name: "Mua sắm", emoji: "🛍️", type: "nonessential" },
    { id: "du-lich", name: "Du lịch", emoji: "✈️", type: "nonessential" },
    { id: "hoc-tap", name: "Học tập", emoji: "📚", type: "nonessential" },
    { id: "tien-luong", name: "Tiền lương", emoji: "💰", type: "income" },
    { id: "thu-nhap-khac", name: "Thu nhập khác", emoji: "💵", type: "income" },
    { id: "tiet-kiem", name: "Tiết kiệm", emoji: "🏦", type: "savings" },
    { id: "quy-du-phong", name: "Quỹ dự phòng", emoji: "🆘", type: "savings" },
    { id: "co-phieu", name: "Cổ phiếu", emoji: "📈", type: "investment" },
    { id: "crypto", name: "Tiền mã hóa", emoji: "💳", type: "investment" },
  ],
  transactions: [
    { id: "t1", date: `${monthKey}-01`, amount: 30000000, type: "income", category_id: "tien-luong", note: "Lương tháng" },
    { id: "t2", date: `${monthKey}-02`, amount: 5000000, type: "expense", category_id: "tien-nha" },
    { id: "t3", date: `${monthKey}-03`, amount: 3000000, type: "expense", category_id: "an-uong" },
    { id: "t4", date: `${monthKey}-05`, amount: 1500000, type: "expense", category_id: "di-lai" },
    { id: "t5", date: `${monthKey}-07`, amount: 500000, type: "expense", category_id: "dien-nuoc" },
    { id: "t6", date: `${monthKey}-10`, amount: 2000000, type: "expense", category_id: "giai-tri" },
    { id: "t7", date: `${monthKey}-12`, amount: 1000000, type: "expense", category_id: "mua-sam" },
    { id: "t8", date: `${monthKey}-15`, amount: 5000000, type: "expense", category_id: "tiet-kiem" },
    { id: "t9", date: `${monthKey}-15`, amount: 3000000, type: "expense", category_id: "co-phieu" },
  ],
  monthlyPlans: {
    [monthKey]: {
      "tien-nha": { planned: 5000000 },
      "an-uong": { planned: 4000000 },
      "di-lai": { planned: 2000000 },
      "dien-nuoc": { planned: 800000 },
      "bao-hiem": { planned: 1000000 },
      "giai-tri": { planned: 2000000 },
      "mua-sam": { planned: 1500000 },
      "du-lich": { planned: 3000000 },
      "hoc-tap": { planned: 500000 },
      "tiet-kiem": { planned: 5000000 },
      "quy-du-phong": { planned: 2000000 },
      "co-phieu": { planned: 3000000 },
      "crypto": { planned: 1000000 },
    },
  },
  assets: [
    { id: "a1", name: "Cổ phiếu", emoji: "📈", value: 150000000 },
    { id: "a2", name: "Tiền mã hóa", emoji: "💳", value: 50000000 },
    { id: "a3", name: "Vàng", emoji: "🏆", value: 80000000 },
    { id: "a4", name: "Tiền mặt", emoji: "💵", value: 20000000 },
  ],
  goals: [
    { id: "g1", name: "Du lịch", current: 15000000, target: 30000000 },
    { id: "g2", name: "Mua Oto", current: 120000000, target: 500000000 },
    { id: "g3", name: "Tiền đặt cọc nhà", current: 200000000, target: 1000000000 },
  ],
  subscriptions: [
    { id: "s1", name: "Netflix", amount: 260000, due_day: 15 },
    { id: "s2", name: "Canva", amount: 300000, due_day: 20 },
    { id: "s3", name: "Better Me", amount: 150000, due_day: 10 },
    { id: "s4", name: "Strava", amount: 120000, due_day: 25 },
  ],
  fireSettings: {
    monthlyExpenses: 20000000,
    inflationRate: 4,
    returnRate: 7,
  },
};
