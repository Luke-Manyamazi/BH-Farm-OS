import {
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const farmZonesTable = pgTable("farm_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  dimensions: text("dimensions"),
  status: text("status").notNull().default("Active"),
  accent: text("accent").notNull().default("sage"),
});

export const tasksTable = pgTable("farm_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  farmUnit: text("farm_unit").notNull(),
  priority: text("priority").notNull().default("Normal"),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  dueTime: text("due_time"),
  recurrence: text("recurrence"),
  status: text("status").notNull().default("Pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
});

export const goatsTable = pgTable("goats", {
  id: serial("id").primaryKey(),
  goatId: text("goat_id").notNull().unique(),
  name: text("name").notNull(),
  sex: text("sex").notNull(),
  breed: text("breed").notNull(),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  currentWeightKg: numeric("current_weight_kg", { precision: 8, scale: 2 }),
  paddock: text("paddock").notNull().default("Paddock 1"),
  status: text("status").notNull().default("Active"),
  pregnancyStatus: text("pregnancy_status").notNull().default("Not pregnant"),
  expectedKiddingDate: date("expected_kidding_date", { mode: "string" }),
  healthStatus: text("health_status").notNull().default("Good"),
});

export const poultryFlocksTable = pgTable("poultry_flocks", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull().unique(),
  kind: text("kind").notNull(),
  breed: text("breed").notNull(),
  currentQuantity: integer("current_quantity").notNull(),
  startingQuantity: integer("starting_quantity").notNull(),
  mortality: integer("mortality").notNull().default(0),
  averageWeightKg: numeric("average_weight_kg", { precision: 8, scale: 2 }),
  feedKg: numeric("feed_kg", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("Active"),
  expectedSaleDate: date("expected_sale_date", { mode: "string" }),
});

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  itemId: text("item_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  minimumStock: numeric("minimum_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  maximumStock: numeric("maximum_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  supplier: text("supplier"),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  lastPurchaseDate: date("last_purchase_date", { mode: "string" }),
  storageLocation: text("storage_location"),
});

export const inventoryTransactionsTable = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  type: text("type").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financeTransactionsTable = pgTable("finance_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  farmUnit: text("farm_unit").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  transactionDate: date("transaction_date", { mode: "string" }).notNull(),
  counterparty: text("counterparty"),
});

/**
 * Flexible operational records for modules that are intentionally extensible:
 * pigs, fish, crops, gardens, greenhouse, orchard, water, irrigation,
 * health, sales, expenses, equipment, compost, calendar events and future
 * IoT/AI metadata. Core high-integrity domains (goats, poultry, inventory,
 * tasks and finance) remain in their dedicated tables above.
 */
export const farmRecordsTable = pgTable("farm_records", {
  id: serial("id").primaryKey(),
  recordType: text("record_type").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("Active"),
  farmUnit: text("farm_unit").notNull().default("General"),
  recordDate: date("record_date", { mode: "string" }),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FarmZone = typeof farmZonesTable.$inferSelect;
export type Task = typeof tasksTable.$inferSelect;
export type Goat = typeof goatsTable.$inferSelect;
export type PoultryFlock = typeof poultryFlocksTable.$inferSelect;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type FinanceTransaction = typeof financeTransactionsTable.$inferSelect;
export type FarmRecord = typeof farmRecordsTable.$inferSelect;