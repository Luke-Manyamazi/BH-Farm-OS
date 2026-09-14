import { Router, type IRouter } from "express";
import healthRouter from "./health";
import farmOverridesRouter from "./farm-overrides";
import farmRouter from "./farm";
import operationsRouter from "./operations";
import demoRouter from "./demo";
import goatManagementRouter from "./goat-management";

const router: IRouter = Router();

router.use(healthRouter);
// Keep live aggregate routes before the legacy farm routes so the dashboard,
// livestock summary, zones and alerts use the new operational records.
router.use(farmOverridesRouter);
router.use(farmRouter);
router.use(operationsRouter);
router.use(goatManagementRouter);
router.use(demoRouter);

export default router;
