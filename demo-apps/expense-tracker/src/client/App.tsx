import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, PieChart, Wallet, Settings, Users
} from 'lucide-react';
import Dashboard from './pages/Dashboard.js';
import Transactions from './pages/Transactions.js';
import Analytics from './pages/Analytics.js';
import Budgets from './pages/Budgets.js';
import SettingsPage from './pages/Settings.js';
import SharedExpenses from './pages/SharedExpenses.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: PieChart },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/shared', label: 'Shared', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-surface-1 border-r border-surface-3 flex flex-col shrink-0">
          <div className="p-4 border-b border-surface-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center font-bold text-white text-sm">
                💰
              </div>
              <div>
                <h1 className="font-semibold text-gray-100 text-sm">Expense Tracker</h1>
                <p className="text-xs text-gray-500">Smart Money Management</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive
                    ? 'bg-accent/15 text-indigo-300 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-surface-3 text-xs text-gray-500">
            Built with <span className="text-accent">agent-ecosystem</span> SDD
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/shared" element={<SharedExpenses />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
