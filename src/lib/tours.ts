import type { DriveStep } from "driver.js";

export type TourKey =
  | "dashboard"
  | "transactions"
  | "budget"
  | "categories"
  | "portfolio"
  | "fire"
  | "report";

export const TOURS: Record<TourKey, DriveStep[]> = {
  dashboard: [
    {
      element: '[data-tour="page-title"]',
      popover: {
        title: "Welcome to your Dashboard 👋",
        description:
          "This is the financial command center — a quick snapshot of your money, savings, and progress at a glance.",
      },
    },
    {
      element: '[data-tour="net-worth"]',
      popover: {
        title: "Your Net Worth",
        description:
          "Total assets minus liabilities. The single most important number to grow over time.",
      },
    },
    {
      element: '[data-tour="monthly-summary"]',
      popover: {
        title: "Monthly Summary",
        description:
          "Income, expenses and savings for the current month. Use this to spot trends fast.",
      },
    },
    {
      popover: {
        title: "You're all set!",
        description:
          "Use the sidebar to navigate. Each page has its own tour — click the help icon next to any title to replay it.",
      },
    },
  ],
  transactions: [
    {
      element: '[data-tour="page-title"]',
      popover: {
        title: "Transactions",
        description:
          "Log every income, expense, investment and sale here. Accurate data is the foundation of everything else.",
      },
    },
    {
      element: '[data-tour="tx-form"]',
      popover: {
        title: "Add a Transaction",
        description:
          "Fill in the date, type, category and amount. Hit Save to add it instantly to your records.",
      },
    },
    {
      element: '[data-tour="tx-month"]',
      popover: {
        title: "Switch Months",
        description:
          "Browse transactions month-by-month using these arrows.",
      },
    },
    {
      element: '[data-tour="tx-list"]',
      popover: {
        title: "Edit or Delete",
        description:
          "Click the pencil to edit a transaction, or the trash icon to remove it (with a confirmation).",
      },
    },
  ],
  budget: [
    {
      element: '[data-tour="page-title"]',
      popover: {
        title: "Budget Plan",
        description:
          "Set how much you plan to spend in each category for the month, then track actuals automatically.",
      },
    },
    {
      element: '[data-tour="budget-table"]',
      popover: {
        title: "Plan by Category",
        description:
          "Click any Planned Amount to edit. Type a number — it'll format with thousand separators — then press Enter to save.",
      },
    },
  ],
  categories: [
    {
      element: '[data-tour="page-title"]',
      popover: {
        title: "Categories",
        description:
          "Manage the categories used across transactions and budgets. Keep them tidy for cleaner reports.",
      },
    },
  ],
  portfolio: [
    {
      element: '[data-tour="page-title"]',
      popover: {
        title: "Portfolio Manager",
        description:
          "Track every investment — stocks, ETFs, crypto, gold, savings — in one place with live profit/loss.",
      },
    },
    {
      element: '[data-tour="portfolio-add"]',
      popover: {
        title: "Add an Entry",
        description:
          "Record holdings by name, tier, quantity, and purchase price. Update current price anytime to see gains.",
      },
    },
  ],
  fire: [
    {
      element: '[data-tour="page-title"]',
      popover: {
        title: "F.I.R.E Roadmap",
        description:
          "See exactly how much you need invested to retire, and how much to save each month to get there.",
      },
    },
    {
      element: '[data-tour="fire-target"]',
      popover: {
        title: "Your F.I. Target",
        description:
          "Calculated as 25× your annual expenses — the classic Rule of 25.",
      },
    },
    {
      element: '[data-tour="fire-savings"]',
      popover: {
        title: "Required Monthly Savings",
        description:
          "How much to invest each month to reach your target on schedule.",
      },
    },
  ],
  report: [
    {
      element: '[data-tour="page-title"]',
      popover: {
        title: "Financial Report",
        description:
          "Deep-dive analytics across periods. Use the filters to compare months and categories.",
      },
    },
  ],
};
