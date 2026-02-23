import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function Analytics() {
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getByCategory(),
      api.getTrends(6),
    ]).then(([c, t]) => {
      if (c.ok) setByCategory(c.data);
      if (t.ok) setTrends(t.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-500 text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Visualize your spending patterns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart – By Category */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Spending by Category</h3>
          {byCategory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ category, percentage }) => `${category} ${percentage}%`}
                >
                  {byCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e28', border: '1px solid #2a2a38', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Category legend */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {byCategory.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.category}</span>
                <span className="ml-auto font-medium">${c.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart – Monthly Trends */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Monthly Trends (6 months)</h3>
          {trends.every(t => t.total === 0) ? (
            <p className="text-gray-500 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e28', border: '1px solid #2a2a38', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Total']}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Trend summary */}
          <div className="mt-4 space-y-1">
            {trends.slice(-3).map((t, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-400">
                <span>{t.month}</span>
                <span className="font-medium">${t.total.toLocaleString()} ({t.count} txns)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
