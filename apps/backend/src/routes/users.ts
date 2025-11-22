import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createUser,
  deleteUser,
  getUserProfile,
  listUsers,
  updateUser,
} from "../services/userService.js";
import { MIN_PASSWORD_LENGTH } from "../constants/auth.js";

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  role: z.nativeEnum(Role).optional(),
});

const listUsersSchema = z.object({
  role: z.nativeEnum(Role).optional(),
});

const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
});

const updateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    password: z.string().min(MIN_PASSWORD_LENGTH).optional(),
    role: z.nativeEnum(Role).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

router.get("/me", requireAuth, (req, res) => {
  if (!req.user) {
    throw createError(401, "Not authenticated");
  }
  res.json({ user: req.user });
});

router.get(
  "/",
  requireAuth,
  requireRole(Role.admin),
  async (req, res, next) => {
    const parsed = listUsersSchema.safeParse(req.query);
    if (!parsed.success) {
      next(createError(400, "Invalid user filters"));
      return;
    }

    try {
      const users = await listUsers(parsed.data);
      res.json({ users });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  requireAuth,
  requireRole(Role.admin),
  async (req, res, next) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      next(createError(400, "Invalid user payload"));
      return;
    }

    try {
      const user = await createUser(parsed.data);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:userId",
  requireAuth,
  requireRole(Role.admin),
  async (req, res, next) => {
    const params = userIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      next(createError(400, "Invalid user id"));
      return;
    }

    try {
      const user = await getUserProfile(params.data.userId);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:userId",
  requireAuth,
  requireRole(Role.admin),
  async (req, res, next) => {
    const params = userIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      next(createError(400, "Invalid user id"));
      return;
    }

    const parsedBody = updateUserSchema.safeParse(req.body);
    if (!parsedBody.success) {
      next(createError(400, "Invalid user payload"));
      return;
    }

    try {
      const user = await updateUser(params.data.userId, parsedBody.data);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:userId",
  requireAuth,
  requireRole(Role.admin),
  async (req, res, next) => {
    const params = userIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      next(createError(400, "Invalid user id"));
      return;
    }

    try {
      const user = await deleteUser(params.data.userId);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
