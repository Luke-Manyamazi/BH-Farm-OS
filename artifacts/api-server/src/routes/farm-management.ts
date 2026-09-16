import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, authAuditLogs, farmsTable } from "@workspace/db";
import { requirePermission } from "./auth";

const router: IRouter = Router();

function farmId(req: any): string {
  const id = req.farmContext?.farmId;
  if (!id) throw new Error("Active farm context required");
  return id;
}

router.get("/farm-management", async (req, res, next) => {
  try {
    const id = farmId(req);
    const farm = (await db.select().from(farmsTable).where(eq(farmsTable.id, id)).limit(1))[0];
    if (!farm) return res.status(404).json({ message: "Farm not found" });
    return res.json(farm);
  } catch (error) { return next(error); }
});

router.patch("/farm-management", requirePermission("settings.manage"), async (req, res, next) => {
  try {
    const id = farmId(req);
    const current = (await db.select().from(farmsTable).where(eq(farmsTable.id, id)).limit(1))[0];
    if (!current) return res.status(404).json({ message: "Farm not found" });

    const name = req.body?.name == null ? current.name : String(req.body.name).trim();
    if (!name) return res.status(400).json({ message: "Farm name is required" });
    const status = req.body?.status == null ? current.status : String(req.body.status);
    if (!["onboarding", "active", "suspended"].includes(status)) return res.status(400).json({ message: "Invalid farm status" });
    if (req.authUser?.role !== "platform_admin" && status !== current.status) return res.status(403).json({ message: "Only the platform administrator can change farm lifecycle status" });

    const profile = req.body?.profile && typeof req.body.profile === "object" ? req.body.profile : current.profile;
    const settings = req.body?.settings && typeof req.body.settings === "object" ? req.body.settings : current.settings;
    const [updated] = await db.update(farmsTable).set({ name, status, profile, settings, updatedAt: new Date() }).where(eq(farmsTable.id, id)).returning();
    await db.insert(authAuditLogs).values({ userId: req.authUser?.id ?? null, farmId: id, action: "farm_updated", entityType: "farm", entityId: id, details: JSON.stringify({ status, name }) });
    return res.json(updated);
  } catch (error: any) {
    if (error?.code === "23505") return res.status(409).json({ message: "A farm with this name already exists" });
    return next(error);
  }
});

export default router;
