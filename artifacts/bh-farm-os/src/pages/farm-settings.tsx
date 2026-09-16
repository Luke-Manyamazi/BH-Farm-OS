import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { PageHeading } from "@/components/farm-shell";
import { Badge, Button, Panel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";

const API = import.meta.env.VITE_API_URL || "";
async function api(path: string, options?: RequestInit) {
  const response = await fetch(`${API}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

export default function FarmSettingsPage() {
  const { user } = useAuth();
  const [farm, setFarm] = useState<any>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [timezone, setTimezone] = useState("Africa/Harare");
  const [currency, setCurrency] = useState("USD");
  const [status, setStatus] = useState("active");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.permissions.includes("settings.manage")) return;
    api("/api/farm-management").then((data) => {
      setFarm(data); setName(data.name); setStatus(data.status);
      setLocation(String(data.profile?.location ?? ""));
      setArea(data.profile?.areaHa == null ? "" : String(data.profile.areaHa));
      setTimezone(String(data.settings?.timezone ?? "Africa/Harare"));
      setCurrency(String(data.settings?.currency ?? "USD"));
    }).catch((error) => setMessage(error.message));
  }, [user]);

  if (!user?.permissions.includes("settings.manage")) return <Redirect to="/" />;

  async function save() {
    setBusy(true); setMessage("");
    try {
      const data = await api("/api/farm-management", { method: "PATCH", body: JSON.stringify({ name, status, profile: { ...(farm?.profile ?? {}), location, areaHa: area === "" ? null : Number(area) }, settings: { ...(farm?.settings ?? {}), timezone, currency } }) });
      setFarm(data); setMessage("Farm settings saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save farm settings"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <PageHeading eyebrow="Farm administration" title="Farm settings" detail="Configure the active farm without changing operational history. These settings describe the tenant and how the field book should behave." />
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <Panel className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1.5 block text-[11px] font-semibold">Farm name *</span><input className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" value={name} onChange={e=>setName(e.target.value)} /></label>
          <label><span className="mb-1.5 block text-[11px] font-semibold">Location</span><input className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" placeholder="District / region" value={location} onChange={e=>setLocation(e.target.value)} /></label>
          <label><span className="mb-1.5 block text-[11px] font-semibold">Farm area (ha)</span><input type="number" min="0" step="0.01" className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" value={area} onChange={e=>setArea(e.target.value)} /></label>
          <label><span className="mb-1.5 block text-[11px] font-semibold">Timezone</span><input className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" value={timezone} onChange={e=>setTimezone(e.target.value)} /></label>
          <label><span className="mb-1.5 block text-[11px] font-semibold">Currency</span><input className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())} /></label>
          {user.role === "platform_admin" && <label><span className="mb-1.5 block text-[11px] font-semibold">Lifecycle status</span><select className="h-10 w-full rounded-xl border bg-[hsl(var(--background))] px-3 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>}
        </div>
        {message && <div className="mt-4 rounded-xl border bg-[hsl(var(--muted)/.45)] p-3 text-sm">{message}</div>}
        <div className="mt-5 flex justify-end"><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save farm settings"}</Button></div>
      </Panel>
      <Panel className="p-5 sm:p-6">
        <div className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Tenant</div>
        <div className="mt-2 text-xl font-bold">{farm?.name || user.activeFarmName || "Active farm"}</div>
        <div className="mt-3"><Badge tone={status === "active" ? "green" : status === "suspended" ? "red" : "gold"}>{status}</Badge></div>
        <div className="mt-6 space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-[hsl(var(--muted-foreground))]">Farm ID</span><span className="font-mono text-xs">{farm?.id || user.activeFarmId}</span></div><div className="flex justify-between gap-4"><span className="text-[hsl(var(--muted-foreground))]">Created</span><span>{farm?.createdAt ? new Date(farm.createdAt).toLocaleDateString() : "—"}</span></div></div>
      </Panel>
    </div>
  </div>;
}
