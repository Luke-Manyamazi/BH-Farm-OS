import { and, desc, eq, gt } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { authSessions, authUserFarms, db, farmsTable } from "@workspace/db";
import { tokenHash } from "../routes/auth";

export type ActiveFarmContext = {
  farmId: string;
  farmName: string;
  timezone: string;
};

declare global {
  namespace Express {
    interface Request {
      farmContext?: ActiveFarmContext;
    }
  }
}

export async function resolveActiveFarm(req: Request): Promise<ActiveFarmContext> {
  const userId = req.authUser?.id;
  if (!userId) throw new Error("Authentication required");

  const token = req.cookies?.bh_session;
  if (!token) throw new Error("Active session required");

  const session = (await db
    .select()
    .from(authSessions)
    .where(
      and(
        eq(authSessions.userId, userId),
        eq(authSessions.tokenHash, tokenHash(token)),
        gt(authSessions.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1))[0];

  if (!session) throw new Error("Session expired or invalid");

  let farmId = session.activeFarmId;
  if (farmId) {
    const membership = (await db
      .select({ farmId: authUserFarms.farmId })
      .from(authUserFarms)
      .where(
        and(
          eq(authUserFarms.userId, userId),
          eq(authUserFarms.farmId, farmId),
          eq(authUserFarms.active, true),
        ),
      )
      .limit(1))[0];

    // Platform admins intentionally do not need a membership row for a farm,
    // but the selected farm must still exist and be active.
    if (!membership && req.authUser?.role !== "platform_admin") farmId = null;
  }

  if (!farmId) {
    const memberships = await db
      .select({ farmId: authUserFarms.farmId })
      .from(authUserFarms)
      .where(and(eq(authUserFarms.userId, userId), eq(authUserFarms.active, true)))
      .orderBy(desc(authUserFarms.createdAt));

    if (memberships.length === 0) throw new Error("No active farm assigned to this user");
    if (memberships.length > 1) throw new Error("Active farm context required");

    farmId = memberships[0].farmId;
    await db
      .update(authSessions)
      .set({ activeFarmId: farmId })
      .where(eq(authSessions.id, session.id));
  }

  const farm = (await db
    .select({ name: farmsTable.name, settings: farmsTable.settings, status: farmsTable.status })
    .from(farmsTable)
    .where(and(eq(farmsTable.id, farmId), eq(farmsTable.status, "active")))
    .limit(1))[0];

  if (!farm) throw new Error("Active farm is unavailable");

  const settings = farm.settings ?? {};
  const timezone = typeof settings.timezone === "string" && settings.timezone ? settings.timezone : "UTC";
  return { farmId, farmName: farm.name, timezone };
}

export async function requireActiveFarmContext(req: Request, res: Response, next: NextFunction) {
  try {
    req.farmContext = await resolveActiveFarm(req);
    return next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Active farm context required";
    const status = message === "Authentication required" ? 401 : 409;
    return res.status(status).json({ message });
  }
}
