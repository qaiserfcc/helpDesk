import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role, TicketPriority } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listSLAs,
  getSLA,
  createSLA,
  updateSLA,
  deleteSLA,
} from "../services/slaService.js";

const router = Router();

const createSLASchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  // Accept non-UUID string IDs (our seeded IDs use readable strings)
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1).nullable().optional(),
  priority: z.enum([TicketPriority.low, TicketPriority.medium, TicketPriority.high]),
  responseTimeMinutes: z.number().int().positive(),
  resolutionTimeMinutes: z.number().int().positive(),
  active: z.boolean().optional(),
});

const updateSLASchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  subcategoryId: z.string().min(1).nullable().optional(),
  priority: z.enum([TicketPriority.low, TicketPriority.medium, TicketPriority.high]).optional(),
  responseTimeMinutes: z.number().int().positive().optional(),
  resolutionTimeMinutes: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

router.use(requireAuth);

// List SLAs (optionally filtered by category)
router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const categoryId = req.query.categoryId as string | undefined;
  const activeOnly = req.query.active === "true";

  try {
    const slas = await listSLAs(categoryId, activeOnly);
    res.json({ slas });
  } catch (error) {
    next(error);
  }
});

// Get single SLA
router.get("/:slaId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const sla = await getSLA(req.params.slaId);
    res.json({ sla });
  } catch (error) {
    next(error);
  }
});

// Create SLA
router.post("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can create SLAs"));
    return;
  }

  const parsed = createSLASchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid SLA payload"));
    return;
  }

  try {
    const sla = await createSLA(parsed.data);
    res.status(201).json({ sla });
  } catch (error) {
    next(error);
  }
});

// Update SLA
router.patch("/:slaId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update SLAs"));
    return;
  }

  const parsed = updateSLASchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid SLA update payload"));
    return;
  }

  try {
    const sla = await updateSLA(req.params.slaId, parsed.data);
    res.json({ sla });
  } catch (error) {
    next(error);
  }
});

// Delete SLA
router.delete("/:slaId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete SLAs"));
    return;
  }

  try {
    const result = await deleteSLA(req.params.slaId);
    res.json({ result });
  } catch (error) {
    next(error);
  }
});

export default router;
