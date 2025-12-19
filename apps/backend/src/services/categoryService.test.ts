import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../lib/prisma.js";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
} from "./categoryService.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    ticketCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ticketSubcategory: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("categoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listCategories", () => {
    it("should list all categories", async () => {
      const mockCategories = [
        {
          id: "cat1",
          name: "IT Support",
          description: "IT related issues",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.ticketCategory.findMany).mockResolvedValue(
        mockCategories,
      );

      const result = await listCategories();

      expect(result).toEqual(mockCategories);
      expect(prisma.ticketCategory.findMany).toHaveBeenCalledWith({
        where: undefined,
        select: expect.any(Object),
        orderBy: { name: "asc" },
      });
    });

    it("should filter active categories when activeOnly is true", async () => {
      vi.mocked(prisma.ticketCategory.findMany).mockResolvedValue([]);

      await listCategories(true);

      expect(prisma.ticketCategory.findMany).toHaveBeenCalledWith({
        where: { active: true },
        select: expect.any(Object),
        orderBy: { name: "asc" },
      });
    });
  });

  describe("getCategory", () => {
    it("should return a category by id", async () => {
      const mockCategory = {
        id: "cat1",
        name: "IT Support",
        description: "IT related issues",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        subcategories: [],
      };

      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(
        mockCategory,
      );

      const result = await getCategory("cat1");

      expect(result).toEqual(mockCategory);
      expect(prisma.ticketCategory.findUnique).toHaveBeenCalledWith({
        where: { id: "cat1" },
        include: { subcategories: { orderBy: { name: "asc" } } },
      });
    });

    it("should throw 404 error when category not found", async () => {
      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(null);

      await expect(getCategory("invalid")).rejects.toThrow("Category not found");
    });
  });

  describe("createCategory", () => {
    it("should create a new category", async () => {
      const input = {
        name: "HR Support",
        description: "HR related issues",
        active: true,
      };

      const mockCreated = {
        id: "cat2",
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        subcategories: [],
      };

      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.ticketCategory.create).mockResolvedValue(mockCreated);

      const result = await createCategory(input);

      expect(result).toEqual(mockCreated);
      expect(prisma.ticketCategory.create).toHaveBeenCalledWith({
        data: input,
        include: { subcategories: true },
      });
    });

    it("should throw 409 error when category name already exists", async () => {
      const input = { name: "IT Support", description: "Test" };

      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue({
        id: "cat1",
        name: "IT Support",
        description: "Existing",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(createCategory(input)).rejects.toThrow(
        "Category with this name already exists",
      );
    });
  });

  describe("updateCategory", () => {
    it("should update an existing category", async () => {
      const existing = {
        id: "cat1",
        name: "IT Support",
        description: "Old description",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updates = { description: "New description" };

      const mockUpdated = {
        ...existing,
        ...updates,
        subcategories: [],
      };

      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(existing);
      vi.mocked(prisma.ticketCategory.update).mockResolvedValue(mockUpdated);

      const result = await updateCategory("cat1", updates);

      expect(result).toEqual(mockUpdated);
      expect(prisma.ticketCategory.update).toHaveBeenCalledWith({
        where: { id: "cat1" },
        data: updates,
        include: { subcategories: true },
      });
    });

    it("should throw 404 error when category not found", async () => {
      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(null);

      await expect(updateCategory("invalid", { name: "Test" })).rejects.toThrow(
        "Category not found",
      );
    });
  });

  describe("createSubcategory", () => {
    it("should create a new subcategory", async () => {
      const input = {
        name: "Hardware Issues",
        description: "Computer hardware problems",
        categoryId: "cat1",
        active: true,
      };

      const mockCategory = {
        id: "cat1",
        name: "IT Support",
        description: "IT issues",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreated = {
        id: "subcat1",
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        active: input.active,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
      };

      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(
        mockCategory,
      );
      vi.mocked(prisma.ticketSubcategory.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.ticketSubcategory.create).mockResolvedValue(
        mockCreated,
      );

      const result = await createSubcategory(input);

      expect(result).toEqual(mockCreated);
      expect(prisma.ticketSubcategory.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          active: input.active,
        },
        include: { category: true },
      });
    });

    it("should throw 404 error when category not found", async () => {
      const input = {
        name: "Test Subcategory",
        categoryId: "invalid",
      };

      vi.mocked(prisma.ticketCategory.findUnique).mockResolvedValue(null);

      await expect(createSubcategory(input)).rejects.toThrow(
        "Category not found",
      );
    });
  });
});
