import { Router, type IRouter } from "express";
import { desc, eq, and } from "drizzle-orm";
import { db, farmRecordsTable, poultryFlocksTable } from "@workspace/db";

const router: IRouter = Router();

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

router.get("/api/poultry-management", async (_req, res) => {
  try {
    const flocks = await db.select().from(poultryFlocksTable).orderBy(desc(poultryFlocksTable.id));
    res.json(flocks);
  } catch (error) {
    console.error("Failed to list poultry batches", error);
    res.status(500).json({ error: "Failed to list poultry batches" });
  }
});

router.post("/api/poultry-management", async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.batchId || !body.kind || !body.breed) {
      return res.status(400).json({ error: "batchId, kind and breed are required" });
    }
    const startingQuantity = Math.max(0, Math.trunc(toNumber(body.startingQuantity)));
    const currentQuantity = Math.max(0, Math.trunc(toNumber(body.currentQuantity, startingQuantity)));
    const mortality = Math.max(0, Math.trunc(toNumber(body.mortality)));
    const [flock] = await db.insert(poultryFlocksTable).values({
      batchId: String(body.batchId).trim(),
      kind: String(body.kind).trim(),
      breed: String(body.breed).trim(),
      startingQuantity,
      currentQuantity,
      mortality,
      averageWeightKg: body.averageWeightKg == null || body.averageWeightKg === "" ? null : String(body.averageWeightKg),
      feedKg: String(toNumber(body.feedKg)),
      status: String(body.status || "Active"),
      expectedSaleDate: body.expectedSaleDate || null,
    }).returning();
    res.status(201).json(flock);
  } catch (error) {
    console.error("Failed to create poultry batch", error);
    res.status(500).json({ error: "Failed to create poultry batch" });
  }
});

router.patch("/api/poultry-management/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid batch id" });
    const body = req.body ?? {};
    const values: Record<string, unknown> = {};
    if (body.batchId !== undefined) values.batchId = String(body.batchId).trim();
    if (body.kind !== undefined) values.kind = String(body.kind).trim();
    if (body.breed !== undefined) values.breed = String(body.breed).trim();
    for (const key of ["startingQuantity", "currentQuantity", "mortality"] as const) {
      if (body[key] !== undefined) values[key] = Math.max(0, Math.trunc(toNumber(body[key])));
    }
    if (body.averageWeightKg !== undefined) values.averageWeightKg = body.averageWeightKg === "" ? null : String(body.averageWeightKg);
    if (body.feedKg !== undefined) values.feedKg = String(Math.max(0, toNumber(body.feedKg)));
    if (body.status !== undefined) values.status = String(body.status);
    if (body.expectedSaleDate !== undefined) values.expectedSaleDate = body.expectedSaleDate || null;
    const [flock] = await db.update(poultryFlocksTable).set(values).where(eq(poultryFlocksTable.id, id)).returning();
    if (!flock) return res.status(404).json({ error: "Poultry batch not found" });
    res.json(flock);
  } catch (error) {
    console.error("Failed to update poultry batch", error);
    res.status(500).json({ error: "Failed to update poultry batch" });
  }
});

router.delete("/api/poultry-management/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid batch id" });
    await db.delete(poultryFlocksTable).where(eq(poultryFlocksTable.id, id));
    await db.delete(farmRecordsTable).where(and(eq(farmRecordsTable.recordType, "poultry_event"), eq(farmRecordsTable.data, { flockId: id })));
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete poultry batch", error);
    res.status(500).json({ error: "Failed to delete poultry batch" });
  }
});

router.get("/api/poultry-management/:id/history", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid batch id" });
    const rows = await db.select().from(farmRecordsTable).where(eq(farmRecordsTable.recordType, "poultry_event")).orderBy(desc(farmRecordsTable.recordDate), desc(farmRecordsTable.id));
    res.json(rows.filter((row) => Number((row.data as Record<string, unknown>)?.flockId) === id));
  } catch (error) {
    console.error("Failed to load poultry history", error);
    res.status(500).json({ error: "Failed to load poultry history" });
  }
});

router.post("/api/poultry-management/:id/events", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid batch id" });
    const [flock] = await db.select().from(poultryFlocksTable).where(eq(poultryFlocksTable.id, id));
    if (!flock) return res.status(404).json({ error: "Poultry batch not found" });
    const body = req.body ?? {};
    const eventType = String(body.eventType || "note");
    const quantityDelta = toNumber(body.quantityDelta);
    const mortalityDelta = Math.max(0, Math.trunc(toNumber(body.mortalityDelta)));
    const currentQuantity = Math.max(0, flock.currentQuantity + Math.trunc(quantityDelta) - mortalityDelta);
    const mortality = Math.max(0, flock.mortality + mortalityDelta);
    const feedDelta = Math.max(0, toNumber(body.feedKg));
    const [updated] = await db.update(poultryFlocksTable).set({ currentQuantity, mortality, feedKg: String(toNumber(flock.feedKg) + feedDelta), averageWeightKg: body.averageWeightKg ? String(body.averageWeightKg) : flock.averageWeightKg }).where(eq(poultryFlocksTable.id, id)).returning();
    const [event] = await db.insert(farmRecordsTable).values({
      recordType: "poultry_event",
      name: `${flock.batchId} · ${eventType}`,
      status: "Recorded",
      farmUnit: "Poultry",
      recordDate: body.recordDate || new Date().toISOString().slice(0, 10),
      data: { flockId: id, eventType, quantityDelta, mortalityDelta, feedKg: feedDelta, notes: body.notes || "", value: body.value ?? null },
    }).returning();
    res.status(201).json({ flock: updated, event });
  } catch (error) {
    console.error("Failed to record poultry event", error);
    res.status(500).json({ error: "Failed to record poultry event" });
  }
});

export default router;
