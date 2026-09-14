import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, authPermissions, authRolePermissions, authRoles } from "@workspace/db";
import { requireAuth } from "./auth";

const router = Router();
const ROLE_PERMISSION_KEYS: Record<string,string[]> = {
  owner_admin:["dashboard.view","farm.view","farm.edit","farm.delete","finance.view","finance.edit","users.manage","settings.manage","reports.view"],
  farm_manager:["dashboard.view","farm.view","farm.edit","farm.delete","finance.view","finance.edit","reports.view"],
  farm_supervisor:["dashboard.view","farm.view","farm.edit","reports.view"],
  section_head:["dashboard.view","farm.view","farm.edit"],
  field_worker:["dashboard.view","farm.view","farm.edit"],
};
router.post("/auth/ensure-permissions",requireAuth,async(req,res,next)=>{try{const role=(await db.select().from(authRoles).where(eq(authRoles.key,req.authUser!.role)).limit(1))[0];if(!role)return res.status(400).json({message:"Role not found"});const keys=ROLE_PERMISSION_KEYS[role.key]||ROLE_PERMISSION_KEYS.field_worker;const permissions=await db.select().from(authPermissions);for(const permission of permissions.filter(p=>keys.includes(p.key)))await db.insert(authRolePermissions).values({roleId:role.id,permissionId:permission.id}).onConflictDoNothing();return res.json({ok:true});}catch(error){return next(error)}});
export default router;
