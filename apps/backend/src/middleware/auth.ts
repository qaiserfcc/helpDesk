import type { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/token.js";
import { prisma } from "../lib/prisma.js";

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw createError(401, "Authorization header missing");
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const userRecord = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: authUserSelect,
    });

    if (!userRecord) {
      throw createError(401, "User not found");
    }

    req.user = userRecord;
    // Debug: log report route auth usage to help diagnose 403 issues
    try {
      if (req.originalUrl?.includes("/reports")) {
        console.debug(`[auth] ${req.method} ${req.originalUrl} -> user=${req.user?.id} role=${req.user?.role}`);
      }
    } catch (err) {
      // swallow
    }
    next();
  } catch (error) {
    if (createError.isHttpError(error)) {
      next(error);
      return;
    }

    next(createError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(createError(401, "Authentication required"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(createError(403, "Insufficient permissions"));
      return;
    }

    next();
  };
}
