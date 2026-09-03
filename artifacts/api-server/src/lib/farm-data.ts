import { and, asc, eq, ilike, or } from "drizzle-orm";
import {
  db,
  farmZonesTable,
  financeTransactionsTable,
  goatsTable,
  inventoryItemsTable,
  inventoryTransactionsTable,
  poultryFlocksTable,
  tasksTable,
} from "@workspace/db";

const today = () => new Date().toISOString().slice(0, 10);
const daysFromToday = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export async function seedFarmData(): Promise<void> {
  const existing = await db.select({ id: farmZonesTable.id }).from(farmZonesTable).limit(1);
  if (existing.length > 0) return;

  await db.insert(farmZonesTable).values([
    { name: "Farmhouse", type: "Farmhouse", dimensions: null, status: "Active", accent: "clay" },
    { name: "Free-range chickens", type: "Poultry", dimensions: "10 × 20m", status: "Active", accent: "amber" },
    { name: "Broiler area", type: "Poultry", dimensions: "9 × 20m", status: "Active", accent: "sun" },
    { name: "Piggery", type: "Livestock", dimensions: "10 × 20m", status: "Active", accent: "rose" },
    { name: "Goat paddock 1", type: "Livestock", dimensions: null, status: "Active", accent: "sage" },
    { name: "Goat paddock 2", type: "Livestock", dimensions: null, status: "Active", accent: "sage" },
    { name: "Fish tank 1", type: "Aquaculture", dimensions: "10 × 10m", status: "Active", accent: "blue" },
    { name: "Fish tank 2", type: "Aquaculture", dimensions: "10 × 10m", status: "Active", accent: "blue" },
    { name: "Field crops", type: "Crops", dimensions: null, status: "Active", accent: "green" },
    { name: "Home garden", type: "Garden", dimensions: null, status: "Active", accent: "green" },
    { name: "Commercial vegetable garden", type: "Garden", dimensions: null, status: "Active", accent: "green" },
    { name: "Future greenhouse", type: "Greenhouse", dimensions: null, status: "Planned", accent: "slate" },
    { name: "Orchard", type: "Orchard", dimensions: "Small orchard area", status: "Active", accent: "orange" },
    { name: "5,000L JoJo tank", type: "Water", dimensions: "5,000 litres", status: "Active", accent: "cyan" },
    { name: "Compost & manure", type: "Resources", dimensions: null, status: "Active", accent: "earth" },
    { name: "Equipment storage", type: "Infrastructure", dimensions: null, status: "Active", accent: "slate" },
  ]);

  await db.insert(goatsTable).values([
    { goatId: "G001", name: "Malaika", sex: "Female", breed: "Boer cross", paddock: "Paddock 1", status: "Pregnant", pregnancyStatus: "Pregnant", expectedKiddingDate: daysFromToday(12), healthStatus: "Good", dateOfBirth: "2023-02-14", currentWeightKg: "48.5" },
    { goatId: "G002", name: "Tendai", sex: "Female", breed: "Boer cross", paddock: "Paddock 2", status: "Pregnant", pregnancyStatus: "Pregnant", expectedKiddingDate: daysFromToday(31), healthStatus: "Good", dateOfBirth: "2022-11-08", currentWeightKg: "52.2" },
    { goatId: "G003", name: "Chipo", sex: "Female", breed: "Local", paddock: "Paddock 1", status: "Active", pregnancyStatus: "Not pregnant", expectedKiddingDate: null, healthStatus: "Good", dateOfBirth: "2024-01-19", currentWeightKg: "34.8" },
    { goatId: "G004", name: "Simba", sex: "Male", breed: "Boer", paddock: "Paddock 2", status: "Active", pregnancyStatus: "Not pregnant", expectedKiddingDate: null, healthStatus: "Good", dateOfBirth: "2022-06-10", currentWeightKg: "61.4" },
    { goatId: "G005", name: "Rudo", sex: "Female", breed: "Local", paddock: "Paddock 1", status: "Active", pregnancyStatus: "Not pregnant", expectedKiddingDate: null, healthStatus: "Good", dateOfBirth: "2023-09-02", currentWeightKg: "39.1" },
    { goatId: "G006", name: "Kuda", sex: "Female", breed: "Boer cross", paddock: "Paddock 2", status: "Active", pregnancyStatus: "Not pregnant", expectedKiddingDate: null, healthStatus: "Monitoring", dateOfBirth: "2024-03-15", currentWeightKg: "31.6" },
    { goatId: "G007", name: "Farai", sex: "Male", breed: "Local", paddock: "Paddock 1", status: "Active", pregnancyStatus: "Not pregnant", expectedKiddingDate: null, healthStatus: "Good", dateOfBirth: "2024-04-22", currentWeightKg: "29.7" },
  ]);

  await db.insert(poultryFlocksTable).values([
    { batchId: "FR-001", kind: "Free-range", breed: "Road Runner", currentQuantity: 42, startingQuantity: 46, mortality: 2, averageWeightKg: "1.65", feedKg: "94.5", status: "Active", expectedSaleDate: null },
    { batchId: "BR-001", kind: "Broiler", breed: "Ross 308", currentQuantity: 118, startingQuantity: 125, mortality: 4, averageWeightKg: "1.82", feedKg: "236", status: "Vaccination due", expectedSaleDate: daysFromToday(8) },
  ]);

  await db.insert(inventoryItemsTable).values([
    { itemId: "FEED-001", name: "Broiler grower", category: "Feed", unit: "kg", quantity: "68", minimumStock: "100", maximumStock: "500", supplier: "Sample supplier", purchasePrice: "0", storageLocation: "Feed room" },
    { itemId: "FEED-002", name: "Chicken layer mash", category: "Feed", unit: "kg", quantity: "145", minimumStock: "80", maximumStock: "300", supplier: "Sample supplier", purchasePrice: "0", storageLocation: "Feed room" },
    { itemId: "FEED-003", name: "Fish feed", category: "Feed", unit: "kg", quantity: "12", minimumStock: "25", maximumStock: "100", supplier: "Sample supplier", purchasePrice: "0", storageLocation: "Aquaculture store" },
    { itemId: "VET-001", name: "Broad-spectrum dewormer", category: "Medication", unit: "bottle", quantity: "3", minimumStock: "2", maximumStock: "12", supplier: "Sample supplier", purchasePrice: "0", storageLocation: "Vet cabinet" },
    { itemId: "SEED-001", name: "Tomato seed", category: "Seeds", unit: "pack", quantity: "6", minimumStock: "2", maximumStock: "20", supplier: "Sample supplier", purchasePrice: "0", storageLocation: "Seed drawer" },
    { itemId: "TOOL-001", name: "Garden hose", category: "Irrigation supplies", unit: "item", quantity: "2", minimumStock: "1", maximumStock: "4", supplier: "Sample supplier", purchasePrice: "0", storageLocation: "Equipment store" },
  ]);

  await db.insert(tasksTable).values([
    { title: "Feed broilers", description: "Morning ration — sample task", farmUnit: "Broilers", priority: "High", dueDate: today(), dueTime: "06:30", recurrence: "Every day", status: "Pending", assignedTo: "John" },
    { title: "Check pregnant goats", description: "Observe appetite, movement, and udder changes.", farmUnit: "Goats", priority: "High", dueDate: today(), dueTime: "07:00", recurrence: "Every day", status: "Pending", assignedTo: "John" },
    { title: "Inspect water tank", description: "Read tank level and check the pump connection.", farmUnit: "Water", priority: "Normal", dueDate: today(), dueTime: "08:00", recurrence: "Every day", status: "Pending", assignedTo: "Tafadzwa" },
    { title: "Collect eggs", description: "Record total eggs collected from free-range flock.", farmUnit: "Chickens", priority: "Normal", dueDate: today(), dueTime: "16:00", recurrence: "Every day", status: "Pending", assignedTo: "John" },
    { title: "Irrigate tomato beds", description: "Use hose and record estimated litres.", farmUnit: "Garden", priority: "Normal", dueDate: daysFromToday(1), dueTime: "17:30", recurrence: "Every 2 days", status: "Pending", assignedTo: "Tafadzwa" },
    { title: "Review broiler vaccination", description: "Batch BR-001 vaccination due tomorrow.", farmUnit: "Broilers", priority: "High", dueDate: daysFromToday(1), dueTime: null, recurrence: null, status: "Pending", assignedTo: "Farm manager" },
    { title: "Trim orchard trees", description: "Seasonal maintenance — sample task", farmUnit: "Orchard", priority: "Low", dueDate: daysFromToday(3), dueTime: null, recurrence: "Monthly", status: "Pending", assignedTo: null },
  ]);

  await db.insert(financeTransactionsTable).values([
    { type: "income", category: "Vegetables", farmUnit: "Commercial garden", description: "Sample tomato sale", amount: "840", transactionDate: today(), counterparty: "Sample customer" },
    { type: "income", category: "Eggs", farmUnit: "Chickens", description: "Sample egg sale", amount: "520", transactionDate: daysFromToday(-4), counterparty: "Sample customer" },
    { type: "income", category: "Broilers", farmUnit: "Broilers", description: "Sample broiler sale", amount: "2300", transactionDate: daysFromToday(-9), counterparty: "Sample customer" },
    { type: "expense", category: "Feed", farmUnit: "Broilers", description: "Sample broiler feed purchase", amount: "1180", transactionDate: daysFromToday(-3), counterparty: "Sample supplier" },
    { type: "expense", category: "Veterinary", farmUnit: "Goats", description: "Sample health supplies", amount: "260", transactionDate: daysFromToday(-6), counterparty: "Sample supplier" },
    { type: "expense", category: "Labour", farmUnit: "Farm", description: "Sample casual labour", amount: "600", transactionDate: daysFromToday(-11), counterparty: "Sample worker" },
  ]);
}

export function toNumber(value: string | number | null): number {
  return value == null ? 0 : Number(value);
}

export function mapTask(task: typeof tasksTable.$inferSelect) {
  return { ...task, completedAt: task.completedAt?.toISOString() ?? null, assignedTo: task.assignedTo ?? null };
}

export function mapGoat(goat: typeof goatsTable.$inferSelect) {
  const daysRemaining = goat.expectedKiddingDate
    ? Math.max(0, Math.ceil((new Date(`${goat.expectedKiddingDate}T00:00:00Z`).getTime() - Date.now()) / 86_400_000))
    : null;
  return { ...goat, currentWeightKg: toNumber(goat.currentWeightKg), dateOfBirth: goat.dateOfBirth ?? null, expectedKiddingDate: goat.expectedKiddingDate ?? null, daysRemaining };
}

export function mapInventory(item: typeof inventoryItemsTable.$inferSelect) {
  const quantity = toNumber(item.quantity);
  return { ...item, quantity, minimumStock: toNumber(item.minimumStock), maximumStock: toNumber(item.maximumStock), purchasePrice: item.purchasePrice == null ? null : toNumber(item.purchasePrice), supplier: item.supplier ?? null, storageLocation: item.storageLocation ?? null, isLowStock: quantity <= toNumber(item.minimumStock) };
}

export async function searchFarmRecords(query: string) {
  const pattern = `%${query}%`;
  const [goats, flocks, inventory, tasks] = await Promise.all([
    db.select().from(goatsTable).where(or(ilike(goatsTable.goatId, pattern), ilike(goatsTable.name, pattern))).limit(8),
    db.select().from(poultryFlocksTable).where(or(ilike(poultryFlocksTable.batchId, pattern), ilike(poultryFlocksTable.breed, pattern))).limit(8),
    db.select().from(inventoryItemsTable).where(or(ilike(inventoryItemsTable.itemId, pattern), ilike(inventoryItemsTable.name, pattern))).limit(8),
    db.select().from(tasksTable).where(or(ilike(tasksTable.title, pattern), ilike(tasksTable.farmUnit, pattern))).limit(8),
  ]);
  return [
    ...goats.map((item) => ({ id: item.goatId, title: item.name, subtitle: `${item.goatId} · ${item.breed}`, module: "Goats", kind: "goat" })),
    ...flocks.map((item) => ({ id: item.batchId, title: item.batchId, subtitle: `${item.kind} · ${item.currentQuantity} birds`, module: "Poultry", kind: "flock" })),
    ...inventory.map((item) => ({ id: item.itemId, title: item.name, subtitle: `${item.category} · ${toNumber(item.quantity)} ${item.unit}`, module: "Inventory", kind: "inventory" })),
    ...tasks.map((item) => ({ id: String(item.id), title: item.title, subtitle: `${item.farmUnit} · ${item.status}`, module: "Tasks", kind: "task" })),
  ];
}