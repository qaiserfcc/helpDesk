import { Router } from 'express';
import createError from 'http-errors';
import { z } from 'zod';
import { IssueType, Role, TicketPriority } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const createTicketSchema = z.object({
  description: z.string().min(4),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.medium),
  issueType: z.nativeEnum(IssueType).default(IssueType.other)
});

router.use(requireAuth);

router.get('/', requireRole(Role.agent, Role.admin), async (_req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } }
      }
    });
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  if (!req.user) {
    next(createError(401, 'Authentication required'));
    return;
  }

  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, 'Invalid ticket payload'));
    return;
  }

  try {
    const ticket = await prisma.ticket.create({
      data: {
        description: parsed.data.description,
        issueType: parsed.data.issueType,
        priority: parsed.data.priority,
        createdBy: req.user.id
      },
      include: {
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

export default router;
