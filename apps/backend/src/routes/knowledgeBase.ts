import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  listKnowledgeArticles,
  getKnowledgeArticle,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
  rateArticle,
  searchKnowledgeBase,
} from "../services/knowledgeBaseService.js";

const router = Router();

const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  summary: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
});

const updateArticleSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
});

const rateArticleSchema = z.object({
  helpful: z.boolean(),
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const published = req.query.published === "true" ? true : req.query.published === "false" ? false : undefined;
  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const searchTerm = typeof req.query.search === "string" ? req.query.search : undefined;

  try {
    const articles = await listKnowledgeArticles(published, categoryId, searchTerm);
    res.json({ articles });
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const query = typeof req.query.q === "string" ? req.query.q : "";
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

  try {
    const articles = await searchKnowledgeBase(query, limit);
    res.json({ articles });
  } catch (error) {
    next(error);
  }
});

router.get("/:articleId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const article = await getKnowledgeArticle(req.params.articleId);
    res.json({ article });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin && req.user.role !== Role.agent) {
    next(createError(403, "Only admins and agents can create knowledge articles"));
    return;
  }

  const parsed = createArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid article payload"));
    return;
  }

  try {
    const article = await createKnowledgeArticle({
      ...parsed.data,
      authorId: req.user.id,
    });
    res.status(201).json({ article });
  } catch (error) {
    next(error);
  }
});

router.patch("/:articleId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin && req.user.role !== Role.agent) {
    next(createError(403, "Only admins and agents can update knowledge articles"));
    return;
  }

  const parsed = updateArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid article update payload"));
    return;
  }

  try {
    const article = await updateKnowledgeArticle(req.params.articleId, parsed.data);
    res.json({ article });
  } catch (error) {
    next(error);
  }
});

router.delete("/:articleId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role !== Role.admin) {
    next(createError(403, "Only admins can delete knowledge articles"));
    return;
  }

  try {
    await deleteKnowledgeArticle(req.params.articleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/:articleId/rate", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = rateArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid rating payload"));
    return;
  }

  try {
    const article = await rateArticle(req.params.articleId, parsed.data.helpful);
    res.json({ article });
  } catch (error) {
    next(error);
  }
});

export default router;
