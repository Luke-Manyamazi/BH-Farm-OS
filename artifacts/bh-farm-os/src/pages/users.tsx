import { FormEvent, useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/lib/auth';

const API = import.meta.env.VITE_API_URL || '';

async function api(path: string, options?: RequestInit) {
  const r = await fetch(`${API}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || 'Request failed');
  return d;
}

type FarmUser = { id: number; email: string; displayName: string; active: boolean; role: string; roleName: string; sections: string[]; createdAt: string };

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<FarmUser[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [role, setRole] = useState('field_worker'); const [selected, setSelected] = useState<string[]>([]); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null); const [editRole, setEditRole] = useState('field_worker'); const [editSections, setEditSections] = useState<string[]>([]);

  const load = async () => {
    const [u, r, s] = await Promise.all([api('/api/auth/users'), api('/api/auth/roles'), api('/api/auth/sections')]);
    setUsers(u); setRoles(r); setSections(s);
  };

  useEffect(() => { if (user?.permissions.includes('users.manage')) load().catch(e => setMessage(e.message)); }, [user]);
  if (!user?.permissions.includes('users.manage')) return <Redirect to="/" />;

  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage(''); setBusy(true);
    try { await api('/api/auth/users', { method: 'POST', body: JSON.stringify({ displayName: name, email, password, role, sections: selected }) }); setMessage('User created.'); setName(''); setEmail(''); setPassword(''); setSelected([]); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to create user'); }
    finally { setBusy(false); }
  }

  function beginEdit(u: FarmUser) { setEditing(u.id); setEditRole(u.role); setEditSections(u.sections ?? []); }

  async function saveEdit(u: FarmUser) {
    setBusy(true); setMessage('');
    try { await api(`/api/auth/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ role: editRole, sections: editSections }) }); setMessage(`${u.displayName} updated.`); setEditing(null); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to update user'); }
    finally { setBusy(false); }
  }

  async function toggleActive(u: FarmUser) {
    setBusy(true); setMessage('');
    try { await api(`/api/auth/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) }); setMessage(`${u.displayName} is now ${u.active ? 'disabled' : 'active'}.`); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to change user status'); }
    finally { setBusy(false); }
  }

  const sectionPicker = (value: string[], setValue: (next: string[]) => void) => <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{sections.map(s => <label key={s.key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={value.includes(s.key)} onChange={e => setValue(e.target.checked ? [...value, s.key] : value.filter(x => x !== s.key))} />{s.name}</label>)}</div>;

  return <div className="space-y-6">
    <div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Administration</div><h1 className="mt-2 text-3xl font-bold">Users & access</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Create users, assign roles, control section access and disable farm accounts without deleting their history.</p></div>
    {message && <div className="rounded-xl border bg-[hsl(var(--muted)/.45)] p-3 text-sm">{message}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <form onSubmit={submit} className="rounded-2xl border p-5 space-y-4"><h2 className="font-semibold">Create user</h2>
        <input className="w-full rounded-xl border p-3" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
        <input className="w-full rounded-xl border p-3" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full rounded-xl border p-3" placeholder="Temporary password (12+ characters)" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={12} required />
        <select className="w-full rounded-xl border p-3" value={role} onChange={e => setRole(e.target.value)}>{roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}</select>
        <div><div className="mb-2 text-sm font-medium">Assigned sections</div>{sectionPicker(selected, setSelected)}</div>
        <button disabled={busy} className="w-full rounded-xl bg-[hsl(var(--primary))] p-3 font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50">{busy ? 'Saving…' : 'Create user'}</button>
      </form>
      <div className="rounded-2xl border p-5"><h2 className="mb-4 font-semibold">Current users</h2><div className="space-y-3">
        {users.map(u => <div key={u.id} className="rounded-xl border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium">{u.displayName}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</div></div><div className="text-right text-xs"><div className="font-semibold">{u.roleName}</div><div className={u.active ? 'text-green-700' : 'text-red-700'}>{u.active ? 'Active' : 'Disabled'}</div></div></div>
          {editing === u.id && <div className="mt-4 space-y-3 rounded-xl bg-[hsl(var(--muted)/.35)] p-3"><select className="w-full rounded-xl border p-2.5 text-sm" value={editRole} onChange={e => setEditRole(e.target.value)}>{roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}</select><div><div className="mb-2 text-xs font-medium">Section assignments</div>{sectionPicker(editSections, setEditSections)}</div><div className="flex gap-2"><button disabled={busy} onClick={() => saveEdit(u)} className="rounded-xl bg-[hsl(var(--primary))] px-3 py-2 text-xs font-semibold text-[hsl(var(--primary-foreground))]">Save changes</button><button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-3 py-2 text-xs">Cancel</button></div></div>}
          {editing !== u.id && <div className="mt-3 flex flex-wrap justify-end gap-2"><button disabled={busy || u.id === user.id} onClick={() => toggleActive(u)} className="rounded-xl border px-3 py-2 text-xs">{u.active ? 'Disable' : 'Enable'}</button><button disabled={busy} onClick={() => beginEdit(u)} className="rounded-xl border px-3 py-2 text-xs">Edit role / sections</button></div>}
        </div>)}
        {!users.length && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No users assigned to this farm yet.</div>}
      </div></div>
    </div>
  </div>;
}
