import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role, TicketPriority, IssueType } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listTicketTemplates,
  getTicketTemplate,
  createTicketTemplate,
  updateTicketTemplate,
  deleteTicketTemplate,
} from "../services/ticketTemplateService.js";

const router = Router();

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  issueType: z.nativeEnum(IssueType).optional(),
  defaultDescription: z.string().optional(),
  attributeDefaults: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  issueType: z.nativeEnum(IssueType).optional(),
  defaultDescription: z.string().optional(),
  attributeDefaults: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const activeOnly = req.query.active === "true";

  try {
    const templates = await listTicketTemplates(activeOnly);
    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

router.get("/:templateId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const template = await getTicketTemplate(req.params.templateId);
    res.json({ template });
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
    next(createError(403, "Only admins can create ticket templates"));
    return;
  }

  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid template payload"));
    return;
  }

  try {
    const template = await createTicketTemplate({
      ...parsed.data,
      createdBy: req.user.id,
    });
    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
});

router.patch("/:templateId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update ticket templates"));
    return;
  }

  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid template update payload"));
    return;
  }

  try {
    const template = await updateTicketTemplate(req.params.templateId, parsed.data);
    res.json({ template });
  } catch (error) {
    next(error);
  }
});

router.delete("/:templateId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete ticket templates"));
    return;
  }

  try {
    await deleteTicketTemplate(req.params.templateId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
