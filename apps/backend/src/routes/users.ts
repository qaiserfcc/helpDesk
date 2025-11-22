import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createUser } from "../services/userService.js";

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role).optional(),
});

router.get("/me", requireAuth, (req, res) => {
  if (!req.user) {
    throw createError(401, "Not authenticated");
  }
  res.json({ user: req.user });
});

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

export default router;
