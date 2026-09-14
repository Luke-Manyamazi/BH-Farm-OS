import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, farmRecordsTable, poultryFlocksTable } from "@workspace/db";

const router: IRouter = Router();

const n = (v: unknown, fallback = 0) => { const x = Number(v); return Number.isFinite(x) ? x : fallback; };

router.get("/poultry-management", async (_req, res) => {
  try { res.json(await db.select().from(poultryFlocksTable).orderBy(desc(poultryFlocksTable.id))); }
  catch (e) { console.error(e); res.status(500).json({ error: "Failed to list poultry batches" }); }
});

router.post("/poultry-management", async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.batchId || !b.kind || !b.breed) return res.status(400).json({ error: "batchId, kind and breed are required" });
    const start = Math.max(0, Math.trunc(n(b.startingQuantity)));
    const current = Math.max(0, Math.trunc(n(b.currentQuantity, start)));
    const [flock] = await db.insert(poultryFlocksTable).values({ batchId: String(b.batchId).trim(), kind: String(b.kind), breed: String(b.breed), startingQuantity: start, currentQuantity: current, mortality: Math.max(0, Math.trunc(n(b.mortality))), averageWeightKg: b.averageWeightKg ? String(b.averageWeightKg) : null, feedKg: String(n(b.feedKg)), status: String(b.status || "Active"), expectedSaleDate: b.expectedSaleDate || null }).returning();
    res.status(201).json(flock);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to create poultry batch" }); }
});

router.patch("/poultry-management/:id", async (req, res) => {
  try {
    const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid batch id" });
    const b = req.body ?? {}; const values: Record<string, unknown> = {};
    for (const k of ["batchId", "kind", "breed", "status"] as const) if (b[k] !== undefined) values[k] = String(b[k]);
    for (const k of ["startingQuantity", "currentQuantity", "mortality"] as const) if (b[k] !== undefined) values[k] = Math.max(0, Math.trunc(n(b[k])));
    if (b.averageWeightKg !== undefined) values.averageWeightKg = b.averageWeightKg === "" ? null : String(b.averageWeightKg);
    if (b.feedKg !== undefined) values.feedKg = String(Math.max(0, n(b.feedKg)));
    if (b.expectedSaleDate !== undefined) values.expectedSaleDate = b.expectedSaleDate || null;
    const [flock] = await db.update(poultryFlocksTable).set(values).where(eq(poultryFlocksTable.id, id)).returning();
    if (!flock) return res.status(404).json({ error: "Poultry batch not found" }); res.json(flock);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to update poultry batch" }); }
});

router.delete("/poultry-management/:id", async (req, res) => {
  try { const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid batch id" }); await db.delete(poultryFlocksTable).where(eq(poultryFlocksTable.id, id)); res.status(204).send(); }
  catch (e) { console.error(e); res.status(500).json({ error: "Failed to delete poultry batch" }); }
});

router.get("/poultry-management/:id/history", async (req, res) => {
  try { const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid batch id" }); const rows = await db.select().from(farmRecordsTable).where(eq(farmRecordsTable.recordType, "poultry_event")).orderBy(desc(farmRecordsTable.recordDate), desc(farmRecordsTable.id)); res.json(rows.filter(r => Number((r.data as Record<string, unknown>)?.flockId) === id)); }
  catch (e) { console.error(e); res.status(500).json({ error: "Failed to load poultry history" }); }
});

router.post("/poultry-management/:id/events", async (req, res) => {
  try {
    const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid batch id" });
    const [flock] = await db.select().from(poultryFlocksTable).where(eq(poultryFlocksTable.id, id)); if (!flock) return res.status(404).json({ error: "Poultry batch not found" });
    const b = req.body ?? {}; const eventType = String(b.eventType || "note"); const mortalityDelta = Math.max(0, Math.trunc(n(b.mortalityDelta))); const quantityDelta = Math.trunc(n(b.quantityDelta)); const feedDelta = Math.max(0, n(b.feedKg));
    const [updated] = await db.update(poultryFlocksTable).set({ currentQuantity: Math.max(0, flock.currentQuantity + quantityDelta - mortalityDelta), mortality: Math.max(0, flock.mortality + mortalityDelta), feedKg: String(n(flock.feedKg) + feedDelta), averageWeightKg: b.averageWeightKg ? String(b.averageWeightKg) : flock.averageWeightKg, status: eventType === "sale" ? "Closed" : flock.status }).where(eq(poultryFlocksTable.id, id)).returning();
    const [event] = await db.insert(farmRecordsTable).values({ recordType: "poultry_event", name: `${flock.batchId} · ${eventType}`, status: "Recorded", farmUnit: "Poultry", recordDate: String(b.recordDate || new Date().toISOString().slice(0, 10)), data: { flockId: id, eventType, quantityDelta, mortalityDelta, feedKg: feedDelta, averageWeightKg: b.averageWeightKg || null, notes: String(b.notes || "") } }).returning();
    res.status(201).json({ flock: updated, event });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to record poultry event" }); }
});

export default router;
