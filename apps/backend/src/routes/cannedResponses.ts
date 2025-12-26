import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listCannedResponses,
  getCannedResponse,
  getCannedResponseByShortcut,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  searchCannedResponses,
} from "../services/cannedResponseService.js";

const router = Router();

const createResponseSchema = z.object({
  title: z.string().min(1).max(200),
  shortcut: z.string().min(1).max(50),
  content: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  active: z.boolean().optional(),
});

const updateResponseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  shortcut: z.string().min(1).max(50).optional(),
  content: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  active: z.boolean().optional(),
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const activeOnly = req.query.active === "true";
  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;

  try {
    const responses = await listCannedResponses(activeOnly, categoryId);
    res.json({ responses });
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const query = typeof req.query.q === "string" ? req.query.q : "";

  try {
    const responses = await searchCannedResponses(query);
    res.json({ responses });
  } catch (error) {
    next(error);
  }
});

router.get("/shortcut/:shortcut", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const response = await getCannedResponseByShortcut(req.params.shortcut);
    res.json({ response });
  } catch (error) {
    next(error);
  }
});

router.get("/:responseId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const response = await getCannedResponse(req.params.responseId);
    res.json({ response });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin && req.user.role !== Role.agent) {
    next(createError(403, "Only admins and agents can create canned responses"));
    return;
  }

  const parsed = createResponseSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid canned response payload"));
    return;
  }

  try {
    const response = await createCannedResponse({
      ...parsed.data,
      createdBy: req.user.id,
    });
    res.status(201).json({ response });
  } catch (error) {
    next(error);
  }
});

router.patch("/:responseId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin && req.user.role !== Role.agent) {
    next(createError(403, "Only admins and agents can update canned responses"));
    return;
  }

  const parsed = updateResponseSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid canned response update payload"));
    return;
  }

  try {
    const response = await updateCannedResponse(req.params.responseId, parsed.data);
    res.json({ response });
  } catch (error) {
    next(error);
  }
});

router.delete("/:responseId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete canned responses"));
    return;
  }

  try {
    await deleteCannedResponse(req.params.responseId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
