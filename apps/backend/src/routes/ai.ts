import { Router } from "express";
import createError from "http-errors";
import { requireAuth } from "../middleware/auth.js";
import {
  getTicket,
} from "../services/ticketService.js";
import {
  suggestReplyForTicket,
  getSuggestionsForTicket,
} from "../services/aiService.js";

const router = Router();

router.post(
  "/tickets/:ticketId/suggest",
  requireAuth,
  async (req, res, next) => {
    try {
      const ticket = await getTicket(req.params.ticketId, req.user!);
      const suggestion = await suggestReplyForTicket(ticket, req.user!.id);
      res.status(201).json(suggestion);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/tickets/:ticketId/suggestions",
  requireAuth,
  async (req, res, next) => {
    try {
      await getTicket(req.params.ticketId, req.user!);
      const suggestions = await getSuggestionsForTicket(req.params.ticketId);
      res.json(suggestions);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
