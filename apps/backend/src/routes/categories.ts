import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  listCategories,
  listAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/categoryService.js";

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

const updateSchema = categorySchema.partial();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const categories = await listCategories(req.user);
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

router.get("/all", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const categories = await listAllCategories(req.user);
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

router.get("/:categoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  try {
    const category = await getCategory(req.params.categoryId, req.user);
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can create categories"));
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success)
    return next(createError(400, "Invalid category payload"));
  try {
    const category = await createCategory(parsed.data, req.user);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

router.patch("/:categoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can update categories"));
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return next(createError(400, "Invalid category update"));
  try {
    const category = await updateCategory(
      req.params.categoryId,
      parsed.data,
      req.user,
    );
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

router.delete("/:categoryId", async (req, res, next) => {
  if (!req.user) return next(createError(401, "Authentication required"));
  if (req.user.role !== "admin")
    return next(createError(403, "Only admins can delete categories"));
  try {
    const category = await deleteCategory(req.params.categoryId, req.user);
    res.status(200).json({ category });
  } catch (err) {
    next(err);
  }
});

export default router;
