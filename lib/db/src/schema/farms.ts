import { jsonb, pgTable, text, timestamp, uuid, unique, index } from "drizzle-orm/pg-core";

export const farmsTable = pgTable("farms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("farms_name_unique").on(table.name),
  index("farms_status_idx").on(table.status),
]);

export type Farm = typeof farmsTable.$inferSelect;
export type NewFarm = typeof farmsTable.$inferInsert;
