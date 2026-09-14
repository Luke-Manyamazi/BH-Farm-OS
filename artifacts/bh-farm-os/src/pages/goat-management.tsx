import { useEffect, useMemo, useState } from "react";
import { Activity, Edit3, HeartPulse, Plus, Save, Trash2, Weight } from "lucide-react";
import { PageHeading } from "@/components/farm-shell";
import { Badge, Button, EmptyState, Loading, Panel, PanelTitle } from "@/components/ui-kit";

type Goat = {
  id: number;
  goatId: string;
  name: string;
  sex: string;
  breed: string;
  dateOfBirth?: string | null;
  currentWeightKg?: number | null;
  paddock: string;
  status: string;
  pregnancyStatus: string;
  expectedKiddingDate?: string | null;
  healthStatus: string;
};

type History = {
  id: number;
  recordType: string;
  name: string;
  status: string;
  recordDate: string;
  data: Record<string, unknown>;
};

const blank = { goatId: "", name: "", sex: "Female", breed: "", dateOfBirth: "", currentWeightKg: "", paddock: "Paddock 1", status: "Active", pregnancyStatus: "Not pregnant", expectedKiddingDate: "", healthStatus: "Good" };

export default function GoatManagementPage() {
  const [goats, setGoats] = useState<Goat[]>([]);
  const [selected, setSelected] = useState<Goat | null>(null);
  const [form, setForm] = useState<any>(blank);
  const [history, setHistory] = useState<History[]>([]);
  const [event, setEvent] = useState({ recordType: "health", recordDate: new Date().toISOString().slice(0, 10), name: "", status: "Recorded", note: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/livestock/goats");
      if (!response.ok) throw new Error("Could not load goats");
      setGoats(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load goats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectGoat = async (goat: Goat) => {
    setSelected(goat);
    setForm({ ...blank, ...goat, currentWeightKg: goat.currentWeightKg ?? "", dateOfBirth: goat.dateOfBirth ?? "", expectedKiddingDate: goat.expectedKiddingDate ?? "" });
    try {
      const response = await fetch(`/api/goat-management/${goat.id}/history`);
      setHistory(response.ok ? await response.json() : []);
    } catch {
      setHistory([]);
    }
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const url = selected ? `/api/goat-management/${selected.id}` : "/api/livestock/goats";
      const method = selected ? "PATCH" : "POST";
      const payload = { ...form, currentWeightKg: form.currentWeightKg === "" ? null : Number(form.currentWeightKg) };
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Could not save goat");
      await load();
      setSelected(null);
      setHistory([]);
      setForm(blank);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save goat");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`Delete ${selected.goatId} — ${selected.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/goat-management/${selected.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Could not delete goat"); return; }
    setSelected(null); setHistory([]); setForm(blank); await load();
  };

  const recordEvent = async () => {
    if (!selected) return;
    const response = await fetch(`/api/goat-management/${selected.id}/events`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordType: event.recordType, recordDate: event.recordDate, name: event.name || undefined, status: event.status, data: { note: event.note } }),
    });
    if (!response.ok) { setError("Could not record event"); return; }
    setEvent({ ...event, name: "", note: "" });
    await selectGoat(selected);
  };

  const pregnant = useMemo(() => goats.filter(g => g.pregnancyStatus === "Pregnant").length, [goats]);
  const healthy = useMemo(() => goats.filter(g => g.healthStatus === "Good").length, [goats]);

  if (loading) return <Loading rows={8} />;

  return <div className="space-y-5 animate-rise">
    <PageHeading eyebrow="Livestock · goats" title="Goat register" detail="Manage the individual animal record, health, pregnancy and history." action={<Button onClick={() => { setSelected(null); setForm({ ...blank, goatId: `G-${String(goats.length + 1).padStart(3, "0")}` }); }}><Plus size={15} /> Add goat</Button>} />

    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

    <div className="grid grid-cols-3 gap-3">
      <Panel className="p-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Registered</div><div className="mt-1 text-2xl font-bold">{goats.length}</div></Panel>
      <Panel className="p-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pregnant</div><div className="mt-1 text-2xl font-bold">{pregnant}</div></Panel>
      <Panel className="p-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Healthy</div><div className="mt-1 text-2xl font-bold">{healthy}</div></Panel>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1fr_1.35fr]">
      <Panel><PanelTitle eyebrow="Individual records" title="Herd register" /><div className="divide-y divide-[hsl(var(--border))]">
        {goats.map(goat => <button key={goat.id} onClick={() => void selectGoat(goat)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--secondary)/.45)] ${selected?.id === goat.id ? "bg-[hsl(var(--secondary)/.6)]" : ""}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><HeartPulse size={16} /></div>
          <div className="min-w-0 flex-1"><div className="font-semibold">{goat.goatId} · {goat.name}</div><div className="text-[10px] text-muted-foreground">{goat.breed} · {goat.paddock}</div></div>
          <Badge tone={goat.healthStatus === "Good" ? "green" : "red"}>{goat.healthStatus}</Badge>
        </button>)}
        {goats.length === 0 && <EmptyState title="No goats registered" detail="Start the herd register with the first animal." />}
      </div></Panel>

      <div className="space-y-5">
        <Panel><PanelTitle eyebrow={selected ? "Edit animal" : "New animal"} title={selected ? `${selected.goatId} · ${selected.name}` : "Goat details"} />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {([['goatId','Goat ID'],['name','Name'],['breed','Breed'],['paddock','Paddock'],['dateOfBirth','Date of birth'],['currentWeightKg','Weight (kg)'],['expectedKiddingDate','Expected kidding']] as const).map(([key,label]) => <label key={key} className="text-[11px] font-semibold">{label}<input type={key.includes('Date') || key === 'dateOfBirth' ? 'date' : key === 'currentWeightKg' ? 'number' : 'text'} step={key === 'currentWeightKg' ? '0.1' : undefined} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm" /></label>)}
            <label className="text-[11px] font-semibold">Sex<select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })} className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"><option>Female</option><option>Male</option></select></label>
            <label className="text-[11px] font-semibold">Health<select value={form.healthStatus} onChange={e => setForm({ ...form, healthStatus: e.target.value })} className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"><option>Good</option><option>Watch</option><option>Sick</option><option>Recovering</option></select></label>
            <label className="text-[11px] font-semibold">Pregnancy<select value={form.pregnancyStatus} onChange={e => setForm({ ...form, pregnancyStatus: e.target.value })} className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"><option>Not pregnant</option><option>Pregnant</option></select></label>
            <label className="text-[11px] font-semibold">Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"><option>Active</option><option>Pregnant</option><option>Sold</option><option>Deceased</option></select></label>
          </div>
          <div className="flex items-center justify-between border-t border-[hsl(var(--border))] p-4"><div>{selected && <Button variant="ghost" onClick={() => void remove()}><Trash2 size={14} /> Delete</Button>}</div><Button onClick={() => void save()} disabled={saving}><Save size={14} /> {saving ? "Saving…" : selected ? "Save changes" : "Register goat"}</Button></div>
        </Panel>

        {selected && <Panel><PanelTitle eyebrow="Animal history" title="Health & production events" /><div className="grid gap-2 border-b border-[hsl(var(--border))] p-4 sm:grid-cols-[130px_130px_1fr_auto]">
          <select value={event.recordType} onChange={e => setEvent({ ...event, recordType: e.target.value })} className="rounded-xl border px-3 py-2 text-sm"><option value="health">Health</option><option value="weight">Weight</option><option value="mortality">Mortality</option><option value="production">Production</option><option value="feed_record">Feed</option></select>
          <input type="date" value={event.recordDate} onChange={e => setEvent({ ...event, recordDate: e.target.value })} className="rounded-xl border px-3 py-2 text-sm" />
          <input placeholder="Note / observation" value={event.note} onChange={e => setEvent({ ...event, note: e.target.value })} className="rounded-xl border px-3 py-2 text-sm" />
          <Button onClick={() => void recordEvent()}><Plus size={14} /> Record</Button>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">{history.map(item => <div key={item.id} className="flex items-start gap-3 px-4 py-3"><div className="mt-0.5 text-[hsl(var(--primary))]"><Activity size={15} /></div><div className="flex-1"><div className="text-sm font-semibold">{item.name}</div><div className="text-[10px] text-muted-foreground">{item.recordType} · {item.recordDate} · {String(item.data?.note || "")}</div></div><Badge tone="green">{item.status}</Badge></div>)}{history.length === 0 && <EmptyState title="No history yet" detail="Record health checks, weights and production events as the herd is managed." />}</div></Panel>}
      </div>
    </div>
  </div>;
}
