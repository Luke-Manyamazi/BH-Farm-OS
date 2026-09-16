import { FormEvent, useEffect, useState } from "react";
import { Redirect } from "wouter";
import { PageHeading } from "@/components/farm-shell";
import { Badge, Button, Panel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";

const API = import.meta.env.VITE_API_URL || "";
async function api(path: string, options?: RequestInit) {
  const r = await fetch(`${API}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "Request failed");
  return d;
}

export default function PlatformFarmsPage() {
  const { user, farms } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const load = () => api("/api/auth/farms").then(setRows).catch(e => setMessage(e.message));
  useEffect(() => { if (user?.role === "platform_admin") load(); }, [user]);
  if (user?.role !== "platform_admin") return <Redirect to="/" />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/api/auth/farms/onboard", {
        method: "POST",
        body: JSON.stringify({ name, email, displayName: adminName, password }),
      });
      setMessage("Farm onboarded successfully with its owner administrator.");
      setName(""); setEmail(""); setAdminName(""); setPassword("");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to onboard farm");
    } finally {
      setBusy(false);
    }
  }

  async function setLifecycle(id: string, status: string) {
    setBusy(true);
    setMessage("");
    try {
      await api(`/api/farm-management/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
      setMessage(`Farm marked ${status}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to update farm");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-6">
    <PageHeading eyebrow="Platform administration" title="Farm onboarding" detail="Create independent farm tenants, provision their first owner administrator, and control their lifecycle." />
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <Panel className="p-5">
        <h2 className="font-semibold">Onboard a farm</h2>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">The farm and owner account are created together, so a failed onboarding does not leave an orphan farm.</p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <input className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" placeholder="Farm name" value={name} onChange={e => setName(e.target.value)} required />
          <input className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" placeholder="Owner name" value={adminName} onChange={e => setAdminName(e.target.value)} required />
          <input className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" type="email" placeholder="Owner email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" type="password" minLength={12} placeholder="Temporary password (12+ characters)" value={password} onChange={e => setPassword(e.target.value)} required />
          {message && <div className="rounded-xl border p-3 text-sm">{message}</div>}
          <Button type="submit" disabled={busy}>{busy ? "Onboarding…" : "Create farm & owner"}</Button>
        </form>
      </Panel>
      <Panel className="p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Onboarded farms</h2><span className="text-xs text-[hsl(var(--muted-foreground))]">{rows.length || farms.length} tenants</span></div>
        <div className="space-y-2">
          {rows.map(f => <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <div><div className="font-medium">{f.name}</div><div className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{f.id}</div></div>
            <div className="flex items-center gap-2"><Badge tone={f.status === "active" ? "green" : f.status === "suspended" ? "red" : "gold"}>{f.status}</Badge>{f.status !== "active" && <Button size="sm" disabled={busy} onClick={() => setLifecycle(f.id, "active")}>Activate</Button>}{f.status === "active" && <Button size="sm" variant="danger" disabled={busy} onClick={() => setLifecycle(f.id, "suspended")}>Suspend</Button>}</div>
          </div>)}
        </div>
      </Panel>
    </div>
  </div>;
}
