import { asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CompleteTaskBody,
  CompleteTaskParams,
  CompleteTaskResponse,
  CreateGoatBody,
  CreateInventoryItemBody,
  CreateTaskBody,
  GetFinanceSummaryResponse,
  ListGoatsQueryParams,
  ListGoatsResponse,
  ListInventoryQueryParams,
  ListInventoryResponse,
  ListPoultryFlocksResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  RecordInventoryTransactionBody,
  RecordInventoryTransactionParams,
  RecordInventoryTransactionResponse,
  SearchFarmQueryParams,
  SearchFarmResponse,
} from "@workspace/api-zod";
import {
  db,
  financeTransactionsTable,
  goatsTable,
  inventoryItemsTable,
  inventoryTransactionsTable,
  poultryFlocksTable,
  tasksTable,
} from "@workspace/db";
import { mapGoat, mapInventory, mapTask, searchFarmRecords, toNumber } from "../lib/farm-data";

const router: IRouter = Router();

const activeTasks = async () => {
  const tasks = await db.select().from(tasksTable).orderBy(asc(tasksTable.dueDate), asc(tasksTable.dueTime));
  return tasks.map(mapTask);
};

router.get("/tasks", async (req, res): Promise<void> => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tasks = await activeTasks();
  const filtered = parsed.data.status ? tasks.filter((task) => task.status === parsed.data.status) : tasks;
  res.json(ListTasksResponse.parse(filtered));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [task] = await db.insert(tasksTable).values({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    farmUnit: parsed.data.farmUnit,
    priority: parsed.data.priority ?? "Normal",
    dueDate: parsed.data.dueDate,
    dueTime: parsed.data.dueTime ?? null,
    recurrence: parsed.data.recurrence ?? null,
    assignedTo: parsed.data.assignedTo ?? null,
  }).returning();
  res.status(201).json(ListTasksResponse.element.parse(mapTask(task)));
});

router.patch("/tasks/:taskId/complete", async (req, res): Promise<void> => {
  const params = CompleteTaskParams.safeParse(req.params);
  const body = CompleteTaskBody.safeParse(req.body ?? {});
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [task] = await db.update(tasksTable).set({ status: "Completed", completedAt: new Date(), notes: body.data.notes ?? null }).where(eq(tasksTable.id, params.data.taskId)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(CompleteTaskResponse.parse(mapTask(task)));
});

router.get("/livestock/goats", async (req, res): Promise<void> => {
  const parsed = ListGoatsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const goats = await db.select().from(goatsTable).orderBy(asc(goatsTable.goatId));
    const filtered = parsed.data.status ? goats.filter((goat) => goat.status === parsed.data.status) : goats;
    res.json(ListGoatsResponse.parse(filtered.map(mapGoat)));
  } catch (error) {
    console.error("GOATS DB ERROR:", error);
    res.status(500).json({ error: "Failed to load goats", message: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/livestock/goats", async (req, res): Promise<void> => {
  const parsed = CreateGoatBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [goat] = await db.insert(goatsTable).values({
    goatId: parsed.data.goatId,
    name: parsed.data.name,
    sex: parsed.data.sex ?? "Female",
    breed: parsed.data.breed ?? "Not set",
    dateOfBirth: parsed.data.dateOfBirth ?? null,
    currentWeightKg: parsed.data.currentWeightKg == null ? null : String(parsed.data.currentWeightKg),
    paddock: parsed.data.paddock ?? "Paddock 1",
    status: parsed.data.pregnancyStatus === "Pregnant" ? "Pregnant" : "Active",
    pregnancyStatus: parsed.data.pregnancyStatus ?? "Not pregnant",
    expectedKiddingDate: parsed.data.expectedKiddingDate ?? null,
    healthStatus: parsed.data.healthStatus ?? "Good",
  }).returning();
  res.status(201).json(ListGoatsResponse.element.parse(mapGoat(goat)));
});

router.get("/livestock/flocks", async (_req, res): Promise<void> => {
  const flocks = await db.select().from(poultryFlocksTable).orderBy(asc(poultryFlocksTable.id));
  res.json(ListPoultryFlocksResponse.parse(flocks.map((flock) => ({
    ...flock,
    averageWeightKg: flock.averageWeightKg == null ? null : toNumber(flock.averageWeightKg),
    feedKg: toNumber(flock.feedKg),
    expectedSaleDate: flock.expectedSaleDate ?? null,
  }))));
});

router.get("/inventory", async (req, res): Promise<void> => {
  const parsed = ListInventoryQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const items = await db.select().from(inventoryItemsTable).orderBy(asc(inventoryItemsTable.name));
  const filtered = items.filter((item) =>
    (!parsed.data.category || item.category === parsed.data.category) &&
    (parsed.data.lowStock == null || (toNumber(item.quantity) <= toNumber(item.minimumStock)) === parsed.data.lowStock),
  );
  res.json(ListInventoryResponse.parse(filtered.map(mapInventory)));
});

router.post("/inventory", async (req, res): Promise<void> => {
  const parsed = CreateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.insert(inventoryItemsTable).values({
    itemId: parsed.data.itemId,
    name: parsed.data.name,
    category: parsed.data.category,
    unit: parsed.data.unit,
    quantity: String(parsed.data.quantity),
    minimumStock: String(parsed.data.minimumStock),
    maximumStock: String(parsed.data.maximumStock),
    supplier: parsed.data.supplier ?? null,
    purchasePrice: parsed.data.purchasePrice == null ? null : String(parsed.data.purchasePrice),
    storageLocation: parsed.data.storageLocation ?? null,
  }).returning();
  res.status(201).json(ListInventoryResponse.element.parse(mapInventory(item)));
});

router.post("/inventory/:itemId/transactions", async (req, res): Promise<void> => {
  const params = RecordInventoryTransactionParams.safeParse(req.params);
  const parsed = RecordInventoryTransactionBody.safeParse(req.body);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, params.data.itemId));
  if (!item) { res.status(404).json({ error: "Inventory item not found" }); return; }
  const decreases = ["usage", "waste", "expired"].includes(parsed.data.type);
  const nextQuantity = toNumber(item.quantity) + (decreases ? -parsed.data.quantity : parsed.data.quantity);
  if (nextQuantity < 0) { res.status(400).json({ error: "Inventory quantity cannot go below zero." }); return; }
  await db.insert(inventoryTransactionsTable).values({ inventoryItemId: item.id, type: parsed.data.type, quantity: String(parsed.data.quantity), note: parsed.data.note ?? null });
  const [updated] = await db.update(inventoryItemsTable).set({ quantity: String(nextQuantity), lastPurchaseDate: parsed.data.type === "purchase" ? new Date().toISOString().slice(0, 10) : item.lastPurchaseDate }).where(eq(inventoryItemsTable.id, item.id)).returning();
  res.json(RecordInventoryTransactionResponse.parse(mapInventory(updated)));
});

router.get("/finance/summary", async (_req, res): Promise<void> => {
  const transactions = await db.select().from(financeTransactionsTable);
  const revenue = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const byEnterprise = [...new Set(transactions.map((item) => item.farmUnit))].map((name) => {
    const items = transactions.filter((item) => item.farmUnit === name);
    const itemRevenue = items.filter((item) => item.type === "income").reduce((sum, item) => sum + toNumber(item.amount), 0);
    const itemExpenses = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + toNumber(item.amount), 0);
    return { name, revenue: itemRevenue, expenses: itemExpenses, profit: itemRevenue - itemExpenses, margin: itemRevenue ? ((itemRevenue - itemExpenses) / itemRevenue) * 100 : 0 };
  });
  const monthNames = new Intl.DateTimeFormat("en", { month: "short" });
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
    const items = transactions.filter((item) => item.transactionDate >= start && item.transactionDate <= end);
    return {
      month: monthNames.format(monthDate),
      revenue: items.filter((item) => item.type === "income").reduce((sum, item) => sum + toNumber(item.amount), 0),
      expenses: items.filter((item) => item.type === "expense").reduce((sum, item) => sum + toNumber(item.amount), 0),
    };
  });
  res.json(GetFinanceSummaryResponse.parse({ revenue, expenses, profit: revenue - expenses, revenueChange: 0, expenseChange: 0, enterprisePerformance: byEnterprise, monthly }));
});

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchFarmQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  res.json(SearchFarmResponse.parse(await searchFarmRecords(parsed.data.q)));
});

export default router;
