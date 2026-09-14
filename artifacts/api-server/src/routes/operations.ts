import { asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, farmRecordsTable, farmZonesTable, financeTransactionsTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();

const allowedTypes = new Set([
  "pig", "pig_event", "fish", "fish_water_quality", "field", "crop", "crop_activity",
  "home_garden", "garden_bed", "greenhouse", "orchard_tree", "water_tank",
  "water_usage", "irrigation", "health", "crop_health", "sale", "expense",
  "equipment", "compost", "resource_transfer", "calendar", "production",
  "mortality", "weight", "egg_collection", "feed_record", "maintenance",
  "biosecurity", "visitor", "sensor", "setting",
]);

const asNumber = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
function cleanRecord(record: typeof farmRecordsTable.$inferSelect) {
  return { ...record, data: record.data ?? {}, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}

router.get("/operations", async (req, res): Promise<void> => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const records = await db.select().from(farmRecordsTable).orderBy(desc(farmRecordsTable.recordDate), desc(farmRecordsTable.id)).limit(limit);
  res.json(records.filter((r) => !type || r.recordType === type).map(cleanRecord));
});

router.get("/operations/summary", async (_req, res): Promise<void> => {
  const records = await db.select().from(farmRecordsTable); const finance = await db.select().from(financeTransactionsTable);
  const water = records.filter((r) => r.recordType === "water_tank").sort((a, b) => b.id - a.id)[0]; const waterData = water?.data ?? {};
  const capacity = asNumber(waterData.capacityLitres); const current = asNumber(waterData.currentLitres);
  const revenue = finance.filter((x) => x.type === "income").reduce((s, x) => s + asNumber(x.amount), 0); const expenses = finance.filter((x) => x.type === "expense").reduce((s, x) => s + asNumber(x.amount), 0);
  const counts = records.reduce<Record<string, number>>((acc, record) => { acc[record.recordType] = (acc[record.recordType] ?? 0) + 1; return acc; }, {});
  res.json({ counts, water: { tankName: water?.name ?? "5,000L JoJo tank", capacityLitres: capacity, currentLitres: current, percentFull: capacity ? Math.round((current / capacity) * 100) : 0 }, finance: { revenue, expenses, profit: revenue - expenses }, recent: records.slice(0, 12).map(cleanRecord) });
});

router.get("/operations/calendar", async (req, res): Promise<void> => {
  const from = typeof req.query.from === "string" ? req.query.from : "0000-01-01"; const to = typeof req.query.to === "string" ? req.query.to : "9999-12-31";
  const [records, tasks] = await Promise.all([db.select().from(farmRecordsTable).orderBy(asc(farmRecordsTable.recordDate)), db.select().from(tasksTable).orderBy(asc(tasksTable.dueDate))]);
  res.json({ records: records.filter((r) => r.recordDate && r.recordDate >= from && r.recordDate <= to).map(cleanRecord), tasks: tasks.filter((t) => t.dueDate >= from && t.dueDate <= to) });
});

router.post("/operations/bootstrap", async (_req, res): Promise<void> => {
  const [existing, existingZones] = await Promise.all([db.select({ id: farmRecordsTable.id }).from(farmRecordsTable).limit(1), db.select({ id: farmZonesTable.id }).from(farmZonesTable).limit(1)]);
  if (existing.length || existingZones.length) { res.json({ created: false, message: "Farm setup already contains records." }); return; }
  const setup = [
    ["water_tank", "5,000L JoJo Tank", "Active", "Water", { capacityLitres: 5000, source: "Manual entry required" }],
    ["pig", "Piggery", "Planned", "Piggery", { entityType: "structure", dimensions: "10m × 20m", purpose: "Breeding and growing pigs" }],
    ["fish", "Fish Tank 1", "Planned", "Fish", { entityType: "structure", dimensions: "10m × 10m", species: "Not stocked", numberStocked: 0 }],
    ["fish", "Fish Tank 2", "Planned", "Fish", { entityType: "structure", dimensions: "10m × 10m", species: "Not stocked", numberStocked: 0 }],
    ["field", "Field 1", "Active", "Field Crops", { area: 0, unit: "ha", irrigation: false }], ["field", "Field 2", "Planned", "Field Crops", { area: 0, unit: "ha", irrigation: false }],
    ["home_garden", "Home Garden", "Active", "Home Garden", { purpose: "Household consumption" }], ["garden_bed", "Commercial Vegetable Garden", "Planned", "Commercial Garden", { beds: 4, bedDimensions: "100m × 1.5m" }],
    ["greenhouse", "Future Greenhouse", "Planned", "Greenhouse", { dimensions: null }], ["orchard_tree", "Orchard", "Planned", "Orchard", { treeCount: 0 }], ["equipment", "Farm Equipment Register", "Active", "Infrastructure", {}], ["compost", "Compost / Manure Area", "Planned", "Resources", {}],
  ] as const;
  await db.insert(farmRecordsTable).values(setup.map(([recordType, name, status, farmUnit, data]) => ({ recordType, name, status, farmUnit, data })));
  await db.insert(farmZonesTable).values([
    { name: "Farmhouse", type: "Infrastructure", dimensions: "Existing", status: "Active", accent: "sage" }, { name: "Water Source", type: "Water", dimensions: "Configure location", status: "Active", accent: "blue" }, { name: "5,000L JoJo Tank", type: "Water", dimensions: "5,000L", status: "Active", accent: "blue" },
    { name: "Free-range Chicken Area", type: "Livestock", dimensions: "10m × 20m", status: "Active", accent: "gold" }, { name: "Broiler Area", type: "Livestock", dimensions: "9m × 20m", status: "Active", accent: "gold" }, { name: "Piggery", type: "Livestock", dimensions: "10m × 20m", status: "Planned", accent: "gold" },
    { name: "Goat Paddock 1", type: "Livestock", dimensions: "Configure", status: "Active", accent: "sage" }, { name: "Goat Paddock 2", type: "Livestock", dimensions: "Configure", status: "Active", accent: "sage" }, { name: "Fish Tank 1", type: "Aquaculture", dimensions: "10m × 10m", status: "Planned", accent: "blue" }, { name: "Fish Tank 2", type: "Aquaculture", dimensions: "10m × 10m", status: "Planned", accent: "blue" },
    { name: "Field Crops", type: "Crops", dimensions: "Configure", status: "Active", accent: "green" }, { name: "Home Garden", type: "Garden", dimensions: "Configure", status: "Active", accent: "green" }, { name: "Commercial Vegetable Garden", type: "Garden", dimensions: "4 × 100m × 1.5m beds", status: "Planned", accent: "green" }, { name: "Future Greenhouse", type: "Greenhouse", dimensions: "Configure", status: "Planned", accent: "green" }, { name: "Orchard", type: "Orchard", dimensions: "Configure", status: "Planned", accent: "green" }, { name: "Compost / Manure", type: "Resources", dimensions: "Configure", status: "Planned", accent: "sage" },
  ]);
  res.status(201).json({ created: true, message: "Boroma Hills operating structure created." });
});

router.post("/operations", async (req, res): Promise<void> => {
  const { recordType, name, status = "Active", farmUnit = "General", recordDate = null, data = {} } = req.body ?? {};
  if (typeof recordType !== "string" || !allowedTypes.has(recordType)) { res.status(400).json({ error: "Unsupported or missing recordType." }); return; }
  if (recordType === "pig" || recordType === "pig_event") { res.status(400).json({ error: "Use Pig Management for pig registers and events." }); return; }
  if (typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "name is required." }); return; }
  if (recordDate !== null && typeof recordDate !== "string") { res.status(400).json({ error: "recordDate must be a date string." }); return; }
  if (data && typeof data !== "object") { res.status(400).json({ error: "data must be an object." }); return; }
  const payload: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  if (recordType === "sale" || recordType === "expense") {
    const amount = asNumber(payload.amount); if (amount <= 0) { res.status(400).json({ error: "Financial amount must be greater than zero." }); return; }
    const [finance] = await db.insert(financeTransactionsTable).values({ type: recordType === "sale" ? "income" : "expense", category: String(payload.category ?? "Other"), farmUnit: String(payload.farmUnit ?? farmUnit), description: name.trim(), amount: String(amount), transactionDate: recordDate ?? new Date().toISOString().slice(0, 10), counterparty: payload.counterparty ? String(payload.counterparty) : null }).returning({ id: financeTransactionsTable.id });
    payload.financeId = finance.id;
  }
  const [record] = await db.insert(farmRecordsTable).values({ recordType, name: name.trim(), status: String(status), farmUnit: String(farmUnit), recordDate, data: payload }).returning();
  res.status(201).json(cleanRecord(record));
});

router.patch("/operations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id); if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid record id." }); return; }
  const [current] = await db.select().from(farmRecordsTable).where(eq(farmRecordsTable.id, id)); if (!current) { res.status(404).json({ error: "Record not found." }); return; }
  const nextData = req.body?.data ? { ...(current.data ?? {}), ...req.body.data } : current.data;
  const [updated] = await db.update(farmRecordsTable).set({ name: req.body?.name ?? current.name, status: req.body?.status ?? current.status, farmUnit: req.body?.farmUnit ?? current.farmUnit, recordDate: req.body?.recordDate ?? current.recordDate, data: nextData, updatedAt: new Date() }).where(eq(farmRecordsTable.id, id)).returning();
  const financeId = (nextData as any)?.financeId;
  if ((current.recordType === "sale" || current.recordType === "expense") && typeof financeId === "number") await db.update(financeTransactionsTable).set({ amount: String(asNumber((nextData as any).amount)), category: String((nextData as any).category ?? "Other"), farmUnit: String((nextData as any).farmUnit ?? current.farmUnit), description: updated.name, transactionDate: updated.recordDate ?? new Date().toISOString().slice(0, 10), counterparty: (nextData as any).counterparty ? String((nextData as any).counterparty) : null }).where(eq(financeTransactionsTable.id, financeId));
  res.json(cleanRecord(updated));
});

router.delete("/operations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id); const [current] = await db.select().from(farmRecordsTable).where(eq(farmRecordsTable.id, id)); if (!current) { res.status(404).json({ error: "Record not found." }); return; }
  const financeId = (current.data as any)?.financeId; if ((current.recordType === "sale" || current.recordType === "expense") && typeof financeId === "number") await db.delete(financeTransactionsTable).where(eq(financeTransactionsTable.id, financeId));
  await db.delete(farmRecordsTable).where(eq(farmRecordsTable.id, id)); res.status(204).send();
});

export default router;
