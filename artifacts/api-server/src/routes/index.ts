import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter, { requireAuth } from "./auth";
import farmOverridesRouter from "./farm-overrides";
import farmRouter from "./farm";
import operationsRouter from "./operations";
import demoRouter from "./demo";
import goatManagementRouter from "./goat-management";
import poultryManagementRouter from "./poultry-management";
import pigManagementRouter from "./pig-management";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireAuth);
router.use(farmOverridesRouter);
router.use(farmRouter);
router.use(operationsRouter);
router.use(goatManagementRouter);
router.use(poultryManagementRouter);
router.use(pigManagementRouter);
router.use(demoRouter);

export default router;
