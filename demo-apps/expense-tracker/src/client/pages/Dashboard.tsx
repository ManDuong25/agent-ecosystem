import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';
import { TrendingUp, Receipt, AlertTriangle, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSummary(),
      api.getTransactions({ limit: '5' }),
    ]).then(([s, t]) => {
      if (s.ok) setSummary(s.data);
      if (t.ok) setTransactions(t.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-500 text-center py-12">Loading...</div>;

  const s = summary || { totalExpenses: 0, transactionCount: 0, topCategory: 'N/A', budgetAlerts: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your financial overview at a glance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<DollarSign size={20} />} label="Total Spent" value={`$${s.totalExpenses.toLocaleString()}`} color="text-red-400" />
        <StatCard icon={<Receipt size={20} />} label="Transactions" value={String(s.transactionCount)} color="text-blue-400" />
        <StatCard icon={<TrendingUp size={20} />} label="Top Category" value={s.topCategory} color="text-amber-400" />
        <StatCard icon={<AlertTriangle size={20} />} label="Budget Alerts" value={String(s.budgetAlerts.length)} color={s.budgetAlerts.length > 0 ? 'text-red-400' : 'text-green-400'} />
      </div>

      {/* Budget Alerts */}
      {s.budgetAlerts.length > 0 && (
        <div className="card border-amber-500/30">
          <h3 className="text-sm font-medium text-amber-400 mb-3">⚠️ Budget Alerts</h3>
          <div className="space-y-2">
            {s.budgetAlerts.map((a: any, i: number) => (
              <div key={i} className={`flex justify-between items-center text-sm px-3 py-2 rounded-lg ${a.level === 'exceeded' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                <span>{a.categoryName}</span>
                <span>${a.spent} / ${a.limit} ({a.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">Recent Transactions</h3>
          <Link to="/transactions" className="text-xs text-accent hover:underline">View all →</Link>
        </div>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No transactions yet. <Link to="/transactions" className="text-accent hover:underline">Add one</Link></p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b border-surface-3 last:border-0">
                <div>
                  <span className="text-gray-200">{tx.description || 'Untitled'}</span>
                  <span className="text-gray-500 text-xs ml-2">{tx.date}</span>
                </div>
                <span className="text-red-400 font-medium">-{tx.amount} {tx.currency}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`${color} p-2 bg-surface-2 rounded-lg`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
