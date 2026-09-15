import { FormEvent, useState } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (loading) return <div className="min-h-screen grid place-items-center">Loading secure farm access…</div>;
  if (user) return <Redirect to="/" />;
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); setBusy(true); try { await login(email, password); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); } finally { setBusy(false); } }
  return <div className="min-h-screen grid place-items-center bg-[hsl(var(--background))] px-4"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-xl"><div className="mb-7"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Camluk Farm OS</div><h1 className="mt-2 text-3xl font-bold">Sign in</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Sign in to your farm account to access the field book.</p></div>{error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<label className="block text-sm font-medium">Email<input className="mt-1.5 w-full rounded-xl border p-3" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label className="mt-4 block text-sm font-medium">Password<input className="mt-1.5 w-full rounded-xl border p-3" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button disabled={busy} className="mt-6 w-full rounded-xl bg-[hsl(var(--primary))] px-4 py-3 font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button></form></div>;
}
