/* ═══════════════════════════════════════════
   API Helper
   ═══════════════════════════════════════════ */
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  return res.json();
}

export const api = {
  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/transactions${qs}`);
  },
  createTransaction: (data: any) =>
    request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: any) =>
    request<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) =>
    request<any>(`/transactions/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request<any>('/categories'),
  createCategory: (data: any) =>
    request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),

  // Budgets
  getBudgets: (month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return request<any>(`/budgets${qs}`);
  },
  setBudget: (data: any) =>
    request<any>('/budgets', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getSummary: (month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return request<any>(`/analytics/summary${qs}`);
  },
  getByCategory: (month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return request<any>(`/analytics/by-category${qs}`);
  },
  getTrends: (months?: number) => {
    const qs = months ? `?months=${months}` : '';
    return request<any>(`/analytics/trends${qs}`);
  },
  getSharedExpenses: () => request<any>('/analytics/shared-expenses'),

  // Currencies
  getCurrencies: () => request<any>('/currencies'),

  // Export
  exportCsv: () => `${BASE}/export/csv`,
  exportJson: () => `${BASE}/export/json`,
};
