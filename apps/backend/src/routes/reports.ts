import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  getTicketStatusSummary,
  listRecentTicketActivity,
} from "../services/ticketService.js";

const router = Router();

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

router.use(requireAuth);

router.get("/tickets/activity", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = activityQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    next(createError(400, "Invalid activity query parameters"));
    return;
  }

  try {
    const activities = await listRecentTicketActivity(
      parsed.data.limit ?? 50,
      req.user,
    );
    res.json({ activities });
  } catch (error) {
    next(error);
  }
});

router.get("/tickets/status-summary", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const summary = await getTicketStatusSummary(req.user);
    res.json({ summary });
  } catch (error) {
    next(error);
  }
});

export default router;
