import createError from "http-errors";
import { Prisma, Role, WorkflowStepAction } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type WorkflowWithSteps = Prisma.WorkflowDefinitionGetPayload<{
  include: { steps: true; category: true };
}>;

export type WorkflowStepWithWorkflow = Prisma.WorkflowStepGetPayload<{
  include: { workflow: true };
}>;

type CreateWorkflowInput = {
  name: string;
  description?: string;
  categoryId?: string;
  version?: number;
  active?: boolean;
};

type UpdateWorkflowInput = {
  name?: string;
  description?: string;
  categoryId?: string;
  active?: boolean;
};

type CreateWorkflowStepInput = {
  workflowId: string;
  name: string;
  description?: string;
  order: number;
  initiatorRole?: Role;
  allowedActions: WorkflowStepAction[];
  conditions?: Record<string, unknown>;
};

type UpdateWorkflowStepInput = {
  name?: string;
  description?: string;
  order?: number;
  initiatorRole?: Role | null;
  allowedActions?: WorkflowStepAction[];
  conditions?: Record<string, unknown> | null;
};

export async function listWorkflows(categoryId?: string, activeOnly = false) {
  const workflows = await prisma.workflowDefinition.findMany({
    where: {
      categoryId: categoryId,
      active: activeOnly ? true : undefined,
    },
    include: {
      category: true,
      steps: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return workflows;
}

export async function getWorkflow(workflowId: string): Promise<WorkflowWithSteps> {
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
    include: {
      category: true,
      steps: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!workflow) {
    throw createError(404, "Workflow not found");
  }

  return workflow;
}

export async function createWorkflow(input: CreateWorkflowInput): Promise<WorkflowWithSteps> {
  // If categoryId is provided, verify it exists
  if (input.categoryId) {
    const category = await prisma.ticketCategory.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw createError(404, "Category not found");
    }

    // Check for duplicate version within category
    if (input.version) {
      const existing = await prisma.workflowDefinition.findUnique({
        where: {
          categoryId_version: {
            categoryId: input.categoryId,
            version: input.version,
          },
        },
      });

      if (existing) {
        throw createError(409, "Workflow with this version already exists for this category");
      }
    }
  }

  const workflow = await prisma.workflowDefinition.create({
    data: {
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      version: input.version ?? 1,
      active: input.active ?? true,
    },
    include: {
      category: true,
      steps: true,
    },
  });

  return workflow;
}

export async function updateWorkflow(
  workflowId: string,
  input: UpdateWorkflowInput,
): Promise<WorkflowWithSteps> {
  // Check if workflow exists
  const existing = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
  });

  if (!existing) {
    throw createError(404, "Workflow not found");
  }

  // If updating categoryId, verify it exists
  if (input.categoryId) {
    const category = await prisma.ticketCategory.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw createError(404, "Category not found");
    }
  }

  const workflow = await prisma.workflowDefinition.update({
    where: { id: workflowId },
    data: {
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      active: input.active,
    },
    include: {
      category: true,
      steps: {
        orderBy: { order: "asc" },
      },
    },
  });

  return workflow;
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  // Check if workflow exists
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
    include: {
      tickets: { select: { id: true } },
    },
  });

  if (!workflow) {
    throw createError(404, "Workflow not found");
  }

  // Check if workflow is in use
  if (workflow.tickets.length > 0) {
    throw createError(
      400,
      "Cannot delete workflow that is assigned to tickets. Set it to inactive instead.",
    );
  }

  await prisma.workflowDefinition.delete({
    where: { id: workflowId },
  });
}

// Workflow step operations
export async function listWorkflowSteps(workflowId: string) {
  // Verify workflow exists
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    throw createError(404, "Workflow not found");
  }

  const steps = await prisma.workflowStep.findMany({
    where: { workflowId },
    orderBy: { order: "asc" },
  });

  return steps;
}

export async function getWorkflowStep(stepId: string): Promise<WorkflowStepWithWorkflow> {
  const step = await prisma.workflowStep.findUnique({
    where: { id: stepId },
    include: {
      workflow: true,
    },
  });

  if (!step) {
    throw createError(404, "Workflow step not found");
  }

  return step;
}

export async function createWorkflowStep(
  input: CreateWorkflowStepInput,
): Promise<WorkflowStepWithWorkflow> {
  // Verify workflow exists
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { id: input.workflowId },
  });

  if (!workflow) {
    throw createError(404, "Workflow not found");
  }

  // Check for duplicate order
  const existing = await prisma.workflowStep.findUnique({
    where: {
      workflowId_order: {
        workflowId: input.workflowId,
        order: input.order,
      },
    },
  });

  if (existing) {
    throw createError(409, "Step with this order already exists in this workflow");
  }

  const step = await prisma.workflowStep.create({
    data: {
      workflowId: input.workflowId,
      name: input.name,
      description: input.description,
      order: input.order,
      initiatorRole: input.initiatorRole,
      allowedActions: input.allowedActions,
      conditions: input.conditions ?? undefined,
    },
    include: {
      workflow: true,
    },
  });

  return step;
}

export async function updateWorkflowStep(
  stepId: string,
  input: UpdateWorkflowStepInput,
): Promise<WorkflowStepWithWorkflow> {
  // Check if step exists
  const existing = await prisma.workflowStep.findUnique({
    where: { id: stepId },
  });

  if (!existing) {
    throw createError(404, "Workflow step not found");
  }

  // If updating order, check for duplicates
  if (input.order !== undefined && input.order !== existing.order) {
    const duplicate = await prisma.workflowStep.findUnique({
      where: {
        workflowId_order: {
          workflowId: existing.workflowId,
          order: input.order,
        },
      },
    });

    if (duplicate) {
      throw createError(409, "Step with this order already exists in this workflow");
    }
  }

  const step = await prisma.workflowStep.update({
    where: { id: stepId },
    data: {
      name: input.name,
      description: input.description,
      order: input.order,
      initiatorRole: input.initiatorRole === null ? null : input.initiatorRole,
      allowedActions: input.allowedActions,
      conditions: input.conditions === null ? null : input.conditions,
    },
    include: {
      workflow: true,
    },
  });

  return step;
}

export async function deleteWorkflowStep(stepId: string): Promise<void> {
  // Check if step exists
  const step = await prisma.workflowStep.findUnique({
    where: { id: stepId },
    include: {
      ticketsAtStep: { select: { id: true } },
    },
  });

  if (!step) {
    throw createError(404, "Workflow step not found");
  }

  // Check if step is in use
  if (step.ticketsAtStep.length > 0) {
    throw createError(400, "Cannot delete workflow step that has tickets assigned to it");
  }

  await prisma.workflowStep.delete({
    where: { id: stepId },
  });
}

// Workflow evaluation logic
export async function evaluateWorkflowForTicket(
  categoryId: string | null,
  initiatorRole: Role,
): Promise<WorkflowWithSteps | null> {
  if (!categoryId) {
    return null;
  }

  // Find active workflow for this category
  const workflow = await prisma.workflowDefinition.findFirst({
    where: {
      categoryId,
      active: true,
    },
    include: {
      category: true,
      steps: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { version: "desc" }, // Get the latest version
  });

  return workflow;
}

export async function getNextWorkflowStep(
  currentStepId: string | null,
  initiatorRole: Role,
  workflowId: string,
): Promise<WorkflowStepWithWorkflow | null> {
  if (!currentStepId) {
    // Get the first step
    const firstStep = await prisma.workflowStep.findFirst({
      where: { workflowId },
      orderBy: { order: "asc" },
      include: { workflow: true },
    });

    return firstStep;
  }

  // Get current step
  const currentStep = await prisma.workflowStep.findUnique({
    where: { id: currentStepId },
  });

  if (!currentStep) {
    throw createError(404, "Current workflow step not found");
  }

  // Find next step
  const nextStep = await prisma.workflowStep.findFirst({
    where: {
      workflowId,
      order: { gt: currentStep.order },
      // Filter by initiator role if specified
      OR: [{ initiatorRole: null }, { initiatorRole: initiatorRole }],
    },
    orderBy: { order: "asc" },
    include: { workflow: true },
  });

  return nextStep;
}

export async function canUserPerformAction(
  stepId: string,
  action: WorkflowStepAction,
  userRole: Role,
): Promise<boolean> {
  const step = await prisma.workflowStep.findUnique({
    where: { id: stepId },
  });

  if (!step) {
    return false;
  }

  // Check if user role matches step initiator role (if specified)
  if (step.initiatorRole && step.initiatorRole !== userRole) {
    return false;
  }

  // Check if action is allowed in this step
  const allowedActions = step.allowedActions as unknown as WorkflowStepAction[];
  return allowedActions.includes(action);
}
