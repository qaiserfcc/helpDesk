import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role, WorkflowStepAction } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  listWorkflowSteps,
  getWorkflowStep,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  evaluateWorkflowForTicket,
  getNextWorkflowStep,
  canUserPerformAction,
} from "../services/workflowService.js";

const router = Router();

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  version: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});

const createWorkflowStepSchema = z.object({
  workflowId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  order: z.number().int().min(0),
  initiatorRole: z.nativeEnum(Role).nullable().optional(),
  allowedActions: z.array(z.nativeEnum(WorkflowStepAction)),
  conditions: z.record(z.unknown()).optional(),
});

const updateWorkflowStepSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  order: z.number().int().min(0).optional(),
  initiatorRole: z.nativeEnum(Role).nullable().optional(),
  allowedActions: z.array(z.nativeEnum(WorkflowStepAction)).optional(),
  conditions: z.record(z.unknown()).nullable().optional(),
});

const evaluateWorkflowSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  initiatorRole: z.nativeEnum(Role),
});

const getNextStepSchema = z.object({
  currentStepId: z.string().uuid().nullable(),
  initiatorRole: z.nativeEnum(Role),
  workflowId: z.string().uuid(),
});

const canPerformActionSchema = z.object({
  stepId: z.string().uuid(),
  action: z.nativeEnum(WorkflowStepAction),
  userRole: z.nativeEnum(Role),
});

router.use(requireAuth);

// Workflow routes
router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const categoryId = req.query.categoryId as string | undefined;
  const activeOnly = req.query.active === "true";

  try {
    const workflows = await listWorkflows(categoryId, activeOnly);
    res.json({ workflows });
  } catch (error) {
    next(error);
  }
});

router.get("/:workflowId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const workflow = await getWorkflow(req.params.workflowId);
    res.json({ workflow });
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
    next(createError(403, "Only admins can create workflows"));
    return;
  }

  const parsed = createWorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid workflow payload"));
    return;
  }

  try {
    const workflow = await createWorkflow(parsed.data);
    res.status(201).json({ workflow });
  } catch (error) {
    next(error);
  }
});

router.patch("/:workflowId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update workflows"));
    return;
  }

  const parsed = updateWorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid workflow update payload"));
    return;
  }

  try {
    const workflow = await updateWorkflow(req.params.workflowId, parsed.data);
    res.json({ workflow });
  } catch (error) {
    next(error);
  }
});

router.delete("/:workflowId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete workflows"));
    return;
  }

  try {
    await deleteWorkflow(req.params.workflowId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Workflow step routes
router.get("/:workflowId/steps", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const steps = await listWorkflowSteps(req.params.workflowId);
    res.json({ steps });
  } catch (error) {
    next(error);
  }
});

router.post("/steps", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can create workflow steps"));
    return;
  }

  const parsed = createWorkflowStepSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid workflow step payload"));
    return;
  }

  try {
    const step = await createWorkflowStep(parsed.data);
    res.status(201).json({ step });
  } catch (error) {
    next(error);
  }
});

router.get("/steps/:stepId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const step = await getWorkflowStep(req.params.stepId);
    res.json({ step });
  } catch (error) {
    next(error);
  }
});

router.patch("/steps/:stepId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update workflow steps"));
    return;
  }

  const parsed = updateWorkflowStepSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid workflow step update payload"));
    return;
  }

  try {
    const step = await updateWorkflowStep(req.params.stepId, parsed.data);
    res.json({ step });
  } catch (error) {
    next(error);
  }
});

router.delete("/steps/:stepId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete workflow steps"));
    return;
  }

  try {
    await deleteWorkflowStep(req.params.stepId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Workflow evaluation routes
router.post("/evaluate", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = evaluateWorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid workflow evaluation payload"));
    return;
  }

  try {
    const workflow = await evaluateWorkflowForTicket(
      parsed.data.categoryId,
      parsed.data.initiatorRole,
    );
    res.json({ workflow });
  } catch (error) {
    next(error);
  }
});

router.post("/next-step", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = getNextStepSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid next step payload"));
    return;
  }

  try {
    const nextStep = await getNextWorkflowStep(
      parsed.data.currentStepId,
      parsed.data.initiatorRole,
      parsed.data.workflowId,
    );
    res.json({ nextStep });
  } catch (error) {
    next(error);
  }
});

router.post("/can-perform-action", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = canPerformActionSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid action validation payload"));
    return;
  }

  try {
    const canPerform = await canUserPerformAction(
      parsed.data.stepId,
      parsed.data.action,
      parsed.data.userRole,
    );
    res.json({ canPerform });
  } catch (error) {
    next(error);
  }
});

export default router;
