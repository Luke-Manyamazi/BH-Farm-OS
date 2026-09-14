import { asc, desc } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, farmRecordsTable, financeTransactionsTable, goatsTable, poultryFlocksTable, inventoryItemsTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();
const n = (value: unknown) => { const valueAsNumber = Number(value); return Number.isFinite(valueAsNumber) ? valueAsNumber : 0; };
const active = (status: string) => !["Sold", "Deceased", "Cancelled"].includes(status);

async function records() {
  return db.select().from(farmRecordsTable).orderBy(desc(farmRecordsTable.recordDate), desc(farmRecordsTable.id));
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [goats, flocks, farm, inventory, finance, tasks] = await Promise.all([
    db.select().from(goatsTable), db.select().from(poultryFlocksTable), records(),
    db.select().from(inventoryItemsTable), db.select().from(financeTransactionsTable), db.select().from(tasksTable).orderBy(asc(tasksTable.dueDate), asc(tasksTable.dueTime)),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const operational = (type: string) => farm.filter((r) => r.recordType === type && active(r.status));
  const pigs = operational("pig").filter((r) => r.status !== "Sold");
  const fish = operational("fish");
  const crops = operational("crop").filter((r) => r.status !== "Completed");
  const orchard = operational("orchard_tree");
  const tank = operational("water_tank")[0];
  const water = tank?.data ?? {};
  const revenue = finance.filter((x) => x.type === "income").reduce((s, x) => s + n(x.amount), 0);
  const expenses = finance.filter((x) => x.type === "expense").reduce((s, x) => s + n(x.amount), 0);
  const openTasks = tasks.filter((t) => t.status !== "Completed");
  const alerts = [
    ...goats.filter((g) => g.expectedKiddingDate && active(g.status)).map((g) => ({ id: g.id, severity: "info", title: `${g.goatId} expected to kid`, detail: `${g.name} has an expected kidding date of ${g.expectedKiddingDate}.`, category: "Livestock", dueLabel: g.expectedKiddingDate === today ? "Today" : "Scheduled" })),
    ...inventory.filter((i) => n(i.quantity) <= n(i.minimumStock)).map((i) => ({ id: i.id + 2000, severity: "medium", title: `${i.name} stock is low`, detail: `${n(i.quantity)} ${i.unit} remaining; minimum is ${n(i.minimumStock)}.`, category: "Inventory", dueLabel: "Restock" })),
  ];
  const currentLitres = n(water.currentLitres); const capacityLitres = n(water.capacityLitres);
  res.json({
    farmName: "Boroma Hills Farm", location: "Zimbabwe",
    dateLabel: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date()),
    livestock: {
      total: goats.filter((g) => active(g.status)).length + flocks.reduce((s, f) => s + (active(f.status) ? f.currentQuantity : 0), 0) + pigs.length + fish.reduce((s, r) => s + n(r.data.currentNumber ?? r.data.numberStocked), 0),
      chickens: flocks.filter((f) => f.kind === "Free-range" && active(f.status)).reduce((s, f) => s + f.currentQuantity, 0),
      broilers: flocks.filter((f) => f.kind === "Broiler" && active(f.status)).reduce((s, f) => s + f.currentQuantity, 0),
      goats: goats.filter((g) => active(g.status)).length, pigs: pigs.length,
      fish: fish.reduce((s, r) => s + n(r.data.currentNumber ?? r.data.numberStocked), 0),
      pregnantGoats: goats.filter((g) => active(g.status) && g.pregnancyStatus === "Pregnant").length,
      sickAnimals: goats.filter((g) => active(g.status) && g.healthStatus !== "Good").length,
    },
    activeCropCycles: crops.length, orchardTrees: orchard.length,
    water: { tankName: tank?.name ?? "Water tank", currentLitres, capacityLitres, percentFull: capacityLitres ? Math.round(currentLitres / capacityLitres * 100) : 0, daysRemaining: 0 },
    lowStockItems: inventory.filter((i) => n(i.quantity) <= n(i.minimumStock)).length,
    tasksDueToday: openTasks.filter((t) => t.dueDate === today).length,
    overdueTasks: openTasks.filter((t) => t.dueDate < today).length,
    monthlyRevenue: revenue, monthlyExpenses: expenses, monthlyProfit: revenue - expenses,
    tasks: openTasks.slice(0, 6).map((t) => ({ ...t, completedAt: t.completedAt?.toISOString?.() ?? null })),
    alerts: alerts.slice(0, 6),
    recentActivity: farm.slice(0, 8).map((r) => ({ id: r.id, type: r.recordType, title: r.name, detail: r.farmUnit, timestamp: r.updatedAt.toISOString() })),
  });
});

router.get("/livestock/summary", async (_req, res): Promise<void> => {
  const [goats, flocks, farm] = await Promise.all([db.select().from(goatsTable), db.select().from(poultryFlocksTable), records()]);
  const pigs = farm.filter((r) => r.recordType === "pig" && active(r.status));
  const fish = farm.filter((r) => r.recordType === "fish" && active(r.status));
  const chickens = flocks.filter((f) => f.kind === "Free-range" && active(f.status)).reduce((s, f) => s + f.currentQuantity, 0);
  const broilers = flocks.filter((f) => f.kind === "Broiler" && active(f.status)).reduce((s, f) => s + f.currentQuantity, 0);
  const fishCount = fish.reduce((s, r) => s + n(r.data.currentNumber ?? r.data.numberStocked), 0);
  res.json({ total: goats.filter((g) => active(g.status)).length + chickens + broilers + pigs.length + fishCount, chickens, broilers, goats: goats.filter((g) => active(g.status)).length, pigs: pigs.length, fish: fishCount, pregnantGoats: goats.filter((g) => active(g.status) && g.pregnancyStatus === "Pregnant").length, sickAnimals: goats.filter((g) => active(g.status) && g.healthStatus !== "Good").length });
});

router.get("/zones", async (_req, res): Promise<void> => {
  const { farmZonesTable } = await import("@workspace/db");
  const zones = await db.select().from(farmZonesTable).orderBy(asc(farmZonesTable.id));
  res.json(zones);
});

router.get("/alerts", async (_req, res): Promise<void> => {
  const [goats, flocks, inventory, farm] = await Promise.all([db.select().from(goatsTable), db.select().from(poultryFlocksTable), db.select().from(inventoryItemsTable), records()]);
  const alerts = [
    ...goats.filter((g) => active(g.status) && g.expectedKiddingDate).map((g) => ({ id: g.id, severity: "info", title: `${g.goatId} expected to kid`, detail: `${g.name} is due on ${g.expectedKiddingDate}.`, category: "Livestock", dueLabel: "Scheduled" })),
    ...flocks.filter((f) => f.status === "Vaccination due").map((f) => ({ id: f.id + 1000, severity: "high", title: `${f.batchId} vaccination due`, detail: `${f.kind} batch needs a health check.`, category: "Livestock", dueLabel: "Due" })),
    ...inventory.filter((i) => n(i.quantity) <= n(i.minimumStock)).map((i) => ({ id: i.id + 2000, severity: "medium", title: `${i.name} stock is low`, detail: `${n(i.quantity)} ${i.unit} remaining; minimum is ${n(i.minimumStock)}.`, category: "Inventory", dueLabel: "Restock" })),
    ...farm.filter((r) => r.recordType === "crop_health" && active(r.status)).slice(0, 10).map((r) => ({ id: r.id + 3000, severity: String(r.data.severity ?? "medium").toLowerCase(), title: `${r.name} crop health observation`, detail: String(r.data.observation ?? "Crop health observation recorded."), category: "Crops", dueLabel: "Review" })),
  ];
  res.json(alerts);
});

export default router;
