import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { TicketStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  getTicketStatusSummary,
  listRecentTicketActivity,
} from "../services/ticketService.js";
import {
  getAdminEscalationReport,
  getAdminOverviewReport,
  getAdminProductivityReport,
  getAgentWorkloadReport,
  getTicketExportDataset,
  getUserTicketReport,
  ticketsToCsv,
} from "../services/reportService.js";

const router = Router();

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const productivityQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(30).optional(),
});

const exportQuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  scope: z.enum(["auto", "user", "agent", "admin"]).default("auto"),
  agentId: z.string().uuid().optional(),
  creatorId: z.string().uuid().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
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

router.get("/users/me/tickets", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const report = await getUserTicketReport(req.user);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.get("/agents/me/workload", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const report = await getAgentWorkloadReport(req.user);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/overview", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const report = await getAdminOverviewReport(req.user);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/escalations", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const report = await getAdminEscalationReport(req.user);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/productivity", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = productivityQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    next(createError(400, "Invalid productivity query parameters"));
    return;
  }

  try {
    const report = await getAdminProductivityReport(
      req.user,
      parsed.data.days,
    );
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.get("/tickets/export", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = exportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    next(createError(400, "Invalid export parameters"));
    return;
  }

  try {
    const dataset = await getTicketExportDataset(
      req.user,
      parsed.data.scope,
      {
        agentId: parsed.data.agentId,
        creatorId: parsed.data.creatorId,
        status: parsed.data.status,
      },
    );

    if (parsed.data.format === "csv") {
      const csv = ticketsToCsv(dataset.tickets);
      res.header("Content-Type", "text/csv");
      res.attachment(`tickets-${dataset.scope}.csv`);
      res.send(csv);
      return;
    }

    res.json(dataset);
  } catch (error) {
    next(error);
  }
});

export default router;
