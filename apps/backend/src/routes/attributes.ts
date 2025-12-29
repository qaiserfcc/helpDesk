import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { AttributeType, Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listAttributes,
  listAllAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from "../services/attributeService.js";

const router = Router();

const attributeSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.nativeEnum(AttributeType),
  options: z.array(z.string().min(1)).default([]),
  required: z.boolean().default(false),
  visibleTo: z.array(z.nativeEnum(Role)).default([]),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});

const updateSchema = attributeSchema.partial();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const attrs = await listAttributes(req.user);
    res.json({ attributes: attrs });
  } catch (err) {
    next(err);
  }
});

router.get("/all", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const attrs = await listAllAttributes(req.user);
    res.json({ attributes: attrs });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== Role.admin)
    return next(createError(403, "Only admins can create attributes"));
  const parsed = attributeSchema.safeParse(req.body);
  if (!parsed.success)
    return next(createError(400, "Invalid attribute payload"));
  try {
    const attr = await createAttribute(parsed.data, req.user);
    res.status(201).json({ attribute: attr });
  } catch (err) {
    next(err);
  }
});

router.patch("/:attributeId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== Role.admin)
    return next(createError(403, "Only admins can update attributes"));
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success)
    return next(createError(400, "Invalid attribute update"));
  try {
    const attr = await updateAttribute(
      req.params.attributeId,
      parsed.data,
      req.user,
    );
    res.json({ attribute: attr });
  } catch (err) {
    next(err);
  }
});

router.delete("/:attributeId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== Role.admin)
    return next(createError(403, "Only admins can delete attributes"));
  try {
    const attr = await deleteAttribute(req.params.attributeId, req.user);
    res.status(200).json({ attribute: attr });
  } catch (err) {
    next(err);
  }
});

export default router;
