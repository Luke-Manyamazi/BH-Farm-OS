import { useEffect, useState, type FormEvent } from "react";
import { Bird, Egg, Package, Plus, RefreshCw, Scale, Trash2 } from "lucide-react";
import { PageHeading } from "@/components/farm-shell";
import { Badge, Button, EmptyState, FormField, Loading, Modal, Panel, PanelTitle, SelectField, Stat } from "@/components/ui-kit";

type Flock = {
  id: number; batchId: string; kind: string; breed: string; currentQuantity: number; startingQuantity: number;
  mortality: number; averageWeightKg: string | null; feedKg: string; status: string; expectedSaleDate: string | null;
};
type Event = { id: number; recordDate: string | null; name: string; data: Record<string, unknown> };

const api = (path: string, init?: RequestInit) => fetch(`${import.meta.env.VITE_API_URL || ""}${path}`, { headers: { "Content-Type": "application/json" }, ...init });

export default function PoultryManagementPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selected, setSelected] = useState<Flock | null>(null);
  const [history, setHistory] = useState<Event[]>([]);
  const [modal, setModal] = useState<"batch" | "event" | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({ batchId: "", kind: "Broilers", breed: "", startingQuantity: "", currentQuantity: "", expectedSaleDate: "", averageWeightKg: "", feedKg: "0" });
  const [event, setEvent] = useState<Record<string, string>>({ eventType: "mortality", quantityDelta: "0", mortalityDelta: "1", feedKg: "0", averageWeightKg: "", notes: "" });

  const load = async () => {
    setLoading(true);
    const response = await api("/api/poultry-management");
    setFlocks(response.ok ? await response.json() : []);
    setLoading(false);
  };
  const openHistory = async (flock: Flock) => {
    setSelected(flock);
    const response = await api(`/api/poultry-management/${flock.id}/history`);
    setHistory(response.ok ? await response.json() : []);
  };
  useEffect(() => { load(); }, []);

  const createBatch = async (e: FormEvent) => {
    e.preventDefault();
    const response = await api("/api/poultry-management", { method: "POST", body: JSON.stringify(form) });
    if (response.ok) { setModal(null); setForm({ batchId: "", kind: "Broilers", breed: "", startingQuantity: "", currentQuantity: "", expectedSaleDate: "", averageWeightKg: "", feedKg: "0" }); await load(); }
  };
  const recordEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const response = await api(`/api/poultry-management/${selected.id}/events`, { method: "POST", body: JSON.stringify(event) });
    if (response.ok) { setModal(null); setEvent({ eventType: "mortality", quantityDelta: "0", mortalityDelta: "1", feedKg: "0", averageWeightKg: "", notes: "" }); await load(); await openHistory(selected); }
  };
  const remove = async (flock: Flock) => {
    if (!window.confirm(`Delete batch ${flock.batchId}?`)) return;
    await api(`/api/poultry-management/${flock.id}`, { method: "DELETE" });
    if (selected?.id === flock.id) { setSelected(null); setHistory([]); }
    await load();
  };

  const total = flocks.reduce((n, f) => n + f.currentQuantity, 0);
  const deaths = flocks.reduce((n, f) => n + f.mortality, 0);
  const active = flocks.filter(f => f.status === "Active").length;
  return <div className="space-y-5 animate-rise">
    <PageHeading eyebrow="Poultry register" title="Flocks & production" detail="Track batches, mortality, feed, weights and sale readiness from one live register." action={<div className="flex gap-2"><Button variant="secondary" onClick={load}><RefreshCw size={15} /> Refresh</Button><Button onClick={() => setModal("batch")}><Plus size={15} /> New batch</Button></div>} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Panel className="p-4"><Stat label="Live birds" value={total} note={`${active} active batches`} tone="green" /></Panel><Panel className="p-4"><Stat label="Mortality" value={deaths} note="Recorded losses" tone={deaths ? "red" : "green"} /></Panel><Panel className="p-4"><Stat label="Batches" value={flocks.length} note="All statuses" tone="gold" /></Panel><Panel className="p-4"><Stat label="Feed recorded" value={`${flocks.reduce((n, f) => n + Number(f.feedKg || 0), 0).toFixed(1)} kg`} note="Across batches" tone="green" /></Panel></div>
    {loading ? <Loading rows={5} /> : flocks.length === 0 ? <Panel><EmptyState title="No poultry batches yet" detail="Create the first batch when birds arrive. Demo data can also be loaded from the Demo Data page." action={<Button onClick={() => setModal("batch")}><Plus size={15} /> Create batch</Button>} /></Panel> : <div className="grid gap-5 lg:grid-cols-[1.35fr_.9fr]">
      <Panel><PanelTitle eyebrow="Live register" title="Poultry batches" /><div className="divide-y divide-[hsl(var(--border))]">{flocks.map(f => <div key={f.id} className={`p-4 transition hover:bg-[hsl(var(--secondary)/.35)] ${selected?.id === f.id ? "bg-[hsl(var(--secondary)/.45)]" : ""}`}><div className="flex items-start justify-between gap-3"><button onClick={() => openHistory(f)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><Bird size={17} className="text-[hsl(var(--primary))]" /><span className="font-semibold">{f.batchId}</span><Badge tone={f.status === "Active" ? "green" : "gold"}>{f.status}</Badge></div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{f.kind} · {f.breed} · {f.expectedSaleDate ? `Sale ${f.expectedSaleDate}` : "No sale date"}</div></button><button aria-label={`Delete ${f.batchId}`} onClick={() => remove(f)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"><Trash2 size={15} /></button></div><div className="mt-3 grid grid-cols-4 gap-2 text-[11px]"><div><div className="text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Live</div><strong>{f.currentQuantity}</strong></div><div><div className="text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Start</div><strong>{f.startingQuantity}</strong></div><div><div className="text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Mortality</div><strong>{f.mortality}</strong></div><div><div className="text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Avg wt</div><strong>{f.averageWeightKg ? `${f.averageWeightKg} kg` : "—"}</strong></div></div></div>)}</div></Panel>
      <Panel><PanelTitle eyebrow={selected ? selected.batchId : "Select a batch"} title="Production history" action={selected ? <Button size="sm" onClick={() => setModal("event")}><Plus size={14} /> Record</Button> : undefined} />{!selected ? <EmptyState icon={Bird} title="Choose a batch" detail="Select a batch to see mortality, feed, weight and production events." /> : history.length === 0 ? <EmptyState icon={Egg} title="No events recorded" detail="Start the history with a mortality, feed, weight or production event." /> : <div className="space-y-3 p-4">{history.map(item => { const d = item.data || {}; return <div key={item.id} className="rounded-xl border border-[hsl(var(--border))] p-3"><div className="flex items-center gap-2"><Package size={14} /><strong className="text-[12px]">{String(d.eventType || item.name)}</strong><span className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))]">{item.recordDate || "—"}</span></div><div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[hsl(var(--muted-foreground))]">{Number(d.mortalityDelta) > 0 && <span>Mortality +{String(d.mortalityDelta)}</span>}{Number(d.feedKg) > 0 && <span>Feed +{String(d.feedKg)} kg</span>}{d.averageWeightKg != null && <span><Scale size={11} className="inline" /> {String(d.averageWeightKg)} kg</span>}{d.notes != null && String(d.notes).length > 0 && <span>{String(d.notes)}</span>}</div></div>; })}</div>}</Panel>
    </div>}

    <Modal open={modal === "batch"} onClose={() => setModal(null)} title="Register poultry batch"><form onSubmit={createBatch} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><FormField label="Batch ID" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })} required /><SelectField label="Kind" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} options={[{ value: "Broilers", label: "Broilers" }, { value: "Layers", label: "Layers" }, { value: "Free-range", label: "Free-range" }, { value: "Turkeys", label: "Turkeys" }]} /><FormField label="Breed" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} required /><FormField label="Starting quantity" type="number" min="0" value={form.startingQuantity} onChange={e => setForm({ ...form, startingQuantity: e.target.value, currentQuantity: e.target.value })} required /><FormField label="Current quantity" type="number" min="0" value={form.currentQuantity} onChange={e => setForm({ ...form, currentQuantity: e.target.value })} /><FormField label="Average weight (kg)" type="number" step="0.01" min="0" value={form.averageWeightKg} onChange={e => setForm({ ...form, averageWeightKg: e.target.value })} /><FormField label="Feed used (kg)" type="number" step="0.1" min="0" value={form.feedKg} onChange={e => setForm({ ...form, feedKg: e.target.value })} /><FormField label="Expected sale date" type="date" value={form.expectedSaleDate} onChange={e => setForm({ ...form, expectedSaleDate: e.target.value })} /></div><div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button><Button type="submit">Save batch</Button></div></form></Modal>
    <Modal open={modal === "event"} onClose={() => setModal(null)} title={`Record event · ${selected?.batchId || ""}`}><form onSubmit={recordEvent} className="space-y-4"><SelectField label="Event" value={event.eventType} onChange={e => setEvent({ ...event, eventType: e.target.value, mortalityDelta: e.target.value === "mortality" ? "1" : "0" })} options={[{ value: "mortality", label: "Mortality" }, { value: "feed", label: "Feed usage" }, { value: "weight", label: "Weight check" }, { value: "production", label: "Production / harvest" }, { value: "vaccination", label: "Vaccination" }, { value: "sale", label: "Sale / close batch" }]} /><div className="grid gap-3 sm:grid-cols-2"><FormField label="Birds added/removed" type="number" value={event.quantityDelta} onChange={e => setEvent({ ...event, quantityDelta: e.target.value })} /><FormField label="Mortality count" type="number" min="0" value={event.mortalityDelta} onChange={e => setEvent({ ...event, mortalityDelta: e.target.value })} /><FormField label="Feed used (kg)" type="number" min="0" step="0.1" value={event.feedKg} onChange={e => setEvent({ ...event, feedKg: e.target.value })} /><FormField label="Average weight (kg)" type="number" min="0" step="0.01" value={event.averageWeightKg} onChange={e => setEvent({ ...event, averageWeightKg: e.target.value })} /></div><FormField label="Notes" value={event.notes} onChange={e => setEvent({ ...event, notes: e.target.value })} /><div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button><Button type="submit">Record event</Button></div></form></Modal>
  </div>;
}
