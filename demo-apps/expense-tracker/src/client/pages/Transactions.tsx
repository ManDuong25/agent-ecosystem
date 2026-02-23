import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { Plus, Search, Trash2, Edit2, X, RefreshCw } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [loading, setLoading] = useState(true);

  // Form state
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('monthly');
  const [splitWith, setSplitWith] = useState('');
  const [paidBy, setPaidBy] = useState('');

  const loadData = useCallback(async () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (filterCat) params.category = filterCat;

    const [txRes, catRes] = await Promise.all([
      api.getTransactions(params),
      api.getCategories(),
    ]);
    if (txRes.ok) setTransactions(txRes.data);
    if (catRes.ok) {
      setCategories(catRes.data);
      if (!category && catRes.data.length > 0) setCategory(catRes.data[0].id);
    }
    setLoading(false);
  }, [search, filterCat]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setAmount(''); setCurrency('USD'); setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
    setIsRecurring(false); setRecurrencePattern('monthly');
    setSplitWith(''); setPaidBy('');
    setEditingId(null); setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!amount || !category || !date) return;
    const data: any = {
      amount: parseFloat(amount), currency, category, description, date,
      isRecurring, recurrencePattern: isRecurring ? recurrencePattern : undefined,
      splitWith: splitWith ? splitWith.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      paidBy: paidBy || undefined,
    };

    if (editingId) {
      await api.updateTransaction(editingId, data);
    } else {
      await api.createTransaction(data);
    }
    resetForm();
    loadData();
  };

  const handleEdit = (tx: any) => {
    setAmount(String(tx.amount));
    setCurrency(tx.currency);
    setCategory(tx.category);
    setDescription(tx.description);
    setDate(tx.date);
    setIsRecurring(tx.isRecurring);
    setRecurrencePattern(tx.recurrencePattern || 'monthly');
    setSplitWith(tx.splitWith?.join(', ') || '');
    setPaidBy(tx.paidBy || '');
    setEditingId(tx.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await api.deleteTransaction(id);
    loadData();
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
  const getCategoryIcon = (id: string) => categories.find(c => c.id === id)?.icon || '📦';

  if (loading) return <div className="text-gray-500 text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Transactions</h1>
          <p className="text-gray-500 text-sm mt-1">Track all your income and expenses</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..." className="input pl-10"
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input w-48">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button onClick={loadData} className="btn-secondary btn-sm"><RefreshCw size={14} /></button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card border-accent/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-300">{editingId ? 'Edit Transaction' : 'New Transaction'}</h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="input" step="0.01" />
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
              {['USD', 'EUR', 'VND', 'JPY', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="input md:col-span-2" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
          </div>

          {/* Recurring & Shared Expense */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="accent-indigo-500" />
              Recurring
              {isRecurring && (
                <select value={recurrencePattern} onChange={e => setRecurrencePattern(e.target.value)} className="input w-32 ml-2">
                  {['daily', 'weekly', 'monthly', 'yearly'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </label>
            <div className="flex gap-2">
              <input type="text" value={splitWith} onChange={e => setSplitWith(e.target.value)} placeholder="Split with (comma-separated names)" className="input flex-1" />
              <input type="text" value={paidBy} onChange={e => setPaidBy(e.target.value)} placeholder="Paid by" className="input w-32" />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={handleSubmit} disabled={!amount || !category} className="btn-primary">
              {editingId ? 'Update' : 'Add'} Transaction
            </button>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="card">
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No transactions found</p>
        ) : (
          <div className="divide-y divide-surface-3">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getCategoryIcon(tx.category)}</span>
                  <div>
                    <p className="text-sm text-gray-200">{tx.description || 'Untitled'}</p>
                    <p className="text-xs text-gray-500">
                      {getCategoryName(tx.category)} · {tx.date}
                      {tx.isRecurring && <span className="ml-1 text-indigo-400">🔄 {tx.recurrencePattern}</span>}
                      {tx.splitWith && <span className="ml-1 text-green-400">👥 Split</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-red-400">-{tx.amount.toLocaleString()} {tx.currency}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button onClick={() => handleEdit(tx)} className="p-1 text-gray-500 hover:text-gray-300"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(tx.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
