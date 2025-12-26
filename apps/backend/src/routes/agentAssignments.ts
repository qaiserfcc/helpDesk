import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role, TicketPriority } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listAgentAssignments,
  getAgentAssignment,
  createAgentAssignment,
  updateAgentAssignment,
  deleteAgentAssignment,
  getRecommendedAgent,
} from "../services/agentAssignmentService.js";

const router = Router();

const createAssignmentSchema = z.object({
  // Accept non-UUID string IDs for categories/subcategories
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1).nullable().optional(),
  // Agent IDs remain UUIDs
  agentId: z.string().uuid(),
  priority: z.nativeEnum(TicketPriority).nullable().optional(),
  active: z.boolean().optional(),
});

const updateAssignmentSchema = z.object({
  agentId: z.string().uuid().optional(),
  priority: z.nativeEnum(TicketPriority).nullable().optional(),
  active: z.boolean().optional(),
});

const recommendAgentSchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1).nullable().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

router.use(requireAuth);

// List agent assignments
router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const categoryId =
    typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const subcategoryId =
    typeof req.query.subcategoryId === "string"
      ? req.query.subcategoryId
      : undefined;
  const activeOnly = req.query.active === "true";

  try {
    const assignments = await listAgentAssignments(
      categoryId,
      subcategoryId,
      activeOnly,
    );
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
});

// Get recommended agent
router.post("/recommend", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = recommendAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid recommendation payload"));
    return;
  }

  try {
    const agent = await getRecommendedAgent(
      parsed.data.categoryId,
      parsed.data.subcategoryId,
      parsed.data.priority,
    );
    res.json({ agent });
  } catch (error) {
    next(error);
  }
});

// Get single agent assignment
router.get("/:assignmentId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const assignment = await getAgentAssignment(req.params.assignmentId);
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});

// Create agent assignment
router.post("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can create agent assignments"));
    return;
  }

  const parsed = createAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid agent assignment payload"));
    return;
  }

  try {
    const assignment = await createAgentAssignment(parsed.data);
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
});

// Update agent assignment
router.patch("/:assignmentId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update agent assignments"));
    return;
  }

  const parsed = updateAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid agent assignment update payload"));
    return;
  }

  try {
    const assignment = await updateAgentAssignment(
      req.params.assignmentId,
      parsed.data,
    );
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});

// Delete agent assignment
router.delete("/:assignmentId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete agent assignments"));
    return;
  }

  try {
    await deleteAgentAssignment(req.params.assignmentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
