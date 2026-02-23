import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Users } from 'lucide-react';

export default function SharedExpenses() {
  const [shared, setShared] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSharedExpenses().then(res => {
      if (res.ok) setShared(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-500 text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Shared Expenses</h1>
        <p className="text-gray-500 text-sm mt-1">Track who owes what when splitting bills</p>
        <p className="text-xs text-indigo-400 mt-1">🆕 Mid-development feature insertion demo</p>
      </div>

      {shared.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No shared expenses yet.</p>
          <p className="text-gray-500 text-sm mt-1">
            Add a transaction with "Split with" names to track shared costs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shared.map((person, i) => (
            <div key={i} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-3 rounded-full flex items-center justify-center text-lg">
                  {person.person.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{person.person}</p>
                  <p className="text-xs text-gray-500">
                    Owes: ${person.owes} · Is Owed: ${person.isOwed}
                  </p>
                </div>
              </div>
              <div className={`text-lg font-bold ${person.net > 0 ? 'text-red-400' : person.net < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {person.net > 0 ? `-$${person.net}` : person.net < 0 ? `+$${Math.abs(person.net)}` : '$0'}
              </div>
            </div>
          ))}

          <div className="card bg-surface-2 text-center">
            <p className="text-sm text-gray-400">
              💡 Tip: When creating a transaction, add names in the "Split with" field
              and specify who paid in "Paid by" to track shared expenses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
