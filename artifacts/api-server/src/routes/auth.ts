import { Router, type Request, type Response, type NextFunction } from "express";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { db, authAuditLogs, authPermissions, authRolePermissions, authRoles, authSections, authSessions, authUserFarms, authUserSections, authUsers, farmsTable } from "@workspace/db";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
  roleName: string;
  permissions: string[];
  sections: string[];
  activeFarmId: string | null;
  activeFarmName: string | null;
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

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function getUserBySession(token: string): Promise<AuthUser | null> {
  const session = (await db.select().from(authSessions).where(and(eq(authSessions.tokenHash, tokenHash(token)), gt(authSessions.expiresAt, new Date().toISOString()))).limit(1))[0];
  if (!session) return null;

  const user = (await db.select().from(authUsers).where(and(eq(authUsers.id, session.userId), eq(authUsers.active, true))).limit(1))[0];
  if (!user) return null;

  let membership = session.activeFarmId
    ? (await db.select({ farmId: authUserFarms.farmId, roleId: authUserFarms.roleId }).from(authUserFarms).where(and(eq(authUserFarms.userId, user.id), eq(authUserFarms.farmId, session.activeFarmId), eq(authUserFarms.active, true))).limit(1))[0]
    : undefined;

  if (!membership) {
    const memberships = await db.select({ farmId: authUserFarms.farmId, roleId: authUserFarms.roleId }).from(authUserFarms).where(and(eq(authUserFarms.userId, user.id), eq(authUserFarms.active, true))).orderBy(desc(authUserFarms.createdAt));
    if (memberships.length === 1) {
      membership = memberships[0];
      await db.update(authSessions).set({ activeFarmId: membership.farmId }).where(eq(authSessions.id, session.id));
    }
  }

  const roleId = membership?.roleId ?? user.roleId;
  const role = (await db.select().from(authRoles).where(eq(authRoles.id, roleId)).limit(1))[0];
  if (!role) return null;

  const permissions = await db.select({ key: authPermissions.key }).from(authRolePermissions).innerJoin(authPermissions, eq(authRolePermissions.permissionId, authPermissions.id)).where(eq(authRolePermissions.roleId, role.id));
  const sections = membership
    ? await db.select({ key: authSections.key }).from(authUserSections).innerJoin(authSections, eq(authUserSections.sectionId, authSections.id)).where(and(eq(authUserSections.userId, user.id), eq(authUserSections.farmId, membership.farmId)))
    : [];
  const farm = membership ? (await db.select({ name: farmsTable.name }).from(farmsTable).where(eq(farmsTable.id, membership.farmId)).limit(1))[0] : undefined;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: role.key,
    roleName: role.name,
    permissions: permissions.map((p) => p.key),
    sections: sections.map((s) => s.key),
    activeFarmId: membership?.farmId ?? null,
    activeFarmName: farm?.name ?? null,
  };
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

async function audit(userId: number | null, action: string, entityType?: string, entityId?: string, details?: string, farmId?: string) {
  await db.insert(authAuditLogs).values({ userId, farmId, action, entityType, entityId, details });
}

async function currentSession(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || !req.authUser) return null;
  return (await db.select().from(authSessions).where(and(eq(authSessions.userId, req.authUser.id), eq(authSessions.tokenHash, tokenHash(token)), gt(authSessions.expiresAt, new Date().toISOString()))).limit(1))[0] ?? null;
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
    const farmName = String(req.body?.farmName ?? "Primary Farm").trim();
    if (!email || !farmName || !password || password.length < 12) return res.status(400).json({ message: "Farm name, email and a password of at least 12 characters are required" });

    const result = await db.transaction(async (tx) => {
      for (const [key, name, description] of ROLE_DEFINITIONS) await tx.insert(authRoles).values({ key, name, description }).onConflictDoNothing();
      for (const [key, description] of PERMISSIONS) await tx.insert(authPermissions).values({ key, description }).onConflictDoNothing();
      for (const [key, name] of SECTION_DEFINITIONS) await tx.insert(authSections).values({ key, name }).onConflictDoNothing();

      const ownerRole = (await tx.select().from(authRoles).where(eq(authRoles.key, "owner_admin")).limit(1))[0];
      if (!ownerRole) throw new Error("Unable to initialize owner role");
      const farm = (await tx.insert(farmsTable).values({ name: farmName, settings: { timezone: "UTC" } }).returning())[0];
      const allPermissions = await tx.select().from(authPermissions);
      for (const permission of allPermissions) await tx.insert(authRolePermissions).values({ roleId: ownerRole.id, permissionId: permission.id }).onConflictDoNothing();
      const user = (await tx.insert(authUsers).values({ email, displayName, passwordHash: hashPassword(password), roleId: ownerRole.id }).returning())[0];
      await tx.insert(authUserFarms).values({ userId: user.id, farmId: farm.id, roleId: ownerRole.id });
      const sections = await tx.select().from(authSections);
      for (const section of sections) await tx.insert(authUserSections).values({ userId: user.id, farmId: farm.id, sectionId: section.id }).onConflictDoNothing();
      return { userId: user.id, farmId: farm.id };
    });

    await audit(result.userId, "bootstrap_admin_created", "user", String(result.userId), undefined, result.farmId);
    return res.status(201).json({ message: "Farm authentication initialized. Sign in with the owner account.", farmId: result.farmId });
  } catch (error) { return next(error); }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const rows = await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
    const user = rows[0];
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ message: "Invalid email or password" });
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    const memberships = await db.select({ farmId: authUserFarms.farmId }).from(authUserFarms).where(and(eq(authUserFarms.userId, user.id), eq(authUserFarms.active, true))).orderBy(desc(authUserFarms.createdAt));
    await db.insert(authSessions).values({ userId: user.id, activeFarmId: memberships.length === 1 ? memberships[0].farmId : null, tokenHash: tokenHash(token), expiresAt: expires });
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", maxAge: SESSION_DAYS * 86400000, path: "/" });
    await audit(user.id, "login", undefined, undefined, undefined, memberships.length === 1 ? memberships[0].farmId : undefined);
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

router.get("/auth/farms", requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select({ id: farmsTable.id, name: farmsTable.name, status: farmsTable.status, roleId: authUserFarms.roleId, active: authUserFarms.active }).from(authUserFarms).innerJoin(farmsTable, eq(authUserFarms.farmId, farmsTable.id)).where(eq(authUserFarms.userId, req.authUser!.id));
    return res.json(rows.map((row) => ({ ...row, active: row.id === req.authUser!.activeFarmId })));
  } catch (error) { return next(error); }
});

router.post("/auth/farms/:farmId/select", requireAuth, async (req, res, next) => {
  try {
    const membership = (await db.select().from(authUserFarms).where(and(eq(authUserFarms.userId, req.authUser!.id), eq(authUserFarms.farmId, req.params.farmId), eq(authUserFarms.active, true))).limit(1))[0];
    if (!membership) return res.status(403).json({ message: "You are not assigned to this farm" });
    const session = await currentSession(req);
    if (!session) return res.status(401).json({ message: "Active session required" });
    await db.update(authSessions).set({ activeFarmId: membership.farmId }).where(eq(authSessions.id, session.id));
    await audit(req.authUser!.id, "active_farm_changed", "farm", membership.farmId, undefined, membership.farmId);
    return res.json({ farmId: membership.farmId });
  } catch (error) { return next(error); }
});

router.get("/auth/users", requireAuth, requirePermission("users.manage"), async (req, res, next) => {
  try {
    const farmId = req.authUser!.activeFarmId;
    if (!farmId) return res.status(409).json({ message: "Select an active farm first" });
    const memberships = await db.select({ user: authUsers, role: authRoles, membershipActive: authUserFarms.active }).from(authUserFarms).innerJoin(authUsers, eq(authUserFarms.userId, authUsers.id)).innerJoin(authRoles, eq(authUserFarms.roleId, authRoles.id)).where(eq(authUserFarms.farmId, farmId));
    return res.json(memberships.map((row) => ({ id: row.user.id, email: row.user.email, displayName: row.user.displayName, active: row.user.active && row.membershipActive, role: row.role.key, roleName: row.role.name, createdAt: row.user.createdAt })));
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
    const farmId = req.authUser!.activeFarmId;
    if (!farmId) return res.status(409).json({ message: "Select an active farm first" });
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const displayName = String(req.body?.displayName ?? "").trim();
    const roleKey = String(req.body?.role ?? "field_worker");
    if (!email || !displayName || password.length < 12) return res.status(400).json({ message: "Name, email and a password of at least 12 characters are required" });
    const role = (await db.select().from(authRoles).where(eq(authRoles.key, roleKey)).limit(1))[0];
    if (!role) return res.status(400).json({ message: "Unknown role" });
    const user = (await db.insert(authUsers).values({ email, displayName, passwordHash: hashPassword(password), roleId: role.id }).returning())[0];
    await db.insert(authUserFarms).values({ userId: user.id, farmId, roleId: role.id });
    const requestedSections: string[] = Array.isArray(req.body?.sections) ? req.body.sections : [];
    for (const key of requestedSections) {
      const section = (await db.select().from(authSections).where(eq(authSections.key, key)).limit(1))[0];
      if (section) await db.insert(authUserSections).values({ userId: user.id, farmId, sectionId: section.id }).onConflictDoNothing();
    }
    await audit(req.authUser!.id, "user_created", "user", String(user.id), undefined, farmId);
    return res.status(201).json({ id: user.id, email: user.email, displayName: user.displayName, role: role.key, sections: requestedSections, farmId });
  } catch (error) { return next(error); }
});

router.get("/auth/dashboard", requireAuth, async (req, res) => {
  const user = req.authUser!;
  const sectionLabels: Record<string, string> = { goats: "Goats", poultry: "Poultry", pigs: "Pigs", fish: "Fish", crops: "Crops & Garden", water: "Water & Irrigation", inventory: "Inventory" };
  const all = user.role === "owner_admin" || user.role === "farm_manager" || user.role === "farm_supervisor";
  return res.json({ user, dashboard: all ? "management" : "section", sections: all ? Object.keys(sectionLabels) : user.sections, sectionLabels, financeVisible: user.permissions.includes("finance.view"), adminVisible: user.permissions.includes("users.manage") });
});

export default router;
