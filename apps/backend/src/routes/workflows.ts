import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as workflowService from "../services/workflowService.js";

const router = Router();

// List all workflows (active only)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const workflows = await workflowService.listWorkflows(req.user!);
    res.json(workflows);
  } catch (error) {
    next(error);
  }
});

// List all workflows (including inactive)
router.get("/all", requireAuth, async (req, res, next) => {
  try {
    const workflows = await workflowService.listAllWorkflows(req.user!);
    res.json(workflows);
  } catch (error) {
    next(error);
  }
});

// Get a specific workflow
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const workflow = await workflowService.getWorkflow(
      req.params.id,
      req.user!,
    );
    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

// Create a new workflow
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { steps, ...workflowData } = req.body;
    const workflow = await workflowService.createWorkflow(
      workflowData,
      steps || [],
      req.user!,
    );
    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
});

// Update a workflow
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { steps, ...updates } = req.body;
    const workflow = await workflowService.updateWorkflow(
      req.params.id,
      updates,
      req.user!,
      steps,
    );
    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

// Delete a workflow
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const deleted = await workflowService.deleteWorkflow(
      req.params.id,
      req.user!,
    );
    res.json(deleted);
  } catch (error) {
    next(error);
  }
});

// Get workflow progress for a ticket
router.get(
  "/ticket/:ticketId/progress",
  requireAuth,
  async (req, res, next) => {
    try {
      const progress = await workflowService.getWorkflowProgress(
        req.params.ticketId,
      );
      res.json(progress);
    } catch (error) {
      next(error);
    }
  },
);

// Complete a workflow step
router.post(
  "/ticket/:ticketId/step/:stepId/complete",
  requireAuth,
  async (req, res, next) => {
    try {
      const { comment } = req.body;
      const completion = await workflowService.completeWorkflowStep(
        req.params.ticketId,
        req.params.stepId,
        req.user!.id,
        comment,
      );
      res.json(completion);
    } catch (error) {
      next(error);
    }
  },
);

// Get current step for a ticket
router.get(
  "/ticket/:ticketId/current-step",
  requireAuth,
  async (req, res, next) => {
    try {
      const step = await workflowService.getCurrentWorkflowStep(
        req.params.ticketId,
      );
      res.json(step);
    } catch (error) {
      next(error);
    }
  },
);

// Set current step for a ticket
router.post(
  "/ticket/:ticketId/current-step",
  requireAuth,
  async (req, res, next) => {
    try {
      const { stepId } = req.body as { stepId?: string };
      if (!stepId) {
        res.status(400).json({ error: "stepId is required" });
        return;
      }

      const result = await workflowService.setCurrentWorkflowStep(
        req.params.ticketId,
        stepId,
        req.user!,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// Move current step forward/back for a ticket
router.post(
  "/ticket/:ticketId/current-step/move",
  requireAuth,
  async (req, res, next) => {
    try {
      const { direction } = req.body as { direction?: "next" | "prev" };
      if (direction !== "next" && direction !== "prev") {
        res
          .status(400)
          .json({ error: "direction must be 'next' or 'prev'" });
        return;
      }

      const result = await workflowService.moveCurrentWorkflowStep(
        req.params.ticketId,
        direction,
        req.user!,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// Request more info (keeps current step, blocks completion)
router.post(
  "/ticket/:ticketId/more-info/request",
  requireAuth,
  async (req, res, next) => {
    try {
      const { question } = req.body as { question?: string };
      const result = await workflowService.requestMoreInfo(
        req.params.ticketId,
        question ?? "",
        req.user!,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// Respond to more info request (creator only)
router.post(
  "/ticket/:ticketId/more-info/respond",
  requireAuth,
  async (req, res, next) => {
    try {
      const { response } = req.body as { response?: string };
      const result = await workflowService.respondToMoreInfo(
        req.params.ticketId,
        response ?? "",
        req.user!,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
