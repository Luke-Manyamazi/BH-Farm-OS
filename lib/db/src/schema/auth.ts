import { pgTable, serial, text, boolean, timestamp, unique, integer, primaryKey } from "drizzle-orm/pg-core";

export const authRoles = pgTable("auth_roles", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(true).notNull(),
}, (table) => [unique("auth_roles_key_unique").on(table.key)]);

export const authPermissions = pgTable("auth_permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  description: text("description"),
}, (table) => [unique("auth_permissions_key_unique").on(table.key)]);

export const authRolePermissions = pgTable("auth_role_permissions", {
  roleId: integer("role_id").notNull(),
  permissionId: integer("permission_id").notNull(),
}, (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })]);

export const authUsers = pgTable("auth_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  roleId: integer("role_id").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [unique("auth_users_email_unique").on(table.email)]);

export const authSections = pgTable("auth_sections", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
}, (table) => [unique("auth_sections_key_unique").on(table.key)]);

export const authUserSections = pgTable("auth_user_sections", {
  userId: integer("user_id").notNull(),
  sectionId: integer("section_id").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.sectionId] })]);

export const authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [unique("auth_sessions_token_hash_unique").on(table.tokenHash)]);

export const authAuditLogs = pgTable("auth_audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});
