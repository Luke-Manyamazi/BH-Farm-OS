import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, farmRecordsTable, goatsTable } from "@workspace/db";
import { mapGoat } from "../lib/farm-data";

const router: IRouter = Router();
const farmId = (req: any): string => req.farmContext?.farmId ?? (() => { throw new Error("Active farm context required"); })();

router.patch("/goat-management/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid goat id" }); return; }
  const allowed = ["name", "sex", "breed", "dateOfBirth", "currentWeightKg", "paddock", "status", "pregnancyStatus", "expectedKiddingDate", "healthStatus"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body ?? {}, key)) updates[key] = req.body[key] === "" ? null : req.body[key];
  if (updates.currentWeightKg != null) updates.currentWeightKg = String(updates.currentWeightKg);
  if (updates.pregnancyStatus === "Pregnant") updates.status = "Pregnant";
  else if (updates.status === "Pregnant") updates.status = "Active";
  const [goat] = await db.update(goatsTable).set(updates).where(and(eq(goatsTable.id, id), eq(goatsTable.farmId, farmId(req)))).returning();
  if (!goat) { res.status(404).json({ error: "Goat not found" }); return; }
  res.json(mapGoat(goat));
});

router.delete("/goat-management/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid goat id" }); return; }
  const [goat] = await db.delete(goatsTable).where(and(eq(goatsTable.id, id), eq(goatsTable.farmId, farmId(req)))).returning({ id: goatsTable.id });
  if (!goat) { res.status(404).json({ error: "Goat not found" }); return; }
  res.status(204).send();
});

router.get("/goat-management/:id/history", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid goat id" }); return; }
  const [goat] = await db.select({ goatId: goatsTable.goatId }).from(goatsTable).where(and(eq(goatsTable.id, id), eq(goatsTable.farmId, farmId(req))));
  if (!goat) { res.status(404).json({ error: "Goat not found" }); return; }
  const records = await db.select().from(farmRecordsTable).where(and(eq(farmRecordsTable.farmId, farmId(req)))).orderBy(desc(farmRecordsTable.recordDate), desc(farmRecordsTable.id));
  const history = records.filter((record) => { const data = (record.data ?? {}) as Record<string, unknown>; return data.goatId === goat.goatId || data.goatDbId === id; });
  res.json(history.map((record) => ({ id: record.id, recordType: record.recordType, name: record.name, status: record.status, farmUnit: record.farmUnit, recordDate: record.recordDate, data: record.data })));
});

router.post("/goat-management/:id/events", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid goat id" }); return; }
  const [goat] = await db.select({ goatId: goatsTable.goatId, name: goatsTable.name }).from(goatsTable).where(and(eq(goatsTable.id, id), eq(goatsTable.farmId, farmId(req))));
  if (!goat) { res.status(404).json({ error: "Goat not found" }); return; }
  const recordType = String(req.body?.recordType || "health");
  const recordDate = String(req.body?.recordDate || new Date().toISOString().slice(0, 10));
  const data = { ...(req.body?.data && typeof req.body.data === "object" ? req.body.data : {}), goatId: goat.goatId, goatDbId: id };
  const [record] = await db.insert(farmRecordsTable).values({ farmId: farmId(req), recordType, name: String(req.body?.name || `${goat.name} ${recordType}`), status: String(req.body?.status || "Recorded"), farmUnit: "Goats", recordDate, data }).returning();
  res.status(201).json(record);
});

export default router;
