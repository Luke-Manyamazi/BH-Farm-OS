import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, authPermissions, authRolePermissions, authRoles } from "@workspace/db";
import { requireAuth } from "./auth";

const router = Router();

const ROLE_PERMISSION_KEYS: Record<string, string[]> = {
  platform_admin: ["dashboard.view", "farm.view", "farm.edit", "farm.delete", "finance.view", "finance.edit", "users.manage", "settings.manage", "reports.view", "platform.farms.view", "platform.farms.manage"],
  owner_admin: ["dashboard.view", "farm.view", "farm.edit", "farm.delete", "finance.view", "finance.edit", "users.manage", "settings.manage", "reports.view"],
  farm_manager: ["dashboard.view", "farm.view", "farm.edit", "farm.delete", "finance.view", "finance.edit", "reports.view"],
  farm_supervisor: ["dashboard.view", "farm.view", "farm.edit", "reports.view"],
  section_head: ["dashboard.view", "farm.view", "farm.edit"],
  field_worker: ["dashboard.view", "farm.view", "farm.edit"],
};

export async function ensureRolePermissions(req: any, res: any, next: any) {
  try {
    const role = (await db.select().from(authRoles).where(eq(authRoles.key, req.authUser.role)).limit(1))[0];
    if (!role) return res.status(400).json({ message: "Role not found" });
    const keys = ROLE_PERMISSION_KEYS[role.key] || ROLE_PERMISSION_KEYS.field_worker;
    const permissions = await db.select().from(authPermissions);
    for (const permission of permissions.filter((p) => keys.includes(p.key))) {
      await db.insert(authRolePermissions).values({ roleId: role.id, permissionId: permission.id }).onConflictDoNothing();
    }
    return next();
  } catch (error) { return next(error); }
}

router.post("/auth/ensure-permissions", requireAuth, async (req, res, next) => {
  try { await ensureRolePermissions(req, res, () => undefined); return res.json({ ok: true }); }
  catch (error) { return next(error); }
});

const SECTION_ROLES = ["section_head", "field_worker"];

function requirePermissionForMethod(user: any, method: string, readPermission: string, writePermission?: string) {
  const permission = method === "GET" || method === "HEAD" ? readPermission : (writePermission || readPermission);
  return user.permissions.includes(permission);
}

export function requireFarmSectionAccess(req: any, res: any, next: any) {
  const user = req.authUser;
  if (!user) return res.status(401).json({ message: "Authentication required" });

  const path = req.path;
  const type = String(req.query?.type || req.body?.recordType || "");
  const method = String(req.method || "GET").toUpperCase();

  // Platform lifecycle/admin endpoints have their own explicit permission checks.
  if (path.startsWith("/farm-management/") && user.permissions.includes("platform.farms.manage")) return next();
  if (path.startsWith("/farm-management") && user.permissions.includes("settings.manage")) return next();
  if (path.includes("/platform/farms")) {
    return user.permissions.includes("platform.farms.manage") || user.permissions.includes("platform.farms.view")
      ? next()
      : res.status(403).json({ message: "Platform farm administration access denied" });
  }

  if (path.includes("/demo")) {
    // Demo data is deliberately unavailable to field/section users.
    if (SECTION_ROLES.includes(user.role)) return res.status(403).json({ message: "Demo data access denied" });
    return next();
  }

  if (path.includes("/users")) {
    return user.permissions.includes("users.manage") ? next() : res.status(403).json({ message: "User administration access denied" });
  }

  if (path.includes("/settings")) {
    return user.permissions.includes("settings.manage") ? next() : res.status(403).json({ message: "Settings access denied" });
  }

  if (path.includes("/finance") || path.includes("/expenses") || path.includes("/sales") || type === "sale" || type === "expense") {
    return requirePermissionForMethod(user, method, "finance.view", "finance.edit")
      ? next()
      : res.status(403).json({ message: "Finance access denied" });
  }

  if (path.includes("/reports")) {
    return user.permissions.includes("reports.view") ? next() : res.status(403).json({ message: "Report access denied" });
  }

  if (path.includes("/dashboard")) {
    return user.permissions.includes("dashboard.view") ? next() : res.status(403).json({ message: "Dashboard access denied" });
  }

  if (path.includes("/livestock") && method === "GET" && !user.permissions.includes("farm.view")) {
    return res.status(403).json({ message: "Farm view permission required" });
  }

  let section: string | undefined;
  if (path.includes("goat")) section = "goats";
  else if (path.includes("poultry")) section = "poultry";
  else if (path.includes("pig")) section = "pigs";
  else if (path.includes("fish") || type.startsWith("fish")) section = "fish";
  else if (path.includes("crop") || path.includes("garden") || path.includes("orchard") || path.includes("greenhouse") || path.includes("field") || ["crop", "crop_activity", "home_garden", "garden_bed", "greenhouse", "orchard_tree", "field", "crop_health"].includes(type)) section = "crops";
  else if (path.includes("water") || path.includes("irrigation") || ["water_tank", "water_usage", "irrigation"].includes(type)) section = "water";
  else if (path.includes("inventory")) section = "inventory";

  if (section && SECTION_ROLES.includes(user.role) && !user.sections.includes(section)) {
    return res.status(403).json({ message: `Access denied for section: ${section}` });
  }

  // Every mutation of operational farm data requires farm.edit. Delete is stronger.
  if (method === "DELETE" && !user.permissions.includes("farm.delete")) {
    return res.status(403).json({ message: "Delete permission required" });
  }
  if (["POST", "PUT", "PATCH"].includes(method) && !user.permissions.includes("farm.edit")) {
    return res.status(403).json({ message: "Edit permission required" });
  }

  // Section roles cannot access unclassified operational endpoints. Management roles
  // may access cross-section farm data according to their explicit permissions.
  if (SECTION_ROLES.includes(user.role) && !section && !user.permissions.includes("farm.view")) {
    return res.status(403).json({ message: "Farm view permission required" });
  }

  return next();
}

export default router;
