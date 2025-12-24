import { PrismaClient, Role } from "@prisma/client";
import createError from "http-errors";

const prisma = new PrismaClient();

export interface CreateAssignmentRulePayload {
  name: string;
  description?: string;
  priority?: number;
  active?: boolean;
  conditions?: Record<string, unknown>;
  assignmentStrategy?: string;
  skillId?: string;
  categoryId?: string;
}

export interface UpdateAssignmentRulePayload {
  name?: string;
  description?: string;
  priority?: number;
  active?: boolean;
  conditions?: Record<string, unknown>;
  assignmentStrategy?: string;
  skillId?: string;
  categoryId?: string;
}

export async function listAssignmentRules(activeOnly = false) {
  return prisma.agentAssignmentRule.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: {
      skill: true,
      category: true,
    },
    orderBy: { priority: "desc" },
  });
}

export async function getAssignmentRule(id: string) {
  const rule = await prisma.agentAssignmentRule.findUnique({
    where: { id },
    include: {
      skill: true,
      category: true,
    },
  });

  if (!rule) {
    throw createError(404, "Assignment rule not found");
  }

  return rule;
}

export async function createAssignmentRule(
  payload: CreateAssignmentRulePayload,
) {
  return prisma.agentAssignmentRule.create({
    data: {
      name: payload.name,
      description: payload.description,
      priority: payload.priority ?? 0,
      active: payload.active ?? true,
      conditions: payload.conditions ?? {},
      assignmentStrategy: payload.assignmentStrategy ?? "round_robin",
      skillId: payload.skillId,
      categoryId: payload.categoryId,
    },
  });
}

export async function updateAssignmentRule(
  id: string,
  payload: UpdateAssignmentRulePayload,
) {
  return prisma.agentAssignmentRule.update({
    where: { id },
    data: payload,
  });
}

export async function deleteAssignmentRule(id: string) {
  return prisma.agentAssignmentRule.delete({
    where: { id },
  });
}

// Find the best agent based on assignment rules
export async function findBestAgent(
  categoryId?: string,
  priority?: string,
  skillId?: string,
): Promise<string | null> {
  // Get all active rules sorted by priority
  const rules = await prisma.agentAssignmentRule.findMany({
    where: {
      active: true,
      OR: [
        { categoryId: categoryId ?? null },
        { categoryId: null },
      ],
    },
    orderBy: { priority: "desc" },
    include: {
      skill: {
        include: {
          userSkills: {
            where: {
              user: {
                role: Role.agent,
              },
            },
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  for (const rule of rules) {
    // If rule requires a skill, filter agents by skill
    if (rule.skillId && rule.skill) {
      const skillUsers = rule.skill.userSkills
        .sort((a, b) => b.proficiency - a.proficiency);

      if (skillUsers.length > 0) {
        // Get agent with lowest current workload
        const agentWorkloads = await Promise.all(
          skillUsers.map(async (su) => {
            const openTickets = await prisma.ticket.count({
              where: {
                assignedTo: su.userId,
                status: { in: ["open", "in_progress"] },
              },
            });
            return { userId: su.userId, workload: openTickets };
          }),
        );

        // Sort by workload (ascending) and return the least busy agent
        agentWorkloads.sort((a, b) => a.workload - b.workload);
        if (agentWorkloads.length > 0) {
          return agentWorkloads[0].userId;
        }
      }
    } else {
      // No skill requirement - use round-robin or load balancing
      const agents = await prisma.user.findMany({
        where: { role: Role.agent },
        select: { id: true },
      });

      if (agents.length === 0) return null;

      // Get agent with lowest current workload
      const agentWorkloads = await Promise.all(
        agents.map(async (agent) => {
          const openTickets = await prisma.ticket.count({
            where: {
              assignedTo: agent.id,
              status: { in: ["open", "in_progress"] },
            },
          });
          return { userId: agent.id, workload: openTickets };
        }),
      );

      agentWorkloads.sort((a, b) => a.workload - b.workload);
      if (agentWorkloads.length > 0) {
        return agentWorkloads[0].userId;
      }
    }
  }

  // Fallback: return any agent with lowest workload
  const agents = await prisma.user.findMany({
    where: { role: Role.agent },
    select: { id: true },
  });

  if (agents.length === 0) return null;

  const agentWorkloads = await Promise.all(
    agents.map(async (agent) => {
      const openTickets = await prisma.ticket.count({
        where: {
          assignedTo: agent.id,
          status: { in: ["open", "in_progress"] },
        },
      });
      return { userId: agent.id, workload: openTickets };
    }),
  );

  agentWorkloads.sort((a, b) => a.workload - b.workload);
  return agentWorkloads.length > 0 ? agentWorkloads[0].userId : null;
}
