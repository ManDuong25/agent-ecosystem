import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { RepoProfile, WSEvent } from '../../shared/types.js';

interface AppState {
  repoPath: string;
  profile: RepoProfile | null;
  toasts: Toast[];
  setRepoPath: (path: string) => void;
  setProfile: (profile: RepoProfile | null) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  handleWSEvent: (event: WSEvent) => void;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [repoPath, setRepoPath] = useState<string>(() => {
    return localStorage.getItem('ae:repoPath') ?? '';
  });
  const [profile, setProfile] = useState<RepoProfile | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const setRepoPathPersist = useCallback((path: string) => {
    setRepoPath(path);
    localStorage.setItem('ae:repoPath', path);
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleWSEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'error':
        addToast({ type: 'error', message: String(event.payload) });
        break;
      case 'info':
        addToast({ type: 'info', message: String(event.payload) });
        break;
      case 'scan-progress':
        addToast({ type: 'info', message: String(event.payload) });
        break;
      case 'skill-update':
        addToast({ type: 'success', message: String(event.payload) });
        break;
    }
  }, [addToast]);

  return (
    <AppContext.Provider value={{
      repoPath, profile, toasts,
      setRepoPath: setRepoPathPersist,
      setProfile,
      addToast, removeToast,
      handleWSEvent,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
