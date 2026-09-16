import { Router } from "express";
import { randomBytes, scryptSync } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, authAuditLogs, authRoles, authSections, authUserFarms, authUserSections, authUsers, farmsTable } from "@workspace/db";
import { requireAuth, requirePermission } from "./auth";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

router.post("/auth/farms/onboard", requireAuth, requirePermission("platform.farms.manage"), async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const displayName = String(req.body?.displayName ?? "").trim();
    const password = String(req.body?.password ?? "");
    const timezone = String(req.body?.timezone ?? "UTC").trim() || "UTC";
    if (!name || !email || !displayName || password.length < 12) {
      return res.status(400).json({ message: "Farm name, owner name, owner email and a password of at least 12 characters are required" });
    }

    const result = await db.transaction(async (tx) => {
      const ownerRole = (await tx.select().from(authRoles).where(eq(authRoles.key, "owner_admin")).limit(1))[0];
      if (!ownerRole) throw new Error("Owner role is not initialized");

      const existingUser = (await tx.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, email)).limit(1))[0];
      if (existingUser) throw new Error("A user with that email already exists; use farm membership assignment instead");

      const [farm] = await tx.insert(farmsTable).values({ name, status: "active", settings: { timezone } }).returning();
      const [user] = await tx.insert(authUsers).values({ email, displayName, passwordHash: hashPassword(password), roleId: ownerRole.id }).returning();
      await tx.insert(authUserFarms).values({ userId: user.id, farmId: farm.id, roleId: ownerRole.id, active: true });

      const sections = await tx.select().from(authSections);
      for (const section of sections) {
        await tx.insert(authUserSections).values({ userId: user.id, farmId: farm.id, sectionId: section.id }).onConflictDoNothing();
      }

      return { farm, user };
    });

    await db.insert(authAuditLogs).values({
      userId: req.authUser!.id,
      farmId: result.farm.id,
      action: "farm_onboarded",
      entityType: "farm",
      entityId: result.farm.id,
      details: JSON.stringify({ ownerUserId: result.user.id, ownerEmail: result.user.email }),
    });

    return res.status(201).json({
      farm: { id: result.farm.id, name: result.farm.name, status: result.farm.status },
      owner: { id: result.user.id, email: result.user.email, displayName: result.user.displayName, role: "owner_admin" },
    });
  } catch (error: any) {
    if (error?.message === "A user with that email already exists; use farm membership assignment instead") return res.status(409).json({ message: error.message });
    if (error?.code === "23505") return res.status(409).json({ message: "A farm or user with these details already exists" });
    return next(error);
  }
});

export default router;
