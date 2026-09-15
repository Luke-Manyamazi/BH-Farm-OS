import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, farmRecordsTable, financeTransactionsTable, goatsTable, poultryFlocksTable, inventoryItemsTable, tasksTable, farmZonesTable } from "@workspace/db";
import { resolveActiveFarm } from "../lib/farm-context";
import { getFinancePeriodRange, summarizeFinanceTransactions } from "../lib/finance-periods";

const router: IRouter = Router();
const n = (value: unknown) => { const valueAsNumber = Number(value); return Number.isFinite(valueAsNumber) ? valueAsNumber : 0; };
const active = (status: string) => !["Sold", "Deceased", "Cancelled"].includes(status);
const dataOf = (record: { data: unknown }) => (record.data ?? {}) as Record<string, unknown>;
const isPigAnimal = (record: { recordType: string; status: string; data: unknown }) => record.recordType === "pig" && dataOf(record).entityType === "animal" && active(record.status);

async function records(farmId: string) {
  return db.select().from(farmRecordsTable).where(eq(farmRecordsTable.farmId, farmId)).orderBy(desc(farmRecordsTable.recordDate), desc(farmRecordsTable.id));
}

function farmContextError(res: any, error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to resolve active farm";
  const status = message === "Authentication required" || message === "Session expired or invalid" ? 401 : 409;
  return res.status(status).json({ message });
}

router.get("/dashboard/summary", async (req, res, next): Promise<void> => {
  try {
    const context = await resolveActiveFarm(req);
    const [goats, flocks, farm, inventory, finance, tasks] = await Promise.all([
      db.select().from(goatsTable).where(eq(goatsTable.farmId, context.farmId)),
      db.select().from(poultryFlocksTable).where(eq(poultryFlocksTable.farmId, context.farmId)),
      records(context.farmId),
      db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.farmId, context.farmId)),
      db.select().from(financeTransactionsTable).where(eq(financeTransactionsTable.farmId, context.farmId)),
      db.select().from(tasksTable).where(eq(tasksTable.farmId, context.farmId)).orderBy(asc(tasksTable.dueDate), asc(tasksTable.dueTime)),
    ]);
    const today = getFinancePeriodRange("today", { timeZone: context.timezone }).start;
    const monthRange = getFinancePeriodRange("month", { timeZone: context.timezone });
    const financeSummary = summarizeFinanceTransactions(finance, monthRange, context.farmId);
    const operational = (type: string) => farm.filter((r) => r.recordType === type && active(r.status));
    const pigs = farm.filter(isPigAnimal);
    const fish = operational("fish").filter((r) => dataOf(r).entityType !== "structure");
    const crops = operational("crop").filter((r) => r.status !== "Completed");
    const orchard = operational("orchard_tree");
    const tank = operational("water_tank")[0];
    const water = tank?.data ?? {};
    const openTasks = tasks.filter((t) => t.status !== "Completed");
    const alerts = [
      ...goats.filter((g) => g.expectedKiddingDate && active(g.status)).map((g) => ({ id: g.id, severity: "info", title: `${g.goatId} expected to kid`, detail: `${g.name} has an expected kidding date of ${g.expectedKiddingDate}.`, category: "Livestock", dueLabel: g.expectedKiddingDate === today ? "Today" : "Scheduled" })),
      ...pigs.filter((p) => String(dataOf(p).health ?? "Good").toLowerCase() !== "good").map((p) => ({ id: p.id + 4000, severity: "high", title: `${p.name} needs health attention`, detail: `Health status: ${String(dataOf(p).health ?? "Review")}.`, category: "Livestock", dueLabel: "Review" })),
      ...inventory.filter((i) => n(i.quantity) <= n(i.minimumStock)).map((i) => ({ id: i.id + 2000, severity: "medium", title: `${i.name} stock is low`, detail: `${n(i.quantity)} ${i.unit} remaining; minimum is ${n(i.minimumStock)}.`, category: "Inventory", dueLabel: "Restock" })),
    ];
    const currentLitres = n((water as Record<string, unknown>).currentLitres);
    const capacityLitres = n((water as Record<string, unknown>).capacityLitres);
    res.json({
      farmName: context.farmName,
      location: String((farm.find((r) => r.recordType === "setting")?.data as Record<string, unknown> | undefined)?.location ?? ""),
      dateLabel: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: context.timezone }).format(new Date()),
      livestock: {
        total: goats.filter((g) => active(g.status)).length + flocks.reduce((s, f) => s + (active(f.status) ? f.currentQuantity : 0), 0) + pigs.length + fish.reduce((s, r) => s + n(dataOf(r).currentNumber ?? dataOf(r).numberStocked), 0),
        chickens: flocks.filter((f) => f.kind === "Free-range" && active(f.status)).reduce((s, f) => s + f.currentQuantity, 0),
        broilers: flocks.filter((f) => f.kind === "Broiler" && active(f.status)).reduce((s, f) => s + f.currentQuantity, 0),
        goats: goats.filter((g) => active(g.status)).length,
        pigs: pigs.length,
        fish: fish.reduce((s, r) => s + n(dataOf(r).currentNumber ?? dataOf(r).numberStocked), 0),
        pregnantGoats: goats.filter((g) => active(g.status) && g.pregnancyStatus === "Pregnant").length,
        sickAnimals: goats.filter((g) => active(g.status) && g.healthStatus !== "Good").length + pigs.filter((p) => String(dataOf(p).health ?? "Good").toLowerCase() !== "good").length,
      },
      activeCropCycles: crops.length,
      orchardTrees: orchard.length,
      water: { tankName: tank?.name ?? "Water tank", currentLitres, capacityLitres, percentFull: capacityLitres ? Math.round(currentLitres / capacityLitres * 100) : 0, daysRemaining: 0 },
      lowStockItems: inventory.filter((i) => n(i.quantity) <= n(i.minimumStock)).length,
      tasksDueToday: openTasks.filter((t) => t.dueDate === today).length,
      overdueTasks: openTasks.filter((t) => t.dueDate < today).length,
      monthlyRevenue: financeSummary.revenue,
      monthlyExpenses: financeSummary.expenses,
      monthlyProfit: financeSummary.profit,
      tasks: openTasks.slice(0, 6).map((t) => ({ ...t, completedAt: t.completedAt?.toISOString?.() ?? null })),
      alerts: alerts.slice(0, 6),
      recentActivity: farm.slice(0, 8).map((r) => ({ id: r.id, type: r.recordType, title: r.name, detail: r.farmUnit, timestamp: r.updatedAt.toISOString() })),
    });
  } catch (error) {
    if (error instanceof Error && ["Authentication required", "Session expired or invalid", "Active session required", "No active farm assigned to this user", "Active farm context required", "Active farm is unavailable"].includes(error.message)) {
      farmContextError(res, error);
      return;
    }
    return next(error);
  }
});

router.get("/livestock/summary", async (req, res, next): Promise<void> => {
  try {
    const context = await resolveActiveFarm(req);
    const [goats, flocks, farm] = await Promise.all([
      db.select().from(goatsTable).where(eq(goatsTable.farmId, context.farmId)),
      db.select().from(poultryFlocksTable).where(eq(poultryFlocksTable.farmId, context.farmId)),
      records(context.farmId),
    ]);
    const pigs = farm.filter(isPigAnimal);
    const fish = farm.filter((r) => r.recordType === "fish" && active(r.status) && dataOf(r).entityType !== "structure");
    const chickens = flocks.filter((f) => f.kind === "Free-range" && active(f.status)).reduce((s, f) => s + f.currentQuantity, 0);
    const broilers = flocks.filter((f) => f.kind === "Broiler" && active(f.status)).reduce((s, f) => s + f.currentQuantity, 0);
    const fishCount = fish.reduce((s, r) => s + n(dataOf(r).currentNumber ?? dataOf(r).numberStocked), 0);
    res.json({ total: goats.filter((g) => active(g.status)).length + chickens + broilers + pigs.length + fishCount, chickens, broilers, goats: goats.filter((g) => active(g.status)).length, pigs: pigs.length, fish: fishCount, pregnantGoats: goats.filter((g) => active(g.status) && g.pregnancyStatus === "Pregnant").length, sickAnimals: goats.filter((g) => active(g.status) && g.healthStatus !== "Good").length + pigs.filter((p) => String(dataOf(p).health ?? "Good").toLowerCase() !== "good").length });
  } catch (error) {
    if (error instanceof Error) return void farmContextError(res, error);
    return next(error);
  }
});

router.get("/zones", async (req, res, next): Promise<void> => {
  try {
    const context = await resolveActiveFarm(req);
    res.json(await db.select().from(farmZonesTable).where(eq(farmZonesTable.farmId, context.farmId)).orderBy(asc(farmZonesTable.id)));
  } catch (error) {
    if (error instanceof Error) return void farmContextError(res, error);
    return next(error);
  }
});

router.get("/alerts", async (req, res, next): Promise<void> => {
  try {
    const context = await resolveActiveFarm(req);
    const [goats, flocks, inventory, farm] = await Promise.all([
      db.select().from(goatsTable).where(eq(goatsTable.farmId, context.farmId)),
      db.select().from(poultryFlocksTable).where(eq(poultryFlocksTable.farmId, context.farmId)),
      db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.farmId, context.farmId)),
      records(context.farmId),
    ]);
    const pigs = farm.filter(isPigAnimal);
    const alerts = [
      ...goats.filter((g) => active(g.status) && g.expectedKiddingDate).map((g) => ({ id: g.id, severity: "info", title: `${g.goatId} expected to kid`, detail: `${g.name} is due on ${g.expectedKiddingDate}.`, category: "Livestock", dueLabel: "Scheduled" })),
      ...pigs.filter((p) => String(dataOf(p).health ?? "Good").toLowerCase() !== "good").map((p) => ({ id: p.id + 4000, severity: "high", title: `${p.name} needs health attention`, detail: `Health status: ${String(dataOf(p).health ?? "Review")}.`, category: "Livestock", dueLabel: "Review" })),
      ...flocks.filter((f) => f.status === "Vaccination due").map((f) => ({ id: f.id + 1000, severity: "high", title: `${f.batchId} vaccination due`, detail: `${f.kind} batch needs a health check.`, category: "Livestock", dueLabel: "Due" })),
      ...inventory.filter((i) => n(i.quantity) <= n(i.minimumStock)).map((i) => ({ id: i.id + 2000, severity: "medium", title: `${i.name} stock is low`, detail: `${n(i.quantity)} ${i.unit} remaining; minimum is ${n(i.minimumStock)}.`, category: "Inventory", dueLabel: "Restock" })),
      ...farm.filter((r) => r.recordType === "crop_health" && active(r.status)).slice(0, 10).map((r) => ({ id: r.id + 3000, severity: String(dataOf(r).severity ?? "medium").toLowerCase(), title: `${r.name} crop health observation`, detail: String(dataOf(r).observation ?? "Crop health observation recorded."), category: "Crops", dueLabel: "Review" })),
    ];
    res.json(alerts);
  } catch (error) {
    if (error instanceof Error) return void farmContextError(res, error);
    return next(error);
  }
});

export default router;
