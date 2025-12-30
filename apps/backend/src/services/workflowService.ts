import createError from "http-errors";
import { Role, TicketActivityType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { publishTicketEvent } from "../realtime/ticketPublisher.js";

type RequestUser = Express.AuthenticatedUser;

export type WorkflowInput = {
  name: string;
  description?: string;
  roleFilter?: Role;
  categoryId?: string;
  subcategoryId?: string;
  isDefault?: boolean;
  active?: boolean;
};

export type WorkflowStepInput = {
  name: string;
  description?: string;
  order: number;
  requiredRole?: Role;
};

const workflowInclude = {
  steps: {
    orderBy: { order: "asc" as const },
  },
} as const;

const ticketActivityInclude = {
  actor: { select: { id: true, name: true, email: true, role: true } },
  fromAssignee: { select: { id: true, name: true, email: true } },
  toAssignee: { select: { id: true, name: true, email: true } },
} as const;

async function getTicketAudience(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, createdBy: true, assignedTo: true },
  });
}

async function publishTicketUpdated(ticketId: string) {
  const audience = await getTicketAudience(ticketId);
  if (!audience) {
    return;
  }
  publishTicketEvent({ type: "tickets:updated", ticket: audience as any });
}

async function publishActivity(ticketId: string, activity: any) {
  const audience = await getTicketAudience(ticketId);
  publishTicketEvent({
    type: "tickets:activity",
    ticketId,
    activity: activity as any,
    audience: audience as any,
  });
}

async function ensureTicketCurrentStep(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      workflowId: true,
      currentWorkflowStepId: true,
    },
  });

  if (!ticket?.workflowId) {
    return { ticket: null, steps: [], currentStepId: null };
  }

  const steps = await prisma.workflowStep.findMany({
    where: { workflowId: ticket.workflowId },
    orderBy: { order: "asc" },
  });

  if (steps.length === 0) {
    return { ticket, steps, currentStepId: null };
  }

  const validStepIds = new Set(steps.map((s) => s.id));
  if (ticket.currentWorkflowStepId && validStepIds.has(ticket.currentWorkflowStepId)) {
    return { ticket, steps, currentStepId: ticket.currentWorkflowStepId };
  }

  const existingCompletions = await prisma.workflowStepCompletion.findMany({
    where: { ticketId },
    select: { stepId: true },
  });
  const completedIds = new Set(existingCompletions.map((c) => c.stepId));

  const firstIncomplete = steps.find((s) => !completedIds.has(s.id)) ?? null;
  const nextId = firstIncomplete?.id ?? null;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { currentWorkflowStepId: nextId },
  });

  return { ticket, steps, currentStepId: nextId };
}

function assertCanManageTicketWorkflow(
  ticket: { createdBy: string; assignedTo: string | null },
  user: RequestUser,
) {
  if (user.role === "admin") return;
  if (ticket.assignedTo === user.id) return;
  throw createError(
    403,
    "You are not allowed to update workflow progress for this ticket",
  );
}

export async function listWorkflows(user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can list workflows");
  }
  return prisma.workflow.findMany({
    where: { active: true },
    include: workflowInclude,
    orderBy: { name: "asc" },
  });
}

export async function listAllWorkflows(user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can list all workflows");
  }
  return prisma.workflow.findMany({
    include: workflowInclude,
    orderBy: { name: "asc" },
  });
}

export async function getWorkflow(workflowId: string, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can view workflows");
  }
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: workflowInclude,
  });
  if (!workflow) {
    throw createError(404, "Workflow not found");
  }
  return workflow;
}

export async function createWorkflow(
  input: WorkflowInput,
  steps: WorkflowStepInput[],
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can create workflows");
  }

  if (!input.name?.trim()) {
    throw createError(400, "Workflow name is required");
  }

  if (!steps || steps.length === 0) {
    throw createError(400, "At least one workflow step is required");
  }

  // If this is marked as default, unset any existing default workflows
  if (input.isDefault) {
    await prisma.workflow.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim(),
      roleFilter: input.roleFilter,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      isDefault: input.isDefault ?? false,
      active: input.active ?? true,
      steps: {
        create: steps.map((step) => ({
          name: step.name.trim(),
          description: step.description?.trim(),
          order: step.order,
          requiredRole: step.requiredRole,
        })),
      },
    },
    include: workflowInclude,
  });

  return workflow;
}

export async function updateWorkflow(
  workflowId: string,
  updates: Partial<WorkflowInput>,
  user: RequestUser,
  steps?: WorkflowStepInput[],
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can update workflows");
  }

  const existing = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!existing) {
    throw createError(404, "Workflow not found");
  }

  // If this is being set as default, unset any existing default workflows
  if (updates.isDefault && !existing.isDefault) {
    await prisma.workflow.updateMany({
      where: { isDefault: true, id: { not: workflowId } },
      data: { isDefault: false },
    });
  }

  // If steps are provided, replace all existing steps
  const workflow = await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      name: updates.name?.trim() ?? existing.name,
      description: updates.description?.trim() ?? existing.description,
      roleFilter:
        updates.roleFilter !== undefined
          ? updates.roleFilter
          : existing.roleFilter,
      categoryId:
        updates.categoryId !== undefined
          ? updates.categoryId
          : existing.categoryId,
      subcategoryId:
        updates.subcategoryId !== undefined
          ? updates.subcategoryId
          : existing.subcategoryId,
      isDefault: updates.isDefault ?? existing.isDefault,
      active: updates.active ?? existing.active,
      ...(steps && {
        steps: {
          deleteMany: {},
          create: steps.map((step) => ({
            name: step.name.trim(),
            description: step.description?.trim(),
            order: step.order,
            requiredRole: step.requiredRole,
          })),
        },
      }),
    },
    include: workflowInclude,
  });

  return workflow;
}

export async function deleteWorkflow(workflowId: string, user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can delete workflows");
  }

  const existing = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!existing) {
    throw createError(404, "Workflow not found");
  }

  await prisma.workflow.delete({ where: { id: workflowId } });
  return existing;
}

// Find the appropriate workflow for a ticket
export async function findWorkflowForTicket(
  categoryId: string | null,
  subcategoryId: string | null,
  creatorRole: Role,
): Promise<string | null> {
  // Try to find a specific workflow matching category/subcategory and role
  let workflow = await prisma.workflow.findFirst({
    where: {
      active: true,
      roleFilter: creatorRole,
      categoryId: categoryId,
      subcategoryId: subcategoryId,
    },
    select: { id: true },
  });

  if (workflow) return workflow.id;

  // Try category and role only
  workflow = await prisma.workflow.findFirst({
    where: {
      active: true,
      roleFilter: creatorRole,
      categoryId: categoryId,
      subcategoryId: null,
    },
    select: { id: true },
  });

  if (workflow) return workflow.id;

  // Try subcategory and role
  workflow = await prisma.workflow.findFirst({
    where: {
      active: true,
      roleFilter: creatorRole,
      subcategoryId: subcategoryId,
      categoryId: null,
    },
    select: { id: true },
  });

  if (workflow) return workflow.id;

  // Try role only
  workflow = await prisma.workflow.findFirst({
    where: {
      active: true,
      roleFilter: creatorRole,
      categoryId: null,
      subcategoryId: null,
    },
    select: { id: true },
  });

  if (workflow) return workflow.id;

  // Try category only (no role filter)
  workflow = await prisma.workflow.findFirst({
    where: {
      active: true,
      roleFilter: null,
      categoryId: categoryId,
      subcategoryId: subcategoryId,
    },
    select: { id: true },
  });

  if (workflow) return workflow.id;

  // Try category only
  workflow = await prisma.workflow.findFirst({
    where: {
      active: true,
      roleFilter: null,
      categoryId: categoryId,
      subcategoryId: null,
    },
    select: { id: true },
  });

  if (workflow) return workflow.id;

  // Fall back to default workflow
  workflow = await prisma.workflow.findFirst({
    where: {
      active: true,
      isDefault: true,
    },
    select: { id: true },
  });

  return workflow?.id ?? null;
}

// Get current step for a ticket
export async function getCurrentWorkflowStep(ticketId: string) {
  const ensured = await ensureTicketCurrentStep(ticketId);
  if (!ensured.ticket?.workflowId || !ensured.currentStepId) {
    return null;
  }
  return ensured.steps.find((s) => s.id === ensured.currentStepId) ?? null;
}

export async function setCurrentWorkflowStep(
  ticketId: string,
  stepId: string,
  user: RequestUser,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      createdBy: true,
      assignedTo: true,
      workflowId: true,
      moreInfoRequestedAt: true,
      moreInfoResolvedAt: true,
    },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }
  if (!ticket.workflowId) {
    throw createError(400, "Ticket has no workflow");
  }

  assertCanManageTicketWorkflow(ticket, user);

  if (ticket.moreInfoRequestedAt && !ticket.moreInfoResolvedAt) {
    throw createError(400, "Cannot change steps while more information is pending");
  }

  const step = await prisma.workflowStep.findFirst({
    where: { id: stepId, workflowId: ticket.workflowId },
  });

  if (!step) {
    throw createError(404, "Step not found in ticket workflow");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { currentWorkflowStepId: stepId },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: user.id,
      type: TicketActivityType.ticket_update,
      comment: `Workflow moved to step: ${step.name}`,
    },
  });

  return { stepId };
}

export async function moveCurrentWorkflowStep(
  ticketId: string,
  direction: "next" | "prev",
  user: RequestUser,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      createdBy: true,
      assignedTo: true,
      workflowId: true,
      currentWorkflowStepId: true,
      moreInfoRequestedAt: true,
      moreInfoResolvedAt: true,
    },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }
  if (!ticket.workflowId) {
    throw createError(400, "Ticket has no workflow");
  }

  assertCanManageTicketWorkflow(ticket, user);

  if (ticket.moreInfoRequestedAt && !ticket.moreInfoResolvedAt) {
    throw createError(400, "Cannot change steps while more information is pending");
  }

  const steps = await prisma.workflowStep.findMany({
    where: { workflowId: ticket.workflowId },
    orderBy: { order: "asc" },
  });

  if (steps.length === 0) {
    throw createError(400, "Workflow has no steps");
  }

  const currentIndex = ticket.currentWorkflowStepId
    ? steps.findIndex((s) => s.id === ticket.currentWorkflowStepId)
    : -1;

  const fallbackIndex = direction === "prev" ? steps.length : -1;
  const baseIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;

  const nextIndex =
    direction === "next" ? baseIndex + 1 : Math.max(0, baseIndex - 1);

  if (direction === "next" && nextIndex >= steps.length) {
    throw createError(400, "Already at the last step");
  }

  const nextStep = steps[nextIndex];

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { currentWorkflowStepId: nextStep.id },
  });

  const activity = await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: user.id,
      type: TicketActivityType.ticket_update,
      comment: `Workflow moved to step: ${nextStep.name}`,
    },
    include: ticketActivityInclude,
  });

  await publishActivity(ticketId, activity);
  await publishTicketUpdated(ticketId);

  return { stepId: nextStep.id };
}

export async function requestMoreInfo(
  ticketId: string,
  question: string,
  user: RequestUser,
) {
  if (!question?.trim()) {
    throw createError(400, "Question is required");
  }

  const ensured = await ensureTicketCurrentStep(ticketId);
  if (!ensured.ticket?.workflowId || !ensured.currentStepId) {
    throw createError(400, "Ticket has no active workflow step");
  }

  const ticketAccess = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      createdBy: true,
      assignedTo: true,
      workflowId: true,
      moreInfoRequestedAt: true,
      moreInfoResolvedAt: true,
    },
  });

  if (!ticketAccess) {
    throw createError(404, "Ticket not found");
  }

  // Only assigned agent (or admin) can request more info
  if (user.role !== "admin" && ticketAccess.assignedTo !== user.id) {
    throw createError(403, "Only the assigned agent can request more information");
  }

  if (ticketAccess.moreInfoRequestedAt && !ticketAccess.moreInfoResolvedAt) {
    throw createError(400, "More information is already pending");
  }

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: user.id,
      content: question.trim(),
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });

  const commentActivity = await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: user.id,
      type: TicketActivityType.comment,
      commentId: comment.id,
      comment: question.trim(),
    },
    include: ticketActivityInclude,
  });

  await publishActivity(ticketId, commentActivity);

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      moreInfoRequestedAt: new Date(),
      moreInfoRequestedBy: user.id,
      moreInfoQuestion: question.trim(),
      moreInfoStepId: ensured.currentStepId,
      moreInfoCommentId: comment.id,
      moreInfoResponseCommentId: null,
      moreInfoResolvedAt: null,
      moreInfoResolvedBy: null,
    },
  });

  const updateActivity = await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: user.id,
      type: TicketActivityType.ticket_update,
      comment: "More information requested",
    },
    include: ticketActivityInclude,
  });

  await publishActivity(ticketId, updateActivity);
  await publishTicketUpdated(ticketId);

  return { commentId: comment.id };
}

export async function respondToMoreInfo(
  ticketId: string,
  response: string,
  user: RequestUser,
) {
  if (!response?.trim()) {
    throw createError(400, "Response is required");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      createdBy: true,
      assignedTo: true,
      moreInfoRequestedAt: true,
      moreInfoResolvedAt: true,
      moreInfoCommentId: true,
    },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (ticket.createdBy !== user.id) {
    throw createError(403, "Only the ticket creator can respond with more information");
  }

  if (!ticket.moreInfoRequestedAt || ticket.moreInfoResolvedAt) {
    throw createError(400, "No pending more-information request");
  }

  if (!ticket.moreInfoCommentId) {
    throw createError(400, "More-information request is missing a comment reference");
  }

  const reply = await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: user.id,
      content: response.trim(),
      parentId: ticket.moreInfoCommentId,
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });

  const replyActivity = await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: user.id,
      type: TicketActivityType.reply,
      commentId: reply.id,
      comment: response.trim(),
    },
    include: ticketActivityInclude,
  });

  await publishActivity(ticketId, replyActivity);

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      moreInfoResponseCommentId: reply.id,
      moreInfoResolvedAt: new Date(),
      moreInfoResolvedBy: user.id,
    },
  });

  const updateActivity = await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: user.id,
      type: TicketActivityType.ticket_update,
      comment: "More information provided",
    },
    include: ticketActivityInclude,
  });

  await publishActivity(ticketId, updateActivity);
  await publishTicketUpdated(ticketId);

  return { responseCommentId: reply.id };
}

// Complete a workflow step
export async function completeWorkflowStep(
  ticketId: string,
  stepId: string,
  userId: string,
  comment?: string,
) {
  // Verify ticket exists and has this workflow
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      workflow: {
        include: {
          steps: true,
        },
      },
      assignee: true,
      creator: true,
    },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (!ticket.workflow) {
    throw createError(400, "Ticket has no workflow");
  }

  const ensured = await ensureTicketCurrentStep(ticketId);
  const currentCursorId = ensured.currentStepId;

  if (currentCursorId && stepId !== currentCursorId) {
    throw createError(400, "Only the current step can be completed");
  }

  if (ticket.moreInfoRequestedAt && !ticket.moreInfoResolvedAt) {
    throw createError(400, "More information is pending; waiting for ticket creator response");
  }

  const step = ticket.workflow.steps.find((s) => s.id === stepId);
  if (!step) {
    throw createError(404, "Step not found in ticket workflow");
  }

  // Check if step is already completed
  const existing = await prisma.workflowStepCompletion.findUnique({
    where: { ticketId_stepId: { ticketId, stepId } },
  });

  if (existing) {
    throw createError(400, "Step already completed");
  }

  // Get the current user to check their role
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!currentUser) {
    throw createError(404, "User not found");
  }

  // Verify user has permission to complete this step based on requiredRole.
  // If requiredRole is not set, default to assigned agent (or admin).
  if (step.requiredRole === "admin") {
    if (currentUser.role !== "admin") {
      throw createError(403, "Only admins can complete this step");
    }
  } else if (step.requiredRole === "agent") {
    if (ticket.assignedTo !== userId) {
      throw createError(403, "Only the assigned agent can complete this step");
    }
  } else if (step.requiredRole === "user") {
    if (ticket.createdBy !== userId) {
      throw createError(403, "Only the ticket creator can complete this step");
    }
  } else {
    if (currentUser.role !== "admin" && ticket.assignedTo !== userId) {
      throw createError(403, "Only the assigned agent can complete this step");
    }
  }

  // Check if previous steps are completed
  const previousSteps = ticket.workflow.steps.filter(
    (s) => s.order < step.order,
  );
  if (previousSteps.length > 0) {
    const completedSteps = await prisma.workflowStepCompletion.findMany({
      where: {
        ticketId,
        stepId: { in: previousSteps.map((s) => s.id) },
      },
    });

    if (completedSteps.length !== previousSteps.length) {
      throw createError(400, "Previous steps must be completed first");
    }
  }

  // Create the completion record
  const completion = await prisma.workflowStepCompletion.create({
    data: {
      ticketId,
      stepId,
      completedBy: userId,
      comment,
    },
  });

  // Advance cursor to next incomplete step (keeps completion history)
  const completedAfter = await prisma.workflowStepCompletion.findMany({
    where: { ticketId },
    select: { stepId: true },
  });
  const completedAfterIds = new Set(completedAfter.map((c) => c.stepId));
  const orderedSteps = ticket.workflow.steps.slice().sort((a, b) => a.order - b.order);
  const nextStep = orderedSteps.find((s) => !completedAfterIds.has(s.id)) ?? null;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      currentWorkflowStepId: nextStep?.id ?? null,
    },
  });

  // Auto-update ticket status based on workflow progress
  const totalSteps = ticket.workflow.steps.length;
  const completedStepsCount = completedAfter.length;

  let newStatus = ticket.status;
  if (completedStepsCount >= totalSteps && totalSteps > 0) {
    newStatus = "resolved" as const;
  } else if (completedStepsCount > 0) {
    newStatus = "in_progress" as const;
  } else {
    newStatus = "open" as const;
  }

  // Update ticket status if needed
  if (newStatus !== ticket.status) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        resolvedAt: newStatus === "resolved" ? new Date() : null,
      },
    });

    // Log the status change activity
    const statusActivity = await prisma.ticketActivity.create({
      data: {
        ticketId,
        actorId: userId,
        type: "status_change",
        fromStatus: ticket.status,
        toStatus: newStatus,
        comment: `Status auto-updated to ${newStatus} upon workflow step completion`,
      },
      include: ticketActivityInclude,
    });

    await publishActivity(ticketId, statusActivity);
    await publishTicketUpdated(ticketId);
  }

  // Log activity for step completion
  const stepActivity = await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: userId,
      type: "step_completed",
      stepId,
      comment: `Completed step: ${step.name}${comment ? ` - ${comment}` : ""}`,
    },
    include: ticketActivityInclude,
  });

  await publishActivity(ticketId, stepActivity);
  await publishTicketUpdated(ticketId);

  return completion;
}

// Get workflow progress for a ticket
export async function getWorkflowProgress(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      workflow: {
        include: {
          steps: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!ticket?.workflow) {
    return null;
  }

  const completions = await prisma.workflowStepCompletion.findMany({
    where: { ticketId },
    include: {
      completedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const completionMap = new Map(completions.map((c) => [c.stepId, c]));

  const validStepIds = new Set(ticket.workflow.steps.map((s) => s.id));
  let currentStepId = ticket.currentWorkflowStepId;
  if (currentStepId && !validStepIds.has(currentStepId)) {
    currentStepId = null;
  }

  if (!currentStepId) {
    const firstIncomplete = ticket.workflow.steps.find(
      (s) => !completionMap.has(s.id),
    );
    currentStepId = firstIncomplete?.id ?? null;
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { currentWorkflowStepId: currentStepId },
    });
  }

  const progress = ticket.workflow.steps.map((step) => ({
    step,
    completion: completionMap.get(step.id) ?? null,
    isCompleted: completionMap.has(step.id),
    isCurrent: currentStepId ? step.id === currentStepId : false,
  }));

  return {
    workflow: ticket.workflow,
    progress,
    totalSteps: ticket.workflow.steps.length,
    completedSteps: completions.length,
    currentStepId,
    moreInfo: {
      requestedAt: ticket.moreInfoRequestedAt,
      requestedBy: ticket.moreInfoRequestedBy,
      question: ticket.moreInfoQuestion,
      stepId: ticket.moreInfoStepId,
      commentId: ticket.moreInfoCommentId,
      responseCommentId: ticket.moreInfoResponseCommentId,
      resolvedAt: ticket.moreInfoResolvedAt,
      resolvedBy: ticket.moreInfoResolvedBy,
    },
  };
}

// Ensure default workflow exists
export async function ensureDefaultWorkflow() {
  const defaultWorkflow = await prisma.workflow.findFirst({
    where: { isDefault: true, active: true },
  });

  if (!defaultWorkflow) {
    // Create a basic default workflow
    await prisma.workflow.create({
      data: {
        name: "Default Workflow",
        description: "Default workflow for all tickets",
        isDefault: true,
        active: true,
        steps: {
          create: [
            {
              name: "Initial Review",
              description: "Review and triage the ticket",
              order: 0,
            },
            {
              name: "In Progress",
              description: "Work on resolving the issue",
              order: 1,
            },
            {
              name: "Resolution",
              description: "Resolve and close the ticket",
              order: 2,
            },
          ],
        },
      },
    });
  }
}
