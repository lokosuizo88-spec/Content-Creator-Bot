import { Router, type IRouter } from "express";
import healthRouter from "./health";
import postsRouter from "./posts";
import statsRouter from "./stats";
import templatesRouter from "./templates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(postsRouter);
router.use(statsRouter);
router.use(templatesRouter);

export default router;
