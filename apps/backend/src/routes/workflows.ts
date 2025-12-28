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
    const workflow = await workflowService.getWorkflow(req.params.id, req.user!);
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
    const deleted = await workflowService.deleteWorkflow(req.params.id, req.user!);
    res.json(deleted);
  } catch (error) {
    next(error);
  }
});

// Get workflow progress for a ticket
router.get("/ticket/:ticketId/progress", requireAuth, async (req, res, next) => {
  try {
    const progress = await workflowService.getWorkflowProgress(req.params.ticketId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

// Complete a workflow step
router.post("/ticket/:ticketId/step/:stepId/complete", requireAuth, async (req, res, next) => {
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
});

// Get current step for a ticket
router.get("/ticket/:ticketId/current-step", requireAuth, async (req, res, next) => {
  try {
    const step = await workflowService.getCurrentWorkflowStep(req.params.ticketId);
    res.json(step);
  } catch (error) {
    next(error);
  }
});

export default router;
