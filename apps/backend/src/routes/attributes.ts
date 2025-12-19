import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role, AttributeType } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listAttributes,
  getAttribute,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getTicketAttributeValues,
  setTicketAttributeValue,
  deleteTicketAttributeValue,
  validateTicketAttributes,
} from "../services/attributeService.js";

const router = Router();

const createAttributeSchema = z.object({
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.nativeEnum(AttributeType),
  mandatory: z.boolean().optional(),
  visible: z.boolean().optional(),
  options: z.record(z.unknown()).nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const updateAttributeSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  type: z.nativeEnum(AttributeType).optional(),
  mandatory: z.boolean().optional(),
  visible: z.boolean().optional(),
  options: z.record(z.unknown()).nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const setAttributeValueSchema = z.object({
  value: z.string(),
});

router.use(requireAuth);

// Attribute definition routes
router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const activeOnly = req.query.active === "true";

  try {
    const attributes = await listAttributes(activeOnly);
    res.json({ attributes });
  } catch (error) {
    next(error);
  }
});

router.get("/:attributeId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const attribute = await getAttribute(req.params.attributeId);
    res.json({ attribute });
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
    next(createError(403, "Only admins can create attributes"));
    return;
  }

  const parsed = createAttributeSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid attribute payload"));
    return;
  }

  try {
    const attribute = await createAttribute(parsed.data);
    res.status(201).json({ attribute });
  } catch (error) {
    next(error);
  }
});

router.patch("/:attributeId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update attributes"));
    return;
  }

  const parsed = updateAttributeSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid attribute update payload"));
    return;
  }

  try {
    const attribute = await updateAttribute(req.params.attributeId, parsed.data);
    res.json({ attribute });
  } catch (error) {
    next(error);
  }
});

router.delete("/:attributeId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete attributes"));
    return;
  }

  try {
    await deleteAttribute(req.params.attributeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Ticket attribute value routes
router.get("/tickets/:ticketId/values", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const values = await getTicketAttributeValues(req.params.ticketId);
    res.json({ values });
  } catch (error) {
    next(error);
  }
});

router.put("/tickets/:ticketId/values/:attributeId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = setAttributeValueSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid attribute value payload"));
    return;
  }

  try {
    const value = await setTicketAttributeValue(
      req.params.ticketId,
      req.params.attributeId,
      parsed.data.value,
    );
    res.json({ value });
  } catch (error) {
    next(error);
  }
});

router.delete("/tickets/:ticketId/values/:attributeId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    await deleteTicketAttributeValue(req.params.ticketId, req.params.attributeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/tickets/:ticketId/validate", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const validation = await validateTicketAttributes(req.params.ticketId);
    res.json(validation);
  } catch (error) {
    next(error);
  }
});

export default router;
