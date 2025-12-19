import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listSubcategories,
  getSubcategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "../services/categoryService.js";

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

const createSubcategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  categoryId: z.string().uuid(),
  active: z.boolean().optional(),
});

const updateSubcategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

router.use(requireAuth);

// Category routes
router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const activeOnly = req.query.active === "true";

  try {
    const categories = await listCategories(activeOnly);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.get("/:categoryId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const category = await getCategory(req.params.categoryId);
    res.json({ category });
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
    next(createError(403, "Only admins can create categories"));
    return;
  }

  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid category payload"));
    return;
  }

  try {
    const category = await createCategory(parsed.data);
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

router.patch("/:categoryId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update categories"));
    return;
  }

  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid category update payload"));
    return;
  }

  try {
    const category = await updateCategory(req.params.categoryId, parsed.data);
    res.json({ category });
  } catch (error) {
    next(error);
  }
});

router.delete("/:categoryId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete categories"));
    return;
  }

  try {
    await deleteCategory(req.params.categoryId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Subcategory routes
router.get("/:categoryId/subcategories", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const activeOnly = req.query.active === "true";

  try {
    const subcategories = await listSubcategories(
      req.params.categoryId,
      activeOnly,
    );
    res.json({ subcategories });
  } catch (error) {
    next(error);
  }
});

router.post("/subcategories", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can create subcategories"));
    return;
  }

  const parsed = createSubcategorySchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid subcategory payload"));
    return;
  }

  try {
    const subcategory = await createSubcategory(parsed.data);
    res.status(201).json({ subcategory });
  } catch (error) {
    next(error);
  }
});

router.get("/subcategories/:subcategoryId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const subcategory = await getSubcategory(req.params.subcategoryId);
    res.json({ subcategory });
  } catch (error) {
    next(error);
  }
});

router.patch("/subcategories/:subcategoryId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can update subcategories"));
    return;
  }

  const parsed = updateSubcategorySchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid subcategory update payload"));
    return;
  }

  try {
    const subcategory = await updateSubcategory(
      req.params.subcategoryId,
      parsed.data,
    );
    res.json({ subcategory });
  } catch (error) {
    next(error);
  }
});

router.delete("/subcategories/:subcategoryId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete subcategories"));
    return;
  }

  try {
    await deleteSubcategory(req.params.subcategoryId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
