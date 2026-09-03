import { Router, type IRouter } from "express";
import healthRouter from "./health";
import farmRouter from "./farm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(farmRouter);

export default router;
