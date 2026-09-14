import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, farmRecordsTable } from "@workspace/db";

const router: IRouter = Router();
const number = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };

function clean(record: typeof farmRecordsTable.$inferSelect) {
  return { ...record, data: record.data ?? {}, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}
function animal(record: typeof farmRecordsTable.$inferSelect) {
  return record.recordType === "pig" && (record.data as Record<string, unknown> | null)?.entityType === "animal";
}

router.get("/pig-management", async (_req, res): Promise<void> => {
  const rows = await db.select().from(farmRecordsTable).orderBy(desc(farmRecordsTable.id));
  res.json(rows.filter(animal).map(clean));
});

router.post("/pig-management", async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (typeof body.name !== "string" || !body.name.trim()) { res.status(400).json({ error: "Pig name or ID is required." }); return; }
  const data = { ...(body.data ?? {}), entityType: "animal" } as Record<string, unknown>;
  if (data.weightKg !== undefined && number(data.weightKg) < 0) { res.status(400).json({ error: "Weight cannot be negative." }); return; }
  if (data.sex !== undefined && !["Male", "Female"].includes(String(data.sex))) { res.status(400).json({ error: "Sex must be Male or Female." }); return; }
  const [record] = await db.insert(farmRecordsTable).values({ recordType: "pig", name: body.name.trim(), status: String(body.status ?? "Active"), farmUnit: String(body.farmUnit ?? "Piggery"), recordDate: body.recordDate ? String(body.recordDate) : null, data }).returning();
  res.status(201).json(clean(record));
});

router.patch("/pig-management/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [current] = await db.select().from(farmRecordsTable).where(eq(farmRecordsTable.id, id));
  if (!current || !animal(current)) { res.status(404).json({ error: "Pig not found." }); return; }
  const data = { ...(current.data ?? {}), ...(req.body?.data ?? {}), entityType: "animal" } as Record<string, unknown>;
  if (data.weightKg !== undefined && number(data.weightKg) < 0) { res.status(400).json({ error: "Weight cannot be negative." }); return; }
  const [updated] = await db.update(farmRecordsTable).set({ name: req.body?.name ?? current.name, status: req.body?.status ?? current.status, farmUnit: req.body?.farmUnit ?? current.farmUnit, recordDate: req.body?.recordDate ?? current.recordDate, data, updatedAt: new Date() }).where(eq(farmRecordsTable.id, id)).returning();
  res.json(clean(updated));
});

router.delete("/pig-management/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [current] = await db.select().from(farmRecordsTable).where(eq(farmRecordsTable.id, id));
  if (!current || !animal(current)) { res.status(404).json({ error: "Pig not found." }); return; }
  await db.delete(farmRecordsTable).where(eq(farmRecordsTable.id, id));
  res.status(204).send();
});

router.post("/pig-management/:id/events", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [pig] = await db.select().from(farmRecordsTable).where(eq(farmRecordsTable.id, id));
  if (!pig || !animal(pig)) { res.status(404).json({ error: "Pig not found." }); return; }
  const eventType = String(req.body?.eventType ?? "").trim();
  const allowed = new Set(["health", "weight", "feed", "mortality", "breeding", "farrowing", "weaning", "sale"]);
  if (!allowed.has(eventType)) { res.status(400).json({ error: "Unsupported pig event type." }); return; }
  const eventData = { ...(req.body?.data ?? {}), pigDbId: id, pigId: (pig.data as Record<string, unknown> | null)?.pigId ?? pig.name, eventType };
  const [event] = await db.insert(farmRecordsTable).values({ recordType: "pig_event", name: `${pig.name} · ${eventType}`, status: "Recorded", farmUnit: pig.farmUnit, recordDate: req.body?.recordDate ? String(req.body.recordDate) : new Date().toISOString().slice(0, 10), data: eventData }).returning();
  if (eventType === "sale" || eventType === "mortality") await db.update(farmRecordsTable).set({ status: eventType === "sale" ? "Sold" : "Deceased", updatedAt: new Date() }).where(eq(farmRecordsTable.id, id));
  res.status(201).json(clean(event));
});

router.get("/pig-management/:id/history", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [pig] = await db.select().from(farmRecordsTable).where(eq(farmRecordsTable.id, id));
  if (!pig || !animal(pig)) { res.status(404).json({ error: "Pig not found." }); return; }
  const events = await db.select().from(farmRecordsTable).orderBy(desc(farmRecordsTable.recordDate), desc(farmRecordsTable.id));
  res.json(events.filter((r) => r.recordType === "pig_event" && number((r.data as Record<string, unknown> | null)?.pigDbId) === id).map(clean));
});

export default router;
