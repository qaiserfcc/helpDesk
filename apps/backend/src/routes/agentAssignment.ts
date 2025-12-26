import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listAssignmentRules,
  getAssignmentRule,
  createAssignmentRule,
  updateAssignmentRule,
  deleteAssignmentRule,
  findBestAgent,
} from "../services/agentAssignmentService.js";

const router = Router();

const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.number().int().optional(),
  active: z.boolean().optional(),
  conditions: z.record(z.unknown()).optional(),
  assignmentStrategy: z.string().optional(),
  skillId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  priority: z.number().int().optional(),
  active: z.boolean().optional(),
  conditions: z.record(z.unknown()).optional(),
  assignmentStrategy: z.string().optional(),
  skillId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

const findAgentSchema = z.object({
  categoryId: z.string().uuid().optional(),
  priority: z.string().optional(),
  skillId: z.string().uuid().optional(),
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can view assignment rules"));
    return;
  }

  const activeOnly = req.query.active === "true";

  try {
    const rules = await listAssignmentRules(activeOnly);
    res.json({ rules });
  } catch (error) {
    next(error);
  }
});

router.get("/:ruleId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can view assignment rules"));
    return;
  }

  try {
    const rule = await getAssignmentRule(req.params.ruleId);
    res.json({ rule });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can create assignment rules"));
    return;
  }

  const parsed = createRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid assignment rule payload"));
    return;
  }

  try {
    const rule = await createAssignmentRule(parsed.data);
    res.status(201).json({ rule });
  } catch (error) {
    next(error);
  }
});

router.patch("/:ruleId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update assignment rules"));
    return;
  }

  const parsed = updateRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid assignment rule update payload"));
    return;
  }

  try {
    const rule = await updateAssignmentRule(req.params.ruleId, parsed.data);
    res.json({ rule });
  } catch (error) {
    next(error);
  }
});

router.delete("/:ruleId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete assignment rules"));
    return;
  }

  try {
    await deleteAssignmentRule(req.params.ruleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Find best agent for assignment
router.post("/find-agent", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = findAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid find agent payload"));
    return;
  }

  try {
    const agentId = await findBestAgent(
      parsed.data.categoryId,
      parsed.data.priority,
      parsed.data.skillId,
    );
    res.json({ agentId });
  } catch (error) {
    next(error);
  }
});

export default router;
