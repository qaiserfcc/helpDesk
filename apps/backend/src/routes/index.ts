import { Router } from "express";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import ticketsRouter from "./tickets.js";
import reportsRouter from "./reports.js";
import aiRouter from "./ai.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/tickets", ticketsRouter);
router.use("/reports", reportsRouter);
router.use("/ai", aiRouter);

router.get("/version", (_req, res) => {
  res.json({
    service: "helpdesk-backend",
    version: "0.1.0",
  });
});

export default router;
