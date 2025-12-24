import { Router } from "express";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import ticketsRouter from "./tickets.js";
import reportsRouter from "./reports.js";
import aiRouter from "./ai.js";
import categoriesRouter from "./categories.js";
import attributesRouter from "./attributes.js";
import workflowsRouter from "./workflows.js";
import slasRouter from "./slas.js";
import agentSkillsRouter from "./agentSkills.js";
import agentAssignmentRouter from "./agentAssignment.js";
import knowledgeBaseRouter from "./knowledgeBase.js";
import cannedResponsesRouter from "./cannedResponses.js";
import ticketTemplatesRouter from "./ticketTemplates.js";
import ticketTagsRouter from "./ticketTags.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/tickets", ticketsRouter);
router.use("/reports", reportsRouter);
router.use("/ai", aiRouter);
router.use("/categories", categoriesRouter);
router.use("/attributes", attributesRouter);
router.use("/workflows", workflowsRouter);
router.use("/slas", slasRouter);
router.use("/agent-skills", agentSkillsRouter);
router.use("/agent-assignment", agentAssignmentRouter);
router.use("/knowledge-base", knowledgeBaseRouter);
router.use("/canned-responses", cannedResponsesRouter);
router.use("/ticket-templates", ticketTemplatesRouter);
router.use("/ticket-tags", ticketTagsRouter);

router.get("/version", (_req, res) => {
  res.json({
    service: "helpdesk-backend",
    version: "0.1.0",
  });
});

export default router;
