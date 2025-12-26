import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listTicketTags,
  getTicketTag,
  createTicketTag,
  updateTicketTag,
  deleteTicketTag,
  addTagToTicket,
  removeTagFromTicket,
  getTicketTags,
} from "../services/ticketTagService.js";

const router = Router();

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).optional(),
  description: z.string().max(200).optional(),
  active: z.boolean().optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(20).optional(),
  description: z.string().max(200).optional(),
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
    const tags = await listTicketTags(activeOnly);
    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

router.get("/:tagId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const tag = await getTicketTag(req.params.tagId);
    res.json({ tag });
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
    next(createError(403, "Only admins can create tags"));
    return;
  }

  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid tag payload"));
    return;
  }

  try {
    const tag = await createTicketTag(parsed.data);
    res.status(201).json({ tag });
  } catch (error) {
    next(error);
  }
});

router.patch("/:tagId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update tags"));
    return;
  }

  const parsed = updateTagSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid tag update payload"));
    return;
  }

  try {
    const tag = await updateTicketTag(req.params.tagId, parsed.data);
    res.json({ tag });
  } catch (error) {
    next(error);
  }
});

router.delete("/:tagId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete tags"));
    return;
  }

  try {
    await deleteTicketTag(req.params.tagId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Ticket tag assignment
router.post("/tickets/:ticketId/:tagId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const relation = await addTagToTicket(req.params.ticketId, req.params.tagId);
    res.status(201).json({ relation });
  } catch (error) {
    next(error);
  }
});

router.delete("/tickets/:ticketId/:tagId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    await removeTagFromTicket(req.params.ticketId, req.params.tagId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/tickets/:ticketId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const tags = await getTicketTags(req.params.ticketId);
    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

export default router;
