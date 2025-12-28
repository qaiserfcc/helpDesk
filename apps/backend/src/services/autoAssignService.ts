import createError from "http-errors";
import { prisma } from "../lib/prisma.js";

type RequestUser = Express.AuthenticatedUser;

export type AgentAutoAssignInput = {
  subcategoryId: string;
  agentId: string;
  priority?: number;
  active?: boolean;
};

export async function listAutoAssignments(user: RequestUser) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can list auto assignments");
  }
  return prisma.agentAutoAssign.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
    include: { subcategory: true, agent: true },
  });
}

export async function listAutoAssignmentsBySubcategory(
  subcategoryId: string,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can list auto assignments");
  }
  return prisma.agentAutoAssign.findMany({
    where: { subcategoryId, active: true },
    orderBy: { priority: "desc" },
    include: { agent: true },
  });
}

export async function getAutoAssignment(
  assignmentId: string,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can view auto assignments");
  }
  const assignment = await prisma.agentAutoAssign.findUnique({
    where: { id: assignmentId },
    include: { subcategory: true, agent: true },
  });
  if (!assignment) {
    throw createError(404, "Auto assignment not found");
  }
  return assignment;
}

export async function createAutoAssignment(
  input: AgentAutoAssignInput,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can create auto assignments");
  }

  if (!input.subcategoryId?.trim()) {
    throw createError(400, "Subcategory ID is required");
  }

  if (!input.agentId?.trim()) {
    throw createError(400, "Agent ID is required");
  }

  const subcategory = await prisma.subcategory.findUnique({
    where: { id: input.subcategoryId },
  });
  if (!subcategory) {
    throw createError(404, "Subcategory not found");
  }

  const agent = await prisma.user.findUnique({
    where: { id: input.agentId },
  });
  if (!agent || agent.role !== "agent") {
    throw createError(404, "Agent not found or invalid role");
  }

  try {
    const assignment = await prisma.agentAutoAssign.create({
      data: {
        subcategoryId: input.subcategoryId,
        agentId: input.agentId,
        priority: input.priority ?? 0,
        active: input.active ?? true,
      },
      include: { subcategory: true, agent: true },
    });
    return assignment;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw createError(409, "Agent already assigned to this subcategory");
    }
    throw err;
  }
}

export async function updateAutoAssignment(
  assignmentId: string,
  updates: Partial<Omit<AgentAutoAssignInput, "subcategoryId" | "agentId">>,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can update auto assignments");
  }

  const existing = await prisma.agentAutoAssign.findUnique({
    where: { id: assignmentId },
  });
  if (!existing) {
    throw createError(404, "Auto assignment not found");
  }

  const assignment = await prisma.agentAutoAssign.update({
    where: { id: assignmentId },
    data: {
      priority: updates.priority ?? existing.priority,
      active: updates.active ?? existing.active,
    },
    include: { subcategory: true, agent: true },
  });
  return assignment;
}

export async function deleteAutoAssignment(
  assignmentId: string,
  user: RequestUser,
) {
  if (user.role !== "admin") {
    throw createError(403, "Only admins can delete auto assignments");
  }

  const existing = await prisma.agentAutoAssign.findUnique({
    where: { id: assignmentId },
  });
  if (!existing) {
    throw createError(404, "Auto assignment not found");
  }

  await prisma.agentAutoAssign.delete({ where: { id: assignmentId } });
  return existing;
}

export async function getAutoAssignmentForSubcategory(
  subcategoryId: string,
): Promise<{ agentId: string; priority: number } | null> {
  // Get the highest priority active assignment for a subcategory
  const assignment = await prisma.agentAutoAssign.findFirst({
    where: { subcategoryId, active: true },
    orderBy: { priority: "desc" },
    select: { agentId: true, priority: true },
  });
  return assignment;
}
