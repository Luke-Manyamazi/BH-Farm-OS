import { and, ilike, or, eq } from "drizzle-orm";
import {
  db,
  goatsTable,
  inventoryItemsTable,
  poultryFlocksTable,
  tasksTable,
} from "@workspace/db";

export async function seedFarmData(): Promise<void> {
  // Seeding disabled — entries added through the app.
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
  return {
    ...goat,
    currentWeightKg: toNumber(goat.currentWeightKg),
    dateOfBirth: goat.dateOfBirth ?? null,
    expectedKiddingDate: goat.expectedKiddingDate ?? null,
    daysRemaining,
  };
}

export function mapInventory(item: typeof inventoryItemsTable.$inferSelect) {
  const quantity = toNumber(item.quantity);
  return {
    ...item,
    quantity,
    minimumStock: toNumber(item.minimumStock),
    maximumStock: toNumber(item.maximumStock),
    purchasePrice: item.purchasePrice == null ? null : toNumber(item.purchasePrice),
    supplier: item.supplier ?? null,
    storageLocation: item.storageLocation ?? null,
    isLowStock: quantity <= toNumber(item.minimumStock),
  };
}

export async function searchFarmRecords(farmId: string, query: string) {
  const pattern = `%${query}%`;
  const [goats, flocks, inventory, tasks] = await Promise.all([
    db.select().from(goatsTable).where(and(eq(goatsTable.farmId, farmId), or(ilike(goatsTable.goatId, pattern), ilike(goatsTable.name, pattern)))).limit(8),
    db.select().from(poultryFlocksTable).where(and(eq(poultryFlocksTable.farmId, farmId), or(ilike(poultryFlocksTable.batchId, pattern), ilike(poultryFlocksTable.breed, pattern)))).limit(8),
    db.select().from(inventoryItemsTable).where(and(eq(inventoryItemsTable.farmId, farmId), or(ilike(inventoryItemsTable.itemId, pattern), ilike(inventoryItemsTable.name, pattern)))).limit(8),
    db.select().from(tasksTable).where(and(eq(tasksTable.farmId, farmId), or(ilike(tasksTable.title, pattern), ilike(tasksTable.farmUnit, pattern)))).limit(8),
  ]);
  return [
    ...goats.map((item) => ({ id: item.goatId, title: item.name, subtitle: `${item.goatId} · ${item.breed}`, module: "Goats", kind: "goat" })),
    ...flocks.map((item) => ({ id: item.batchId, title: item.batchId, subtitle: `${item.kind} · ${item.currentQuantity} birds`, module: "Poultry", kind: "flock" })),
    ...inventory.map((item) => ({ id: item.itemId, title: item.name, subtitle: `${item.category} · ${toNumber(item.quantity)} ${item.unit}`, module: "Inventory", kind: "inventory" })),
    ...tasks.map((item) => ({ id: String(item.id), title: item.title, subtitle: `${item.farmUnit} · ${item.status}`, module: "Tasks", kind: "task" })),
  ];
}
