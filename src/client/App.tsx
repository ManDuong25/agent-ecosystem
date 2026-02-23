import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './lib/store.js';
import { useSocket } from './lib/socket.js';
import { useApp } from './lib/store.js';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import RepoSetup from './pages/RepoSetup.js';
import Skills from './pages/Skills.js';
import Specs from './pages/Specs.js';
import AIEngineer from './pages/AIEngineer.js';
import Bugs from './pages/Bugs.js';

function AppInner() {
  const { handleWSEvent } = useApp();
  useSocket(handleWSEvent);
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/repo" element={<RepoSetup />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/specs" element={<Specs />} />
        <Route path="/specs/:specId" element={<Specs />} />
        <Route path="/engineer" element={<AIEngineer />} />
        <Route path="/bugs" element={<Bugs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </BrowserRouter>
  );
}
