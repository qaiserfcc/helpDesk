import { Router } from 'express';
import createError from 'http-errors';
import { z } from 'zod';
import { login, refreshSession } from '../services/authService.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

router.post('/login', async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, 'Invalid login payload'));
    return;
  }

  try {
    const result = await login(parsed.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, 'Refresh token required'));
    return;
  }

  try {
    const result = await refreshSession(parsed.data.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
