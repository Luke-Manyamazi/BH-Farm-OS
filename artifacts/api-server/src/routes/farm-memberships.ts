import { Router } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  authAuditLogs,
  authRoles,
  authSections,
  authUserFarms,
  authUserSections,
  authUsers,
  farmsTable,
} from "@workspace/db";
import { requireAuth, requirePermission } from "./auth";

const router = Router();

router.post("/auth/memberships", requireAuth, requirePermission("users.manage"), async (req, res, next) => {
  try {
    const farmId = req.authUser!.activeFarmId;
    if (!farmId) return res.status(409).json({ message: "Select an active farm first" });

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const roleKey = String(req.body?.role ?? "field_worker");
    if (!email) return res.status(400).json({ message: "User email is required" });

    const farm = (await db.select({ id: farmsTable.id, name: farmsTable.name, status: farmsTable.status }).from(farmsTable).where(eq(farmsTable.id, farmId)).limit(1))[0];
    if (!farm) return res.status(404).json({ message: "Active farm not found" });
    if (farm.status !== "active") return res.status(409).json({ message: "Farm is not active" });

    const user = (await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1))[0];
    if (!user) return res.status(404).json({ message: "No user account exists with that email" });
    const baseRole = (await db.select().from(authRoles).where(eq(authRoles.id, user.roleId)).limit(1))[0];
    if (baseRole?.key === "platform_admin") return res.status(400).json({ message: "Platform administrators cannot be assigned as farm users" });

    const role = (await db.select().from(authRoles).where(eq(authRoles.key, roleKey)).limit(1))[0];
    if (!role || role.key === "platform_admin") return res.status(400).json({ message: "Unknown or unavailable farm role" });

    const existing = (await db.select().from(authUserFarms).where(and(eq(authUserFarms.userId, user.id), eq(authUserFarms.farmId, farmId))).limit(1))[0];
    if (existing) {
      if (!existing.active) {
        await db.update(authUserFarms).set({ active: true, roleId: role.id }).where(and(eq(authUserFarms.userId, user.id), eq(authUserFarms.farmId, farmId)));
      } else {
        return res.status(409).json({ message: "User is already assigned to this farm" });
      }
    } else {
      await db.insert(authUserFarms).values({ userId: user.id, farmId, roleId: role.id, active: true });
    }

    if (Array.isArray(req.body?.sections)) {
      await db.delete(authUserSections).where(and(eq(authUserSections.userId, user.id), eq(authUserSections.farmId, farmId)));
      for (const key of req.body.sections) {
        const section = (await db.select().from(authSections).where(eq(authSections.key, String(key))).limit(1))[0];
        if (section) await db.insert(authUserSections).values({ userId: user.id, farmId, sectionId: section.id }).onConflictDoNothing();
      }
    }

    await auditMembership(req.authUser!.id, "farm_membership_added", user.id, farmId, { role: role.key, sections: req.body?.sections });
    return res.status(201).json({ id: user.id, email: user.email, displayName: user.displayName, role: role.key, farmId, farmName: farm.name });
  } catch (error: any) {
    if (error?.code === "23505") return res.status(409).json({ message: "Farm membership already exists" });
    return next(error);
  }
});

router.patch("/auth/memberships/:userId", requireAuth, requirePermission("users.manage"), async (req, res, next) => {
  try {
    const farmId = req.authUser!.activeFarmId;
    const userId = Number(req.params.userId);
    if (!farmId) return res.status(409).json({ message: "Select an active farm first" });
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: "Invalid user id" });
    if (userId === req.authUser!.id && req.body?.active === false) return res.status(400).json({ message: "You cannot deactivate your own farm membership" });

    const membership = (await db.select().from(authUserFarms).where(and(eq(authUserFarms.userId, userId), eq(authUserFarms.farmId, farmId))).limit(1))[0];
    if (!membership) return res.status(404).json({ message: "User is not assigned to this farm" });

    const updates: { active?: boolean; roleId?: number } = {};
    if (req.body?.active !== undefined) {
      if (typeof req.body.active !== "boolean") return res.status(400).json({ message: "active must be a boolean" });
      updates.active = req.body.active;
    }
    if (req.body?.role !== undefined) {
      const role = (await db.select().from(authRoles).where(eq(authRoles.key, String(req.body.role))).limit(1))[0];
      if (!role || role.key === "platform_admin") return res.status(400).json({ message: "Unknown or unavailable farm role" });
      updates.roleId = role.id;
    }
    if (Object.keys(updates).length) await db.update(authUserFarms).set(updates).where(and(eq(authUserFarms.userId, userId), eq(authUserFarms.farmId, farmId)));

    if (Array.isArray(req.body?.sections)) {
      await db.delete(authUserSections).where(and(eq(authUserSections.userId, userId), eq(authUserSections.farmId, farmId)));
      for (const key of req.body.sections) {
        const section = (await db.select().from(authSections).where(eq(authSections.key, String(key))).limit(1))[0];
        if (section) await db.insert(authUserSections).values({ userId, farmId, sectionId: section.id }).onConflictDoNothing();
      }
    }

    await auditMembership(req.authUser!.id, "farm_membership_updated", userId, farmId, req.body);
    return res.json({ ok: true, userId, farmId });
  } catch (error) { return next(error); }
});

async function auditMembership(actorId: number, action: string, userId: number, farmId: string, details: unknown) {
  await db.insert(authAuditLogs).values({
    userId: actorId,
    farmId,
    action,
    entityType: "farm_membership",
    entityId: `${userId}:${farmId}`,
    details: JSON.stringify(details ?? {}),
  });
}

export default router;
