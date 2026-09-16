import { useEffect, useState } from "react";
import { Database, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { Button, Panel, PanelTitle, Stat } from "@/components/ui-kit";
import { PageHeading } from "@/components/farm-shell";

const api = (path: string) => `${(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}${path}`;

type DemoStatus = { active: boolean; counts: Record<string, number> };

export default function DemoDataPage() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch(api("/api/demo/status"), { credentials: "include" });
    if (!response.ok) throw new Error("Could not load demo status");
    setStatus(await response.json());
  };

  useEffect(() => { void load().catch(() => setMessage("Could not connect to the farm API.")); }, []);

  const seed = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(api("/api/demo/seed"), { method: "POST", credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not create demo data");
      setMessage(body.message); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create demo data"); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (!window.confirm("Remove only the tagged demo dataset from this farm? Real farm records are not targeted.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(api("/api/demo"), { method: "DELETE", credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not reset demo data");
      setMessage(body.message); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reset demo data"); }
    finally { setBusy(false); }
  };

  const total = status ? Object.values(status.counts).reduce((sum, value) => sum + value, 0) : 0;

  return <div className="animate-rise space-y-5">
    <PageHeading eyebrow="Development tools" title="Demo data" detail="Load a realistic, clearly tagged demonstration dataset for the active farm before entering real farm records." action={<Button variant="ghost" onClick={() => void load()} disabled={busy}><RefreshCw size={15} />Refresh</Button>} />
    <Panel className="p-5">
      <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.18)] text-[hsl(var(--primary))]"><Database size={20} /></div><div><PanelTitle eyebrow="Safe test data" title={status?.active ? "Demo dataset is loaded" : "No demo dataset loaded"} /><p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">Demo animals, inventory, tasks, finance and operational records are explicitly marked. Reset removes only those tagged demo records for the active farm.</p></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Demo records" value={total} /><Stat label="Goats" value={status?.counts.goats ?? 0} /><Stat label="Poultry batches" value={status?.counts.poultry ?? 0} /><Stat label="Farm operations" value={status?.counts.records ?? 0} /></div>
      <div className="mt-6 flex flex-wrap gap-2"><Button onClick={()=>void seed()} disabled={busy || Boolean(status?.active)}><Database size={15} />Load demo dataset</Button><Button variant="ghost" onClick={()=>void reset()} disabled={busy || !status?.active}><RotateCcw size={15} />Reset demo data</Button></div>
      {message && <div className="mt-4 rounded-xl bg-[hsl(var(--muted))] p-3 text-xs">{message}</div>}
    </Panel>
    <Panel className="p-5"><div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 text-[hsl(var(--primary))]" /><div><h2 className="font-semibold">Production safety rule</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">This tool never clears the farm database. The reset operation targets only records created by the demo lifecycle in the active farm.</p></div></div></Panel>
  </div>;
}
