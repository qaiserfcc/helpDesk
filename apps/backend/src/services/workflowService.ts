import createError from "http-errors";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

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
      roleFilter: updates.roleFilter !== undefined ? updates.roleFilter : existing.roleFilter,
      categoryId: updates.categoryId !== undefined ? updates.categoryId : existing.categoryId,
      subcategoryId:
        updates.subcategoryId !== undefined ? updates.subcategoryId : existing.subcategoryId,
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
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { workflowId: true },
  });

  if (!ticket?.workflowId) {
    return null;
  }

  const completedSteps = await prisma.workflowStepCompletion.findMany({
    where: { ticketId },
    select: { stepId: true },
  });

  const completedStepIds = new Set(completedSteps.map((c) => c.stepId));

  const nextStep = await prisma.workflowStep.findFirst({
    where: {
      workflowId: ticket.workflowId,
      id: { notIn: Array.from(completedStepIds) },
    },
    orderBy: { order: "asc" },
  });

  return nextStep;
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
    },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (!ticket.workflow) {
    throw createError(400, "Ticket has no workflow");
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

  // Verify user is assigned to ticket
  if (ticket.assignedTo !== userId) {
    throw createError(403, "Only the assigned user can complete workflow steps");
  }

  // Check if previous steps are completed
  const previousSteps = ticket.workflow.steps.filter((s) => s.order < step.order);
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

  // Auto-update ticket status based on workflow progress
  const totalSteps = ticket.workflow.steps.length;
  const completedStepsCount = previousSteps.length + 1; // Including current step
  
  let newStatus = ticket.status;
  
  if (completedStepsCount === totalSteps) {
    // All steps completed - mark ticket as resolved
    newStatus = "resolved" as const;
  } else if (completedStepsCount === 1) {
    // First step completed - move from open to in_progress
    newStatus = "in_progress" as const;
  } else if (completedStepsCount > 1 && completedStepsCount < totalSteps) {
    // Middle steps - ensure status is in_progress
    newStatus = "in_progress" as const;
  }

  // Update ticket status if needed
  if (newStatus !== ticket.status) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus, resolvedAt: newStatus === "resolved" ? new Date() : null },
    });

    // Log the status change activity
    await prisma.ticketActivity.create({
      data: {
        ticketId,
        actorId: userId,
        type: "status_change",
        fromStatus: ticket.status,
        toStatus: newStatus,
        comment: `Status auto-updated to ${newStatus} upon workflow step completion`,
      },
    });
  }

  // Log activity for step completion
  await prisma.ticketActivity.create({
    data: {
      ticketId,
      actorId: userId,
      type: "step_completed",
      stepId,
      comment: `Completed step: ${step.name}${comment ? ` - ${comment}` : ""}`,
    },
  });

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

  const progress = ticket.workflow.steps.map((step) => ({
    step,
    completion: completionMap.get(step.id) ?? null,
    isCompleted: completionMap.has(step.id),
  }));

  return {
    workflow: ticket.workflow,
    progress,
    totalSteps: ticket.workflow.steps.length,
    completedSteps: completions.length,
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
