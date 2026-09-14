import { Router, type Request, type Response, type NextFunction } from "express";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, authAuditLogs, authPermissions, authRolePermissions, authRoles, authSections, authSessions, authUserSections, authUsers } from "@workspace/db";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
  roleName: string;
  permissions: string[];
  sections: string[];
};

declare global {
  namespace Express {
    interface Request { authUser?: AuthUser; }
  }
}

const router = Router();
const SESSION_COOKIE = "bh_session";
const SESSION_DAYS = 14;

const ROLE_DEFINITIONS = [
  ["owner_admin", "Farm Owner / Admin", "Full farm control, users, settings and finance"],
  ["farm_manager", "Farm Manager", "Runs farm operations and management reporting"],
  ["farm_supervisor", "Farm Supervisor", "Coordinates daily farm operations"],
  ["section_head", "Section Head", "Manages an assigned production section"],
  ["field_worker", "Field Worker", "Captures assigned operational work"],
] as const;

const SECTION_DEFINITIONS = [
  ["goats", "Goats"], ["poultry", "Poultry"], ["pigs", "Pigs"], ["fish", "Fish"],
  ["crops", "Crops & Garden"], ["water", "Water & Irrigation"], ["inventory", "Inventory"],
] as const;

const PERMISSIONS = [
  ["dashboard.view", "View dashboards"], ["farm.view", "View farm operations"],
  ["farm.edit", "Create and edit operational records"], ["farm.delete", "Delete operational records"],
  ["finance.view", "View finance"], ["finance.edit", "Manage finance"],
  ["users.manage", "Manage users, roles and assignments"], ["settings.manage", "Manage farm settings"],
  ["reports.view", "View reports"],
] as const;

const ROLE_PERMISSION_KEYS: Record<string, string[]> = {
  owner_admin: PERMISSIONS.map(([key]) => key),
  farm_manager: ["dashboard.view", "farm.view", "farm.edit", "farm.delete", "finance.view", "finance.edit", "reports.view"],
  farm_supervisor: ["dashboard.view", "farm.view", "farm.edit", "reports.view"],
  section_head: ["dashboard.view", "farm.view", "farm.edit"],
  field_worker: ["dashboard.view", "farm.view", "farm.edit"],
};

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [, salt, expected] = stored.split("$");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function getUserBySession(token: string): Promise<AuthUser | null> {
  const session = await db.select().from(authSessions).where(and(eq(authSessions.tokenHash, tokenHash(token)), gt(authSessions.expiresAt, new Date().toISOString()))).limit(1);
  if (!session[0]) return null;
  const rows = await db.select({ user: authUsers, role: authRoles }).from(authUsers).innerJoin(authRoles, eq(authUsers.roleId, authRoles.id)).where(and(eq(authUsers.id, session[0].userId), eq(authUsers.active, true))).limit(1);
  if (!rows[0]) return null;
  const permissions = await db.select({ key: authPermissions.key }).from(authRolePermissions).innerJoin(authPermissions, eq(authRolePermissions.permissionId, authPermissions.id)).where(eq(authRolePermissions.roleId, rows[0].role.id));
  const sections = await db.select({ key: authSections.key }).from(authUserSections).innerJoin(authSections, eq(authUserSections.sectionId, authSections.id)).where(eq(authUserSections.userId, rows[0].user.id));
  return { id: rows[0].user.id, email: rows[0].user.email, displayName: rows[0].user.displayName, role: rows[0].role.key, roleName: rows[0].role.name, permissions: permissions.map((p) => p.key), sections: sections.map((s) => s.key) };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const user = await getUserBySession(token);
    if (!user) return res.status(401).json({ message: "Session expired or invalid" });
    req.authUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser?.permissions.includes(permission)) return res.status(403).json({ message: `Permission required: ${permission}` });
    return next();
  };
}

async function audit(userId: number | null, action: string, entityType?: string, entityId?: string, details?: string) {
  await db.insert(authAuditLogs).values({ userId, action, entityType, entityId, details });
}

router.get("/auth/status", async (_req, res, next) => {
  try {
    const count = await db.select({ id: authUsers.id }).from(authUsers).limit(1);
    return res.json({ initialized: count.length > 0 });
  } catch (error) { return next(error); }
});

router.post("/auth/bootstrap", async (req, res, next) => {
  try {
    const expectedKey = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!expectedKey || req.body?.bootstrapKey !== expectedKey) return res.status(403).json({ message: "Invalid bootstrap key" });
    const existing = await db.select({ id: authUsers.id }).from(authUsers).limit(1);
    if (existing.length) return res.status(409).json({ message: "Farm authentication is already initialized" });
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const displayName = String(req.body?.displayName ?? "Farm Owner").trim();
    if (!email || !password || password.length < 12) return res.status(400).json({ message: "Email and a password of at least 12 characters are required" });
    await db.transaction(async (tx) => {
      for (const [key, name, description] of ROLE_DEFINITIONS) await tx.insert(authRoles).values({ key, name, description }).onConflictDoNothing();
      for (const [key, description] of PERMISSIONS) await tx.insert(authPermissions).values({ key, description }).onConflictDoNothing();
      for (const [key, name] of SECTION_DEFINITIONS) await tx.insert(authSections).values({ key, name }).onConflictDoNothing();
    });
    const ownerRole = (await db.select().from(authRoles).where(eq(authRoles.key, "owner_admin")).limit(1))[0];
    if (!ownerRole) throw new Error("Unable to initialize owner role");
    const allPermissions = await db.select().from(authPermissions);
    for (const permission of allPermissions) await db.insert(authRolePermissions).values({ roleId: ownerRole.id, permissionId: permission.id }).onConflictDoNothing();
    const user = (await db.insert(authUsers).values({ email, displayName, passwordHash: hashPassword(password), roleId: ownerRole.id }).returning())[0];
    await audit(user.id, "bootstrap_admin_created", "user", String(user.id));
    return res.status(201).json({ message: "Farm authentication initialized. Sign in with the owner account." });
  } catch (error) { return next(error); }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const rows = await db.select({ user: authUsers, role: authRoles }).from(authUsers).innerJoin(authRoles, eq(authUsers.roleId, authRoles.id)).where(eq(authUsers.email, email)).limit(1);
    if (!rows[0] || !rows[0].user.active || !verifyPassword(password, rows[0].user.passwordHash)) return res.status(401).json({ message: "Invalid email or password" });
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await db.insert(authSessions).values({ userId: rows[0].user.id, tokenHash: tokenHash(token), expiresAt: expires });
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", maxAge: SESSION_DAYS * 86400000, path: "/" });
    await audit(rows[0].user.id, "login");
    return res.json({ message: "Signed in" });
  } catch (error) { return next(error); }
});

router.post("/auth/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash(token)));
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", path: "/" });
    return res.json({ message: "Signed out" });
  } catch (error) { return next(error); }
});

router.get("/auth/me", requireAuth, (req, res) => res.json(req.authUser));

router.get("/auth/users", requireAuth, requirePermission("users.manage"), async (_req, res, next) => {
  try {
    const rows = await db.select({ id: authUsers.id, email: authUsers.email, displayName: authUsers.displayName, active: authUsers.active, role: authRoles.key, roleName: authRoles.name, createdAt: authUsers.createdAt }).from(authUsers).innerJoin(authRoles, eq(authUsers.roleId, authRoles.id));
    return res.json(rows);
  } catch (error) { return next(error); }
});

router.get("/auth/roles", requireAuth, requirePermission("users.manage"), async (_req, res, next) => {
  try { return res.json(await db.select().from(authRoles)); } catch (error) { return next(error); }
});

router.get("/auth/sections", requireAuth, async (_req, res, next) => {
  try { return res.json(await db.select().from(authSections)); } catch (error) { return next(error); }
});

router.post("/auth/users", requireAuth, requirePermission("users.manage"), async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const displayName = String(req.body?.displayName ?? "").trim();
    const roleKey = String(req.body?.role ?? "field_worker");
    if (!email || !displayName || password.length < 12) return res.status(400).json({ message: "Name, email and a password of at least 12 characters are required" });
    const role = (await db.select().from(authRoles).where(eq(authRoles.key, roleKey)).limit(1))[0];
    if (!role) return res.status(400).json({ message: "Unknown role" });
    const user = (await db.insert(authUsers).values({ email, displayName, passwordHash: hashPassword(password), roleId: role.id }).returning())[0];
    const requestedSections: string[] = Array.isArray(req.body?.sections) ? req.body.sections : [];
    for (const key of requestedSections) {
      const section = (await db.select().from(authSections).where(eq(authSections.key, key)).limit(1))[0];
      if (section) await db.insert(authUserSections).values({ userId: user.id, sectionId: section.id }).onConflictDoNothing();
    }
    await audit(req.authUser!.id, "user_created", "user", String(user.id));
    return res.status(201).json({ id: user.id, email: user.email, displayName: user.displayName, role: role.key, sections: requestedSections });
  } catch (error) { return next(error); }
});

router.get("/auth/dashboard", requireAuth, async (req, res) => {
  const user = req.authUser!;
  const sectionLabels: Record<string, string> = { goats: "Goats", poultry: "Poultry", pigs: "Pigs", fish: "Fish", crops: "Crops & Garden", water: "Water & Irrigation", inventory: "Inventory" };
  const all = user.role === "owner_admin" || user.role === "farm_manager" || user.role === "farm_supervisor";
  return res.json({ user, dashboard: all ? "management" : "section", sections: all ? Object.keys(sectionLabels) : user.sections, sectionLabels, financeVisible: user.permissions.includes("finance.view"), adminVisible: user.permissions.includes("users.manage") });
});

export default router;
