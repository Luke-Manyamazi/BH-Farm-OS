import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type FarmOption = { id: string; name: string; status: string; active: boolean; platformAccess?: boolean };
export type AuthUser = { id: number; email: string; displayName: string; role: string; roleName: string; permissions: string[]; sections: string[]; activeFarmId: string | null; activeFarmName: string | null };
type AuthContextValue = { user: AuthUser | null; farms: FarmOption[]; loading: boolean; farmsLoading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; selectFarm: (farmId: string) => Promise<void>; can: (permission: string) => boolean };
const AuthContext = createContext<AuthContextValue | null>(null);
const API = import.meta.env.VITE_API_URL || '';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmsLoading, setFarmsLoading] = useState(false);

  const refreshFarms = async () => {
    setFarmsLoading(true);
    try { setFarms(await request('/api/auth/farms')); } catch { setFarms([]); } finally { setFarmsLoading(false); }
  };

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = ((input, init = {}) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      if (url.startsWith(API) || url.startsWith('/api/')) return originalFetch(input, { ...init, credentials: init.credentials || 'include' });
      return originalFetch(input, init);
    }) as typeof window.fetch;
    request('/api/auth/me').then(async (nextUser) => { setUser(nextUser); await refreshFarms(); }).catch(() => setUser(null)).finally(() => setLoading(false));
    return () => { window.fetch = originalFetch; };
  }, []);

  const login = async (email: string, password: string) => {
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    await request('/api/auth/ensure-permissions', { method: 'POST' });
    const nextUser = await request('/api/auth/me');
    setUser(nextUser);
    await refreshFarms();
  };

  const selectFarm = async (farmId: string) => {
    await request(`/api/auth/farms/${farmId}/select`, { method: 'POST' });
    const nextUser = await request('/api/auth/me');
    setUser(nextUser);
    await refreshFarms();
  };

  const logout = async () => { await request('/api/auth/logout', { method: 'POST' }); setUser(null); setFarms([]); };
  const can = (permission: string) => Boolean(user?.permissions.includes(permission));

  return <AuthContext.Provider value={{ user, farms, loading, farmsLoading, login, logout, selectFarm, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
