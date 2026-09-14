import { pgTable, serial, text, numeric, date, unique, integer, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const farmZones = pgTable("farm_zones", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	dimensions: text(),
	status: text().default('Active').notNull(),
	accent: text().default('sage').notNull(),
});

export const financeTransactions = pgTable("finance_transactions", {
	id: serial().primaryKey().notNull(),
	type: text().notNull(),
	category: text().notNull(),
	farmUnit: text("farm_unit").notNull(),
	description: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	transactionDate: date("transaction_date").notNull(),
	counterparty: text(),
});

export const goats = pgTable("goats", {
	id: serial().primaryKey().notNull(),
	goatId: text("goat_id").notNull(),
	name: text().notNull(),
	sex: text().notNull(),
	breed: text().notNull(),
	dateOfBirth: date("date_of_birth"),
	currentWeightKg: numeric("current_weight_kg", { precision: 8, scale:  2 }),
	paddock: text().default('Paddock 1').notNull(),
	status: text().default('Active').notNull(),
	pregnancyStatus: text("pregnancy_status").default('Not pregnant').notNull(),
	expectedKiddingDate: date("expected_kidding_date"),
	healthStatus: text("health_status").default('Good').notNull(),
}, (table) => [
	unique("goats_goat_id_unique").on(table.goatId),
]);

export const inventoryItems = pgTable("inventory_items", {
	id: serial().primaryKey().notNull(),
	itemId: text("item_id").notNull(),
	name: text().notNull(),
	category: text().notNull(),
	unit: text().notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	minimumStock: numeric("minimum_stock", { precision: 10, scale:  2 }).default('0').notNull(),
	maximumStock: numeric("maximum_stock", { precision: 10, scale:  2 }).default('0').notNull(),
	supplier: text(),
	purchasePrice: numeric("purchase_price", { precision: 10, scale:  2 }),
	lastPurchaseDate: date("last_purchase_date"),
	storageLocation: text("storage_location"),
}, (table) => [
	unique("inventory_items_item_id_unique").on(table.itemId),
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
	id: serial().primaryKey().notNull(),
	inventoryItemId: integer("inventory_item_id").notNull(),
	type: text().notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const poultryFlocks = pgTable("poultry_flocks", {
	id: serial().primaryKey().notNull(),
	batchId: text("batch_id").notNull(),
	kind: text().notNull(),
	breed: text().notNull(),
	currentQuantity: integer("current_quantity").notNull(),
	startingQuantity: integer("starting_quantity").notNull(),
	mortality: integer().default(0).notNull(),
	averageWeightKg: numeric("average_weight_kg", { precision: 8, scale:  2 }),
	feedKg: numeric("feed_kg", { precision: 10, scale:  2 }).default('0').notNull(),
	status: text().default('Active').notNull(),
	expectedSaleDate: date("expected_sale_date"),
}, (table) => [
	unique("poultry_flocks_batch_id_unique").on(table.batchId),
]);

export const farmTasks = pgTable("farm_tasks", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	farmUnit: text("farm_unit").notNull(),
	priority: text().default('Normal').notNull(),
	dueDate: date("due_date").notNull(),
	dueTime: text("due_time"),
	recurrence: text(),
	status: text().default('Pending').notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	assignedTo: text("assigned_to"),
	notes: text(),
});
