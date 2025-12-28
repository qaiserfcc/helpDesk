import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  listSlas,
  listSlasBySubcategory,
  getSla,
  createSla,
  updateSla,
  deleteSla,
} from "../services/slaService.js";

const router = Router();

const slaSchema = z.object({
  subcategoryId: z.string().min(1),
  name: z.string().min(1),
  responseTimeHours: z.number().positive(),
  resolutionTimeHours: z.number().positive(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    responseTimeHours: z.number().positive().optional(),
    resolutionTimeHours: z.number().positive().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
  })
  .strict();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const slas = await listSlas(req.user);
    res.json({ slas });
  } catch (err) {
    next(err);
  }
});

router.get("/subcategory/:subcategoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const slas = await listSlasBySubcategory(
      req.params.subcategoryId,
      req.user,
    );
    res.json({ slas });
  } catch (err) {
    next(err);
  }
});

router.get("/:slaId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const sla = await getSla(req.params.slaId, req.user);
    res.json({ sla });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can create SLAs"));
  const parsed = slaSchema.safeParse(req.body);
  if (!parsed.success) return next(createError(400, "Invalid SLA payload"));
  try {
    const sla = await createSla(parsed.data, req.user);
    res.status(201).json({ sla });
  } catch (err) {
    next(err);
  }
});

router.patch("/:slaId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can update SLAs"));
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return next(createError(400, "Invalid SLA update"));
  try {
    const sla = await updateSla(req.params.slaId, parsed.data, req.user);
    res.json({ sla });
  } catch (err) {
    next(err);
  }
});

router.delete("/:slaId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can delete SLAs"));
  try {
    const sla = await deleteSla(req.params.slaId, req.user);
    res.status(200).json({ sla });
  } catch (err) {
    next(err);
  }
});

export default router;
