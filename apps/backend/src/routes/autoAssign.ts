import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  listAutoAssignments,
  listAutoAssignmentsBySubcategory,
  getAutoAssignment,
  createAutoAssignment,
  updateAutoAssignment,
  deleteAutoAssignment,
  getAutoAssignmentForSubcategory,
} from "../services/autoAssignService.js";

const router = Router();

const autoAssignSchema = z.object({
  subcategoryId: z.string().min(1),
  agentId: z.string().min(1),
  priority: z.number().int().default(0),
  active: z.boolean().default(true),
});

const updateSchema = z
  .object({
    priority: z.number().int().optional(),
    active: z.boolean().optional(),
  })
  .strict();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can list auto-assignments"));
  try {
    const autoAssignments = await listAutoAssignments(req.user);
    res.json({ autoAssignments });
  } catch (err) {
    next(err);
  }
});

router.get("/subcategory/:subcategoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can list auto-assignments"));
  try {
    const autoAssignments = await listAutoAssignmentsBySubcategory(
      req.params.subcategoryId,
      req.user,
    );
    res.json({ autoAssignments });
  } catch (err) {
    next(err);
  }
});

router.get("/resolve/:subcategoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const autoAssignment = await getAutoAssignmentForSubcategory(
      req.params.subcategoryId,
    );
    res.json({ autoAssignment });
  } catch (err) {
    next(err);
  }
});

router.get("/:autoAssignId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can view auto-assignments"));
  try {
    const autoAssignment = await getAutoAssignment(
      req.params.autoAssignId,
      req.user,
    );
    res.json({ autoAssignment });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can create auto-assignments"));
  const parsed = autoAssignSchema.safeParse(req.body);
  if (!parsed.success)
    return next(createError(400, "Invalid auto-assignment payload"));
  try {
    const autoAssignment = await createAutoAssignment(parsed.data, req.user);
    res.status(201).json({ autoAssignment });
  } catch (err) {
    next(err);
  }
});

router.patch("/:autoAssignId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can update auto-assignments"));
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success)
    return next(createError(400, "Invalid auto-assignment update"));
  try {
    const autoAssignment = await updateAutoAssignment(
      req.params.autoAssignId,
      parsed.data,
      req.user,
    );
    res.json({ autoAssignment });
  } catch (err) {
    next(err);
  }
});

router.delete("/:autoAssignId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can delete auto-assignments"));
  try {
    const autoAssignment = await deleteAutoAssignment(
      req.params.autoAssignId,
      req.user,
    );
    res.status(200).json({ autoAssignment });
  } catch (err) {
    next(err);
  }
});

export default router;
