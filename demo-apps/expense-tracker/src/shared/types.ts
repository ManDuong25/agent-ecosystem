/* ═══════════════════════════════════════════
   Shared Types – Smart Expense Tracker
   ═══════════════════════════════════════════ */

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;            // ISO date string
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  // Shared expense fields (mid-dev feature insert)
  splitWith?: string[];    // names of people to split with
  paidBy?: string;         // who paid
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName?: string;
  limit: number;
  spent?: number;
  month: string;           // YYYY-MM
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: string;
}

export interface AnalyticsSummary {
  totalExpenses: number;
  totalIncome: number;
  transactionCount: number;
  topCategory: string;
  baseCurrency: string;
  budgetAlerts: BudgetAlert[];
}

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  percentage: number;
  level: 'ok' | 'warning' | 'exceeded';
}

export interface CategoryBreakdown {
  category: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
}

export interface TrendPoint {
  month: string;
  total: number;
  count: number;
}

export interface SharedExpenseSummary {
  person: string;
  owes: number;
  isOwed: number;
  net: number;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'VND', 'JPY', 'GBP'] as const;

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', color: '#ef4444', icon: '🍕', isDefault: true },
  { name: 'Transport', color: '#f59e0b', icon: '🚗', isDefault: true },
  { name: 'Housing', color: '#3b82f6', icon: '🏠', isDefault: true },
  { name: 'Entertainment', color: '#8b5cf6', icon: '🎬', isDefault: true },
  { name: 'Shopping', color: '#ec4899', icon: '🛍️', isDefault: true },
  { name: 'Health', color: '#22c55e', icon: '💊', isDefault: true },
  { name: 'Education', color: '#06b6d4', icon: '📚', isDefault: true },
  { name: 'Other', color: '#6b7280', icon: '📦', isDefault: true },
];
