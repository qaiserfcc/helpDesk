import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { AttributeType } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  createAttribute,
  listAttributes,
  getAttribute,
  updateAttribute,
  deleteAttribute,
} from "../services/attributeService.js";

const router = Router();

const createAttributeSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9_]+$/,
      "Name must be lowercase alphanumeric with underscores",
    ),
  label: z.string().min(1).max(100),
  type: z.nativeEnum(AttributeType),
  options: z.array(z.string().min(1)).optional(),
  defaultValue: z.string().optional(),
  isMandatory: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const updateAttributeSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(AttributeType).optional(),
  options: z.array(z.string().min(1)).optional(),
  defaultValue: z.string().nullable().optional(),
  isMandatory: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const attributes = await listAttributes(req.user);
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
    const attribute = await getAttribute(req.params.attributeId, req.user);
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

  const parsed = createAttributeSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid attribute payload"));
    return;
  }

  try {
    const attribute = await createAttribute(parsed.data, req.user);
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

  const parsed = updateAttributeSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid attribute update payload"));
    return;
  }

  try {
    const attribute = await updateAttribute(
      req.params.attributeId,
      parsed.data,
      req.user,
    );
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

  try {
    const result = await deleteAttribute(req.params.attributeId, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
