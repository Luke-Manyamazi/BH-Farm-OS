import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AuthUser = { id: number; email: string; displayName: string; role: string; roleName: string; permissions: string[]; sections: string[] };
type AuthContextValue = { user: AuthUser | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; can: (permission: string) => boolean };
const AuthContext = createContext<AuthContextValue | null>(null);
const API = import.meta.env.VITE_API_URL || '';
async function request(path: string, options: RequestInit = {}) { const response = await fetch(`${API}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'Request failed'); return data; }
export function AuthProvider({ children }: { children: ReactNode }) { const [user,setUser]=useState<AuthUser|null>(null); const [loading,setLoading]=useState(true); useEffect(()=>{request('/api/auth/me').then(setUser).catch(()=>setUser(null)).finally(()=>setLoading(false));},[]); const login=async(email:string,password:string)=>{await request('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});setUser(await request('/api/auth/me'));}; const logout=async()=>{await request('/api/auth/logout',{method:'POST'});setUser(null);}; return <AuthContext.Provider value={{user,loading,login,logout,can:(permission)=>Boolean(user?.permissions.includes(permission))}}>{children}</AuthContext.Provider>; }
export function useAuth(){const context=useContext(AuthContext);if(!context)throw new Error('useAuth must be used inside AuthProvider');return context;}
