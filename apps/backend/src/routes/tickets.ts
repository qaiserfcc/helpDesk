import path from "node:path";
import { Router } from "express";
import createError from "http-errors";
import multer from "multer";
import { z } from "zod";
import { IssueType, Role, TicketPriority, TicketStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import {
  appendAttachments,
  assignTicket,
  createTicket,
  getTicket,
  getTicketDiff,
  ingestQueuedTickets,
  listTickets,
  resolveTicket,
  updateTicket,
} from "../services/ticketService.js";
import { attachmentsDir } from "../config/attachments.js";

const router = Router();

const createTicketSchema = z.object({
  description: z.string().min(4),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.medium),
  issueType: z.nativeEnum(IssueType).default(IssueType.other),
  attachments: z.array(z.string().min(1)).optional(),
});

const updateTicketSchema = z.object({
  description: z.string().min(4).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  issueType: z.nativeEnum(IssueType).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
});

const listTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  issueType: z.nativeEnum(IssueType).optional(),
  assignedToMe: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const assignSchema = z.object({
  assigneeId: z.string().uuid().optional(),
});

const syncSchema = z.object({
  tickets: z
    .array(
      z.object({
        tempId: z.string().min(1),
        description: z.string().min(4),
        priority: z.nativeEnum(TicketPriority).optional(),
        issueType: z.nativeEnum(IssueType).optional(),
        attachments: z.array(z.string()).optional(),
        createdAt: z.string().datetime().optional(),
      }),
    )
    .max(25),
});

const diffQuerySchema = z.object({
  since: z.string().datetime(),
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = listTicketSchema.safeParse(req.query);
  if (!parsed.success) {
    next(createError(400, "Invalid query parameters"));
    return;
  }

  try {
    const tickets = await listTickets(
      {
        status: parsed.data.status,
        issueType: parsed.data.issueType,
        assignedToMe: parsed.data.assignedToMe,
        limit: parsed.data.limit,
      },
      req.user,
    );
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.get("/diff", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = diffQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    next(createError(400, "Invalid diff parameters"));
    return;
  }

  try {
    const since = new Date(parsed.data.since);
    const tickets = await getTicketDiff(since, req.user);
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.post("/sync", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid sync payload"));
    return;
  }

  try {
    const results = await ingestQueuedTickets(parsed.data.tickets, req.user);
    res.json({ tickets: results });
  } catch (error) {
    next(error);
  }
});

router.get("/:ticketId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  try {
    const ticket = await getTicket(req.params.ticketId, req.user);
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid ticket payload"));
    return;
  }

  try {
    const ticket = await createTicket(parsed.data, req.user);
    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.patch("/:ticketId", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid ticket update payload"));
    return;
  }

  try {
    const ticket = await updateTicket(
      req.params.ticketId,
      parsed.data,
      req.user,
    );
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.post("/:ticketId/assign", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role === Role.user) {
    next(createError(403, "Only agents can assign tickets"));
    return;
  }

  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    next(createError(400, "Invalid assignment payload"));
    return;
  }

  try {
    const ticket = await assignTicket(
      req.params.ticketId,
      parsed.data.assigneeId,
      req.user,
    );
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.post("/:ticketId/resolve", async (req, res, next) => {
  if (!req.user) {
    next(createError(401, "Authentication required"));
    return;
  }

  if (req.user.role === Role.user) {
    next(createError(403, "Only agents can resolve tickets"));
    return;
  }

  try {
    const ticket = await resolveTicket(req.params.ticketId, req.user);
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:ticketId/attachments",
  upload.array("files", 5),
  async (req, res, next) => {
    if (!req.user) {
      next(createError(401, "Authentication required"));
      return;
    }

    try {
      const files = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [];
      if (!files.length) {
        next(createError(400, "No files uploaded"));
        return;
      }

      const attachmentPaths = files.map((file) =>
        path.relative(process.cwd(), file.path),
      );
      const ticket = await appendAttachments(
        req.params.ticketId,
        attachmentPaths,
        req.user,
      );
      res.status(201).json({ ticket, attachments: attachmentPaths });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
