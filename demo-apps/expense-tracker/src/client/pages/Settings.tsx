import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Download, Plus, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [newCatIcon, setNewCatIcon] = useState('📦');

  useEffect(() => {
    api.getCategories().then(r => { if (r.ok) setCategories(r.data); });
    api.getCurrencies().then(r => { if (r.ok) setCurrencies(r.data.currencies); });
  }, []);

  const addCategory = async () => {
    if (!newCatName) return;
    const res = await api.createCategory({ name: newCatName, color: newCatColor, icon: newCatIcon });
    if (res.ok) {
      setCategories([...categories, res.data]);
      setNewCatName('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage categories, currencies, and export data</p>
      </div>

      {/* Export */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-3">📤 Export Data</h3>
        <div className="flex gap-3">
          <a href={api.exportCsv()} download className="btn-primary flex items-center gap-2">
            <Download size={16} /> Export CSV
          </a>
          <a href={api.exportJson()} download className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export JSON
          </a>
        </div>
      </div>

      {/* Currencies */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-3">💱 Supported Currencies</h3>
        <div className="flex flex-wrap gap-2">
          {currencies.map(c => (
            <span key={c} className="px-3 py-1 bg-surface-2 rounded-lg text-sm text-gray-300">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-3">🏷️ Categories</h3>
        
        {/* Add custom category */}
        <div className="flex gap-3 mb-4">
          <input type="text" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="input w-14 text-center text-lg" maxLength={2} />
          <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name" className="input flex-1" />
          <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
          <button onClick={addCategory} disabled={!newCatName} className="btn-primary btn-sm flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-surface-3 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{c.icon}</span>
                <span className="text-sm text-gray-200">{c.name}</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                {c.isDefault && <span className="text-xs text-gray-500 bg-surface-2 px-2 py-0.5 rounded">Default</span>}
              </div>
              {!c.isDefault && (
                <button className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
