import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  listSubcategoriesByCategory,
  getSubcategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "../services/subcategoryService.js";

const router = Router();

const subcategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
  })
  .strict();

router.use(requireAuth);

router.get("/category/:categoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const subcategories = await listSubcategoriesByCategory(
      req.params.categoryId,
      req.user,
    );
    res.json({ subcategories });
  } catch (err) {
    next(err);
  }
});

router.get("/:subcategoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const subcategory = await getSubcategory(
      req.params.subcategoryId,
      req.user,
    );
    res.json({ subcategory });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can create subcategories"));
  const parsed = subcategorySchema.safeParse(req.body);
  if (!parsed.success)
    return next(createError(400, "Invalid subcategory payload"));
  try {
    const subcategory = await createSubcategory(parsed.data, req.user);
    res.status(201).json({ subcategory });
  } catch (err) {
    next(err);
  }
});

router.patch("/:subcategoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can update subcategories"));
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success)
    return next(createError(400, "Invalid subcategory update"));
  try {
    const subcategory = await updateSubcategory(
      req.params.subcategoryId,
      parsed.data,
      req.user,
    );
    res.json({ subcategory });
  } catch (err) {
    next(err);
  }
});

router.delete("/:subcategoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can delete subcategories"));
  try {
    const subcategory = await deleteSubcategory(
      req.params.subcategoryId,
      req.user,
    );
    res.status(200).json({ subcategory });
  } catch (err) {
    next(err);
  }
});

export default router;
