import { and, eq, like, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, financeTransactionsTable, farmRecordsTable, farmZonesTable, goatsTable, inventoryItemsTable, poultryFlocksTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();
const DEMO = "DEMO-";
const DEMO_TAG = "[DEMO]";
const farmId = (req: any): string => req.farmContext?.farmId ?? (() => { throw new Error("Active farm context required"); })();

router.get("/demo/status", async (req, res): Promise<void> => {
  const id = farmId(req);
  const [goats, poultry, inventory, finance, tasks, records, zones] = await Promise.all([
    db.select({ id: goatsTable.id }).from(goatsTable).where(and(eq(goatsTable.farmId, id), like(goatsTable.goatId, `${DEMO}%`))),
    db.select({ id: poultryFlocksTable.id }).from(poultryFlocksTable).where(and(eq(poultryFlocksTable.farmId, id), like(poultryFlocksTable.batchId, `${DEMO}%`))),
    db.select({ id: inventoryItemsTable.id }).from(inventoryItemsTable).where(and(eq(inventoryItemsTable.farmId, id), like(inventoryItemsTable.itemId, `${DEMO}%`))),
    db.select({ id: financeTransactionsTable.id }).from(financeTransactionsTable).where(and(eq(financeTransactionsTable.farmId, id), like(financeTransactionsTable.description, `${DEMO_TAG}%`))),
    db.select({ id: tasksTable.id }).from(tasksTable).where(and(eq(tasksTable.farmId, id), like(tasksTable.title, `${DEMO_TAG}%`))),
    db.select({ id: farmRecordsTable.id }).from(farmRecordsTable).where(and(eq(farmRecordsTable.farmId, id), eq(farmRecordsTable.status, "Demo"))),
    db.select({ id: farmZonesTable.id }).from(farmZonesTable).where(and(eq(farmZonesTable.farmId, id), like(farmZonesTable.name, `${DEMO_TAG}%`))),
  ]);
  res.json({ active: Boolean(goats.length || poultry.length || inventory.length || finance.length || tasks.length || records.length || zones.length), counts: { goats: goats.length, poultry: poultry.length, inventory: inventory.length, finance: finance.length, tasks: tasks.length, records: records.length, zones: zones.length } });
});

router.post("/demo/seed", async (req, res): Promise<void> => {
  const id = farmId(req);
  const existing = await db.select({ id: farmRecordsTable.id }).from(farmRecordsTable).where(and(eq(farmRecordsTable.farmId, id), eq(farmRecordsTable.status, "Demo"))).limit(1);
  if (existing.length) { res.json({ created: false, message: "Demo data already exists." }); return; }
  const today = new Date().toISOString().slice(0, 10); const future = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  await db.insert(goatsTable).values([
    { farmId: id, goatId: "DEMO-G001", name: "Mabasa", sex: "Female", breed: "Boer cross", currentWeightKg: "42.50", paddock: "Paddock 1", status: "Active", pregnancyStatus: "Pregnant", expectedKiddingDate: future, healthStatus: "Good" },
    { farmId: id, goatId: "DEMO-G002", name: "Tariro", sex: "Female", breed: "Boer cross", currentWeightKg: "38.20", paddock: "Paddock 1", status: "Active", pregnancyStatus: "Not pregnant", healthStatus: "Good" },
    { farmId: id, goatId: "DEMO-G003", name: "Chipo", sex: "Male", breed: "Boer", currentWeightKg: "51.00", paddock: "Paddock 2", status: "Active", pregnancyStatus: "Not pregnant", healthStatus: "Good" },
  ]);
  await db.insert(poultryFlocksTable).values([
    { farmId: id, batchId: "DEMO-CHICKENS", kind: "Layers", breed: "Mixed", currentQuantity: 24, startingQuantity: 25, mortality: 1, averageWeightKg: "1.80", feedKg: "18", status: "Active" },
    { farmId: id, batchId: "DEMO-BROILERS", kind: "Broilers", breed: "Ross", currentQuantity: 18, startingQuantity: 20, mortality: 2, averageWeightKg: "1.25", feedKg: "22", status: "Active", expectedSaleDate: future },
  ]);
  await db.insert(inventoryItemsTable).values([
    { farmId: id, itemId: "DEMO-FEED", name: "Goat & poultry feed", category: "Feed", unit: "kg", quantity: "85", minimumStock: "30", maximumStock: "150", supplier: "Demo supplier", purchasePrice: "0" },
    { farmId: id, itemId: "DEMO-VET", name: "Dewormer", category: "Animal health", unit: "bottle", quantity: "2", minimumStock: "3", maximumStock: "10", supplier: "Demo supplier", purchasePrice: "0" },
  ]);
  await db.insert(tasksTable).values([
    { farmId: id, title: `${DEMO_TAG} Check water level`, description: "Demo daily water check", farmUnit: "Water", priority: "High", dueDate: today, status: "Pending" },
    { farmId: id, title: `${DEMO_TAG} Inspect pregnant goat`, description: "Demo health observation", farmUnit: "Goats", priority: "Normal", dueDate: future, status: "Pending" },
  ]);
  await db.insert(financeTransactionsTable).values([
    { farmId: id, type: "income", category: "Vegetables", farmUnit: "Commercial Garden", description: `${DEMO_TAG} Vegetable sale`, amount: "125.00", transactionDate: today, counterparty: "Demo customer" },
    { farmId: id, type: "expense", category: "Feed", farmUnit: "Livestock", description: `${DEMO_TAG} Feed purchase`, amount: "68.00", transactionDate: today, counterparty: "Demo supplier" },
  ]);
  await db.insert(farmRecordsTable).values([
    { farmId: id, recordType: "water_tank", name: "Demo Water Tank", status: "Demo", farmUnit: "Water", recordDate: today, data: { capacityLitres: 5000, currentLitres: 3600, source: "Demo data" } },
    { farmId: id, recordType: "field", name: "Demo Field 1", status: "Demo", farmUnit: "Field Crops", recordDate: today, data: { area: 0.5, unit: "ha", irrigation: "Planned", currentCrop: "Maize" } },
    { farmId: id, recordType: "crop", name: "Demo maize cycle", status: "Demo", farmUnit: "Field Crops", recordDate: today, data: { crop: "Maize", variety: "Demo hybrid", field: "Demo Field 1", plantingDate: today, expectedHarvestDate: future, inputCost: 95, harvestQuantity: 0, harvestUnit: "kg" } },
    { farmId: id, recordType: "garden_bed", name: "Demo Bed 1", status: "Demo", farmUnit: "Commercial Garden", recordDate: today, data: { bed: "Bed 1", crop: "Covo", dimensions: "Demo", plantingDate: today, inputCost: 35, harvest: 0 } },
    { farmId: id, recordType: "fish", name: "Demo Fish Tank 1", status: "Demo", farmUnit: "Fish", recordDate: today, data: { tankId: "Tank 1", species: "Tilapia", numberStocked: 100, currentNumber: 100, averageWeightKg: 0.08 } },
    { farmId: id, recordType: "fish_water_quality", name: "Demo Fish Tank 1 reading", status: "Demo", farmUnit: "Fish", recordDate: today, data: { tank: "Tank 1", temperatureC: 25, ph: 7.1, dissolvedOxygen: 6.2, ammonia: 0.1, waterLevel: "Good", clarity: "Clear" } },
    { farmId: id, recordType: "orchard_tree", name: "Demo mango tree", status: "Demo", farmUnit: "Orchard", recordDate: today, data: { treeId: "M-DEMO-01", species: "Mango", variety: "Local", plantingDate: today, location: "Orchard A", fruitProduction: 0 } },
    { farmId: id, recordType: "equipment", name: "Demo irrigation pump", status: "Demo", farmUnit: "Infrastructure", recordDate: today, data: { assetId: "EQ-DEMO-01", category: "Pump", condition: "Good", location: "Water point" } },
    { farmId: id, recordType: "health", name: "Demo goat inspection", status: "Demo", farmUnit: "Goats", recordDate: today, data: { animalOrFlock: "Mabasa", eventType: "Inspection", treatment: "None", notes: "Demo observation" } },
    { farmId: id, recordType: "production", name: "Demo egg collection", status: "Demo", farmUnit: "Poultry", recordDate: today, data: { flock: "DEMO-CHICKENS", eggs: 16, unit: "eggs" } },
  ]);
  await db.insert(farmZonesTable).values([
    { farmId: id, name: `${DEMO_TAG} Livestock`, type: "Livestock", dimensions: "Demo zone", status: "Demo", accent: "sage" },
    { farmId: id, name: `${DEMO_TAG} Commercial Garden`, type: "Garden", dimensions: "Demo", status: "Demo", accent: "green" },
    { farmId: id, name: `${DEMO_TAG} Water`, type: "Water", dimensions: "Demo", status: "Demo", accent: "blue" },
  ]);
  res.status(201).json({ created: true, message: "Demo data created for the active farm." });
});

router.delete("/demo", async (req, res): Promise<void> => {
  const id = farmId(req);
  await db.delete(financeTransactionsTable).where(and(eq(financeTransactionsTable.farmId, id), like(financeTransactionsTable.description, `${DEMO_TAG}%`)));
  await db.delete(tasksTable).where(and(eq(tasksTable.farmId, id), like(tasksTable.title, `${DEMO_TAG}%`)));
  await db.delete(inventoryItemsTable).where(and(eq(inventoryItemsTable.farmId, id), like(inventoryItemsTable.itemId, `${DEMO}%`)));
  await db.delete(poultryFlocksTable).where(and(eq(poultryFlocksTable.farmId, id), like(poultryFlocksTable.batchId, `${DEMO}%`)));
  await db.delete(goatsTable).where(and(eq(goatsTable.farmId, id), like(goatsTable.goatId, `${DEMO}%`)));
  await db.delete(farmRecordsTable).where(and(eq(farmRecordsTable.farmId, id), eq(farmRecordsTable.status, "Demo")));
  await db.delete(farmZonesTable).where(and(eq(farmZonesTable.farmId, id), or(eq(farmZonesTable.status, "Demo"), like(farmZonesTable.name, `${DEMO_TAG}%`))));
  res.json({ deleted: true, message: "Demo data removed from the active farm. Real records were not targeted." });
});

export default router;
