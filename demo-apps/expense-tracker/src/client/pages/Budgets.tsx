import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Budgets() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [catId, setCatId] = useState('');
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [bRes, cRes] = await Promise.all([
      api.getBudgets(month),
      api.getCategories(),
    ]);
    if (bRes.ok) setBudgets(bRes.data);
    if (cRes.ok) {
      setCategories(cRes.data);
      if (!catId && cRes.data.length > 0) setCatId(cRes.data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [month]);

  const handleSet = async () => {
    if (!catId || !limit) return;
    await api.setBudget({ categoryId: catId, limit: parseFloat(limit), month });
    setLimit('');
    loadData();
  };

  if (loading) return <div className="text-gray-500 text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Budgets</h1>
        <p className="text-gray-500 text-sm mt-1">Set spending limits by category and track progress</p>
      </div>

      {/* Month selector */}
      <div className="flex gap-3 items-center">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input w-48" />
      </div>

      {/* Set Budget */}
      <div className="card border-accent/20">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Set Budget</h3>
        <div className="flex gap-3">
          <select value={catId} onChange={e => setCatId(e.target.value)} className="input flex-1">
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Limit ($)" className="input w-40" step="10" />
          <button onClick={handleSet} disabled={!catId || !limit} className="btn-primary">Set</button>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="space-y-4">
        {budgets.length === 0 ? (
          <p className="text-gray-500 text-center py-8 card">No budgets set for {month}</p>
        ) : (
          budgets.map((b: any) => {
            const pct = Math.min(b.percentage, 100);
            const barColor = b.level === 'exceeded' ? 'bg-red-500' : b.level === 'warning' ? 'bg-amber-500' : 'bg-green-500';
            return (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{b.icon}</span>
                    <span className="text-sm font-medium text-gray-200">{b.categoryName}</span>
                  </div>
                  <div className="text-sm">
                    <span className={b.level === 'exceeded' ? 'text-red-400' : b.level === 'warning' ? 'text-amber-400' : 'text-green-400'}>
                      ${b.spent}
                    </span>
                    <span className="text-gray-500"> / ${b.limit}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">{b.percentage}%</span>
                  {b.level !== 'ok' && (
                    <span className={`text-xs font-medium ${b.level === 'exceeded' ? 'text-red-400' : 'text-amber-400'}`}>
                      {b.level === 'exceeded' ? '⚠️ Over budget!' : '⚡ Nearly there'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
