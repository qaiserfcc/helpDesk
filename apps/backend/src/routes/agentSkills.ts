import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listAgentSkills,
  getAgentSkill,
  createAgentSkill,
  updateAgentSkill,
  deleteAgentSkill,
  assignSkillToUser,
  removeSkillFromUser,
  getUserSkills,
} from "../services/agentSkillService.js";

const router = Router();

const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

const assignSkillSchema = z.object({
  userId: z.string().uuid(),
  skillId: z.string().uuid(),
  proficiency: z.number().int().min(1).max(5).optional(),
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const activeOnly = req.query.active === "true";

  try {
    const skills = await listAgentSkills(activeOnly);
    res.json({ skills });
  } catch (error) {
    next(error);
  }
});

router.get("/:skillId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const skill = await getAgentSkill(req.params.skillId);
    res.json({ skill });
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
    next(createError(403, "Only admins can create agent skills"));
    return;
  }

  const parsed = createSkillSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid skill payload"));
    return;
  }

  try {
    const skill = await createAgentSkill(parsed.data);
    res.status(201).json({ skill });
  } catch (error) {
    next(error);
  }
});

router.patch("/:skillId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update agent skills"));
    return;
  }

  const parsed = updateSkillSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid skill update payload"));
    return;
  }

  try {
    const skill = await updateAgentSkill(req.params.skillId, parsed.data);
    res.json({ skill });
  } catch (error) {
    next(error);
  }
});

router.delete("/:skillId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete agent skills"));
    return;
  }

  try {
    await deleteAgentSkill(req.params.skillId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Assign skill to user
router.post("/assign", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can assign skills"));
    return;
  }

  const parsed = assignSkillSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid assignment payload"));
    return;
  }

  try {
    const userSkill = await assignSkillToUser(parsed.data);
    res.status(201).json({ userSkill });
  } catch (error) {
    next(error);
  }
});

// Remove skill from user
router.delete("/assign/:userId/:skillId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can remove skill assignments"));
    return;
  }

  try {
    await removeSkillFromUser(req.params.userId, req.params.skillId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get user skills
router.get("/users/:userId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const skills = await getUserSkills(req.params.userId);
    res.json({ skills });
  } catch (error) {
    next(error);
  }
});

export default router;
