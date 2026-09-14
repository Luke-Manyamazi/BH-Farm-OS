import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, ChevronRight, Droplets, Fish, Leaf, Plus, RefreshCw, Trash2, Tractor, TreePine, Waves, Wheat, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { Button, EmptyState, ErrorState, Loading, Modal, Panel, PanelTitle, SelectField, Stat } from "@/components/ui-kit";
import { PageHeading } from "@/components/farm-shell";

type RecordItem = {
  id: number;
  recordType: string;
  name: string;
  status: string;
  farmUnit: string;
  recordDate: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type Field = { key: string; label: string; type?: "text" | "number" | "date"; placeholder?: string };

type Module = {
  type: string;
  label: string;
  description: string;
  icon: typeof Tractor;
  fields: Field[];
};

const modules: Module[] = [
  { type: "pig", label: "Pigs", description: "Breeding and growing/fattening pig records.", icon: Tractor, fields: [
    { key: "pigId", label: "Pig ID" }, { key: "sex", label: "Sex" }, { key: "breed", label: "Breed" }, { key: "birthDate", label: "Birth date", type: "date" }, { key: "weightKg", label: "Current weight (kg)", type: "number" }, { key: "pen", label: "Pen" }, { key: "health", label: "Health" }, { key: "notes", label: "Notes" },
  ] },
  { type: "fish", label: "Fish", description: "Fish tanks, stocking, growth, harvest and costs.", icon: Fish, fields: [
    { key: "tankId", label: "Tank ID" }, { key: "dimensions", label: "Dimensions", placeholder: "10m × 10m" }, { key: "species", label: "Species" }, { key: "stockingDate", label: "Stocking date", type: "date" }, { key: "numberStocked", label: "Number stocked", type: "number" }, { key: "currentNumber", label: "Estimated current number", type: "number" }, { key: "averageWeightKg", label: "Average weight (kg)", type: "number" }, { key: "notes", label: "Notes" },
  ] },
  { type: "fish_water_quality", label: "Fish water", description: "Manual water-quality readings with future sensor support.", icon: Waves, fields: [
    { key: "tank", label: "Tank" }, { key: "temperatureC", label: "Temperature (°C)", type: "number" }, { key: "ph", label: "pH", type: "number" }, { key: "dissolvedOxygen", label: "Dissolved oxygen", type: "number" }, { key: "ammonia", label: "Ammonia", type: "number" }, { key: "waterLevel", label: "Water level" }, { key: "clarity", label: "Water clarity" }, { key: "notes", label: "Notes" },
  ] },
  { type: "field", label: "Fields", description: "Field/plot register for crop production.", icon: Wheat, fields: [
    { key: "fieldId", label: "Field ID" }, { key: "area", label: "Area", type: "number" }, { key: "unit", label: "Area unit", placeholder: "ha / m²" }, { key: "soilType", label: "Soil type" }, { key: "irrigation", label: "Irrigation availability" }, { key: "currentCrop", label: "Current crop" }, { key: "previousCrop", label: "Previous crop" }, { key: "location", label: "GPS/location" },
  ] },
  { type: "crop", label: "Crop cycles", description: "Planting, inputs, harvest, yield and profitability.", icon: Leaf, fields: [
    { key: "crop", label: "Crop" }, { key: "variety", label: "Variety" }, { key: "field", label: "Field" }, { key: "plantingDate", label: "Planting date", type: "date" }, { key: "expectedHarvestDate", label: "Expected harvest", type: "date" }, { key: "seedQuantity", label: "Seed quantity", type: "number" }, { key: "inputCost", label: "Input cost", type: "number" }, { key: "harvestQuantity", label: "Harvest quantity", type: "number" }, { key: "harvestUnit", label: "Harvest unit" }, { key: "quality", label: "Quality" },
  ] },
  { type: "crop_activity", label: "Crop activities", description: "Land preparation, planting, irrigation, weeding, scouting and harvest.", icon: Leaf, fields: [
    { key: "activity", label: "Activity" }, { key: "field", label: "Field" }, { key: "crop", label: "Crop" }, { key: "operator", label: "Operator" }, { key: "notes", label: "Notes" },
  ] },
  { type: "home_garden", label: "Home garden", description: "Household food production separate from commercial production.", icon: Wheat, fields: [
    { key: "crop", label: "Crop" }, { key: "area", label: "Area", type: "number" }, { key: "quantityPlanted", label: "Quantity planted", type: "number" }, { key: "harvest", label: "Harvest quantity", type: "number" }, { key: "householdConsumption", label: "Household consumption", type: "number" }, { key: "quantitySold", label: "Quantity sold", type: "number" }, { key: "notes", label: "Notes" },
  ] },
  { type: "garden_bed", label: "Commercial garden", description: "Commercial vegetable beds and production economics.", icon: Wheat, fields: [
    { key: "bed", label: "Bed" }, { key: "crop", label: "Crop" }, { key: "variety", label: "Variety" }, { key: "dimensions", label: "Bed dimensions", placeholder: "100m × 1.5m" }, { key: "plantingDate", label: "Planting date", type: "date" }, { key: "quantityPlanted", label: "Quantity planted", type: "number" }, { key: "inputCost", label: "Input cost", type: "number" }, { key: "harvest", label: "Harvest", type: "number" },
  ] },
  { type: "greenhouse", label: "Greenhouse", description: "Future greenhouse projects can be planned now and activated later.", icon: Leaf, fields: [
    { key: "dimensions", label: "Dimensions" }, { key: "area", label: "Area", type: "number" }, { key: "crop", label: "Crop" }, { key: "variety", label: "Variety" }, { key: "plantingDate", label: "Planting date", type: "date" }, { key: "plants", label: "Number of plants", type: "number" }, { key: "temperature", label: "Temperature" }, { key: "humidity", label: "Humidity" },
  ] },
  { type: "orchard_tree", label: "Orchard", description: "Individual tree register and annual production.", icon: TreePine, fields: [
    { key: "treeId", label: "Tree ID" }, { key: "species", label: "Species" }, { key: "variety", label: "Variety" }, { key: "plantingDate", label: "Planting date", type: "date" }, { key: "location", label: "Location" }, { key: "rootstock", label: "Rootstock" }, { key: "fruitProduction", label: "Fruit production", type: "number" }, { key: "notes", label: "Notes" },
  ] },
  { type: "water_tank", label: "Water tanks", description: "Storage capacity and current water level.", icon: Droplets, fields: [
    { key: "capacityLitres", label: "Capacity (L)", type: "number" }, { key: "currentLitres", label: "Current level (L)", type: "number" }, { key: "source", label: "Water source" }, { key: "notes", label: "Notes" },
  ] },
  { type: "water_usage", label: "Water usage", description: "Record irrigation, livestock, fish and household water use.", icon: Droplets, fields: [
    { key: "usageType", label: "Usage type" }, { key: "litres", label: "Litres", type: "number" }, { key: "source", label: "Source" }, { key: "operator", label: "Operator" }, { key: "notes", label: "Notes" },
  ] },
  { type: "irrigation", label: "Irrigation", description: "Manual irrigation records ready for future automation.", icon: Droplets, fields: [
    { key: "target", label: "Field / garden / greenhouse / orchard" }, { key: "method", label: "Method", placeholder: "Hose / drip / sprinkler" }, { key: "startTime", label: "Start time" }, { key: "durationMinutes", label: "Duration (minutes)", type: "number" }, { key: "estimatedLitres", label: "Estimated litres", type: "number" }, { key: "operator", label: "Operator" }, { key: "notes", label: "Notes" },
  ] },
  { type: "health", label: "Animal health", description: "Vaccination, deworming, treatment, injury and inspection records.", icon: Tractor, fields: [
    { key: "animalOrFlock", label: "Animal / flock / batch" }, { key: "eventType", label: "Event type" }, { key: "treatment", label: "Treatment / medication" }, { key: "dosage", label: "Dosage" }, { key: "cost", label: "Cost", type: "number" }, { key: "followUpDate", label: "Follow-up date", type: "date" }, { key: "notes", label: "Notes" },
  ] },
  { type: "crop_health", label: "Crop health", description: "Pest, disease and crop observations.", icon: Leaf, fields: [
    { key: "field", label: "Field" }, { key: "crop", label: "Crop" }, { key: "observation", label: "Observation" }, { key: "pest", label: "Pest" }, { key: "disease", label: "Disease" }, { key: "severity", label: "Severity" }, { key: "followUpDate", label: "Follow-up date", type: "date" },
  ] },
  { type: "sale", label: "Sales", description: "Sales are mirrored into finance income automatically.", icon: CircleDollarIcon, fields: [
    { key: "amount", label: "Total amount", type: "number" }, { key: "category", label: "Product / category" }, { key: "quantity", label: "Quantity", type: "number" }, { key: "unit", label: "Unit" }, { key: "unitPrice", label: "Unit price", type: "number" }, { key: "counterparty", label: "Customer" }, { key: "paymentStatus", label: "Payment status" }, { key: "paymentMethod", label: "Payment method" }, { key: "notes", label: "Notes" },
  ] },
  { type: "expense", label: "Expenses", description: "Farm expenses are mirrored into finance automatically.", icon: CircleDollarIcon, fields: [
    { key: "amount", label: "Amount", type: "number" }, { key: "category", label: "Expense category" }, { key: "counterparty", label: "Supplier / payee" }, { key: "paymentMethod", label: "Payment method" }, { key: "reference", label: "Reference" }, { key: "notes", label: "Notes" },
  ] },
  { type: "equipment", label: "Equipment", description: "Pumps, hoses, tools, solar and other farm assets.", icon: Wrench, fields: [
    { key: "assetId", label: "Asset ID" }, { key: "category", label: "Category" }, { key: "purchaseDate", label: "Purchase date", type: "date" }, { key: "purchasePrice", label: "Purchase price", type: "number" }, { key: "location", label: "Location" }, { key: "condition", label: "Condition" }, { key: "nextMaintenance", label: "Next maintenance", type: "date" }, { key: "notes", label: "Notes" },
  ] },
  { type: "compost", label: "Compost & manure", description: "Move nutrients from livestock and crop residues back into production.", icon: Wheat, fields: [
    { key: "source", label: "Source" }, { key: "quantity", label: "Quantity", type: "number" }, { key: "storageLocation", label: "Storage / compost location" }, { key: "intendedUse", label: "Intended use" }, { key: "destination", label: "Destination" }, { key: "notes", label: "Notes" },
  ] },
  { type: "resource_transfer", label: "Resource transfers", description: "Track flows such as piggery → compost → vegetable garden.", icon: Wheat, fields: [
    { key: "source", label: "From" }, { key: "destination", label: "To" }, { key: "resource", label: "Resource" }, { key: "quantity", label: "Quantity", type: "number" }, { key: "unit", label: "Unit" }, { key: "notes", label: "Notes" },
  ] },
];

function CircleDollarIcon(props: { size?: number }) { return <span className="inline-flex" {...props}>$</span>; }

const api = (path: string) => `${(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}${path}`;

export function FarmOperationsPage({ defaultType }: { defaultType?: string }) {
  const [location] = useLocation();
  const routeType = defaultType || modules.find((m) => `/${m.type}` === location)?.type;
  const [activeType, setActiveType] = useState(routeType || "pig");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [bootstrapping, setBootstrapping] = useState(false);

  const active = modules.find((m) => m.type === activeType) || modules[0];

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(api(`/api/operations?type=${encodeURIComponent(active.type)}`));
      if (!response.ok) throw new Error("Failed to load records");
      setRecords(await response.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [active.type]);

  const allModulesCount = useMemo(() => modules.length, []);

  const bootstrap = async () => {
    setBootstrapping(true);
    setMessage("");
    try {
      const response = await fetch(api("/api/operations/bootstrap"), { method: "POST", headers: { "Content-Type": "application/json" } });
      const body = await response.json();
      setMessage(body.message || "Farm structure created.");
    } catch {
      setMessage("Could not create the farm operating structure.");
    } finally {
      setBootstrapping(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = {};
    for (const field of active.fields) {
      const value = form.get(field.key);
      if (value !== null && String(value).trim() !== "") data[field.key] = field.type === "number" ? Number(value) : String(value);
    }
    const payload = {
      recordType: active.type,
      name: String(form.get("name") || active.label),
      status: String(form.get("status") || "Active"),
      farmUnit: String(form.get("farmUnit") || active.label),
      recordDate: String(form.get("recordDate") || "") || null,
      data,
    };
    try {
      const response = await fetch(api("/api/operations"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }
      setModal(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save record.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    await fetch(api(`/api/operations/${id}`), { method: "DELETE" });
    await load();
  };

  return <div className="animate-rise space-y-5">
    <PageHeading eyebrow="Farm operations" title="Farm records" detail="The operational layer for pigs, fish, crops, water, gardens, orchard, health, sales, expenses and farm resources." action={<div className="flex gap-2"><Button variant="ghost" onClick={() => void load()}><RefreshCw size={15} /> Refresh</Button><Button onClick={() => setModal(true)}><Plus size={15} /> Add record</Button></div>} />

    <Panel className="overflow-hidden">
      <div className="flex gap-2 overflow-x-auto border-b border-[hsl(var(--border))] p-3 scrollbar-none">
        {modules.map((item) => { const Icon = item.icon; return <button key={item.type} onClick={() => setActiveType(item.type)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold ${activeType === item.type ? "bg-[hsl(var(--primary))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}><Icon size={14} />{item.label}</button>; })}
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Module {modules.findIndex((m) => m.type === active.type) + 1} of {allModulesCount}</div><h2 className="mt-1 font-[family-name:var(--app-font-serif)] text-2xl font-bold">{active.label}</h2><p className="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{active.description}</p></div><Button onClick={() => setModal(true)}><Plus size={15} /> Add {active.label.replace(/s$/, "").toLowerCase()}</Button></div>

        {active.type === "water_tank" && records[0] && <div className="mb-5 grid gap-3 sm:grid-cols-3"><Panel className="p-4"><Stat label="Capacity" value={`${Number(records[0].data.capacityLitres || 0).toLocaleString()} L`} /></Panel><Panel className="p-4"><Stat label="Current" value={`${Number(records[0].data.currentLitres || 0).toLocaleString()} L`} tone="green" /></Panel><Panel className="p-4"><Stat label="Level" value={`${Number(records[0].data.capacityLitres) ? Math.round(Number(records[0].data.currentLitres || 0) / Number(records[0].data.capacityLitres) * 100) : 0}%`} tone="gold" /></Panel></div>}

        {loading ? <Loading rows={4} /> : error ? <ErrorState onRetry={() => void load()} /> : records.length === 0 ? <EmptyState title={`No ${active.label.toLowerCase()} records yet`} detail="Add the first operational record. Nothing is invented or treated as real farm history." onAdd={() => setModal(true)} /> : <div className="space-y-2">{records.map((record) => <div key={record.id} className="rounded-2xl border border-[hsl(var(--border))] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{record.name}</h3><span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[9px] font-bold uppercase tracking-wide">{record.status}</span></div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{record.farmUnit}{record.recordDate ? ` · ${record.recordDate}` : ""}</div></div><button onClick={() => void remove(record.id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/.1)] hover:text-[hsl(var(--destructive))]" aria-label="Delete record"><Trash2 size={15} /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(record.data || {}).filter(([key]) => key !== "financeId").slice(0, 9).map(([key, value]) => <div key={key} className="rounded-xl bg-[hsl(var(--muted)/.55)] p-2.5"><div className="text-[9px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{key.replace(/[A-Z]/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase())}</div><div className="mt-1 text-xs font-semibold">{String(value)}</div></div>)}</div></div>)}</div>}
      </div>
    </Panel>

    <Panel className="p-4 sm:p-5"><PanelTitle eyebrow="Farm setup" title="Boroma Hills operating structure" action={<Button variant="ghost" onClick={() => void bootstrap()} disabled={bootstrapping}>{bootstrapping ? "Creating…" : "Create structure"}</Button>} /><p className="mt-3 max-w-3xl text-sm text-[hsl(var(--muted-foreground))]">Creates the non-financial farm structure: two goat paddocks, livestock areas, two fish tanks, fields, gardens, future greenhouse, orchard, water tank and resource areas. It does not invent financial history or animal records.</p>{message && <div className="mt-3 rounded-xl bg-[hsl(var(--muted))] p-3 text-xs font-medium">{message}</div>}</Panel>

    {modal && <Modal title={`Add ${active.label}`} onClose={() => setModal(false)}><form onSubmit={save} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Record name *</span><input name="name" required placeholder={`${active.label} record name`} className="h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none focus:border-[hsl(var(--primary))]" /></label><SelectField label="Status" name="status" options={["Active", "Planned", "Completed", "Sold", "Deceased", "Sick", "Quarantine", "Cancelled"]} /><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Farm unit</span><input name="farmUnit" defaultValue={active.label} className="h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Date</span><input name="recordDate" type="date" className="h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm" /></label></div><div className="grid gap-4 sm:grid-cols-2">{active.fields.map((field) => <label key={field.key} className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">{field.label}</span><input name={field.key} type={field.type || "text"} placeholder={field.placeholder} min={field.type === "number" ? "0" : undefined} className="h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none focus:border-[hsl(var(--primary))]" /></label>)}</div><div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4"><Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save record"}</Button></div></form></Modal>}
  </div>;
}
