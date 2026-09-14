import { Router, type IRouter } from "express";
import healthRouter from "./health";
import farmRouter from "./farm";
import operationsRouter from "./operations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(farmRouter);
router.use(operationsRouter);

export default router;
