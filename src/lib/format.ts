export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `Tháng ${parseInt(month)}/${year}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
