import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

// Get all categories (public for authenticated users)
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// Get single category
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Create category (admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, isActive, order } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        isActive: isActive ?? true,
        order: order ?? 0,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// Update category (admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, order } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
    });

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Delete category (admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      await prisma.category.delete({
        where: { id },
      });

      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

// Get all subcategories for a category
router.get("/:id/subcategories", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const subcategories = await prisma.subcategory.findMany({
      where: {
        categoryId: id,
        isActive: true,
      },
      orderBy: { order: "asc" },
    });

    res.json(subcategories);
  } catch (error) {
    next(error);
  }
});

// Create subcategory (admin only)
router.post(
  "/:id/subcategories",
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, order } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const subcategory = await prisma.subcategory.create({
        data: {
          name,
          description,
          categoryId: id,
          isActive: isActive ?? true,
          order: order ?? 0,
        },
      });

      res.status(201).json(subcategory);
    } catch (error) {
      next(error);
    }
  }
);

// Update subcategory (admin only)
router.put(
  "/:categoryId/subcategories/:id",
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, order } = req.body;

      const subcategory = await prisma.subcategory.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
          ...(order !== undefined && { order }),
        },
      });

      res.json(subcategory);
    } catch (error) {
      next(error);
    }
  }
);

// Delete subcategory (admin only)
router.delete(
  "/:categoryId/subcategories/:id",
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      await prisma.subcategory.delete({
        where: { id },
      });

      res.json({ message: "Subcategory deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
