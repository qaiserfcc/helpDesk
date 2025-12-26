import createError from "http-errors";
import { TicketPriority } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export interface CreateAgentAssignmentInput {
  categoryId: string;
  subcategoryId?: string | null;
  agentId: string;
  priority?: TicketPriority | null;
  active?: boolean;
}

export interface UpdateAgentAssignmentInput {
  agentId?: string;
  priority?: TicketPriority | null;
  active?: boolean;
}

export async function listAgentAssignments(
  categoryId?: string,
  subcategoryId?: string,
  activeOnly = false,
) {
  const where: {
    categoryId?: string;
    subcategoryId?: string | null;
    active?: boolean;
  } = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (subcategoryId !== undefined) {
    where.subcategoryId = subcategoryId || null;
  }

  if (activeOnly) {
    where.active = true;
  }

  const assignments = await prisma.agentAssignment.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          name: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [
      { categoryId: "asc" },
      { subcategoryId: "asc" },
      { priority: "asc" },
    ],
  });

  return assignments;
}

export async function getAgentAssignment(assignmentId: string) {
  const assignment = await prisma.agentAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          name: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!assignment) {
    throw createError(404, "Agent assignment not found");
  }

  return assignment;
}

export async function createAgentAssignment(input: CreateAgentAssignmentInput) {
  // Verify category exists
  const category = await prisma.ticketCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category) {
    throw createError(404, "Category not found");
  }

  // Verify subcategory exists if provided
  if (input.subcategoryId) {
    const subcategory = await prisma.ticketSubcategory.findUnique({
      where: { id: input.subcategoryId },
    });

    if (!subcategory) {
      throw createError(404, "Subcategory not found");
    }

    if (subcategory.categoryId !== input.categoryId) {
      throw createError(
        400,
        "Subcategory does not belong to the specified category",
      );
    }
  }

  // Verify agent exists and has agent or admin role
  const agent = await prisma.user.findUnique({
    where: { id: input.agentId },
  });

  if (!agent) {
    throw createError(404, "Agent not found");
  }

  if (agent.role !== "agent" && agent.role !== "admin") {
    throw createError(400, "User must have agent or admin role");
  }

  const assignment = await prisma.agentAssignment.create({
    data: {
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId || null,
      agentId: input.agentId,
      priority: input.priority || null,
      active: input.active ?? true,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          name: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return assignment;
}

export async function updateAgentAssignment(
  assignmentId: string,
  input: UpdateAgentAssignmentInput,
) {
  const existing = await prisma.agentAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!existing) {
    throw createError(404, "Agent assignment not found");
  }

  // Verify agent exists and has agent or admin role if updating agent
  if (input.agentId) {
    const agent = await prisma.user.findUnique({
      where: { id: input.agentId },
    });

    if (!agent) {
      throw createError(404, "Agent not found");
    }

    if (agent.role !== "agent" && agent.role !== "admin") {
      throw createError(400, "User must have agent or admin role");
    }
  }

  const assignment = await prisma.agentAssignment.update({
    where: { id: assignmentId },
    data: {
      agentId: input.agentId,
      priority: input.priority,
      active: input.active,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          name: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return assignment;
}

export async function deleteAgentAssignment(assignmentId: string) {
  const assignment = await prisma.agentAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw createError(404, "Agent assignment not found");
  }

  await prisma.agentAssignment.delete({
    where: { id: assignmentId },
  });
}

export async function getRecommendedAgent(
  categoryId: string,
  subcategoryId?: string | null,
  priority?: TicketPriority,
) {
  // Try to find exact match with subcategory and priority
  if (subcategoryId && priority) {
    const exactMatch = await prisma.agentAssignment.findFirst({
      where: {
        categoryId,
        subcategoryId,
        priority,
        active: true,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (exactMatch) {
      return exactMatch.agent;
    }
  }

  // Try category + subcategory without priority
  if (subcategoryId) {
    const subcategoryMatch = await prisma.agentAssignment.findFirst({
      where: {
        categoryId,
        subcategoryId,
        priority: null,
        active: true,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (subcategoryMatch) {
      return subcategoryMatch.agent;
    }
  }

  // Try category + priority
  if (priority) {
    const categoryPriorityMatch = await prisma.agentAssignment.findFirst({
      where: {
        categoryId,
        subcategoryId: null,
        priority,
        active: true,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (categoryPriorityMatch) {
      return categoryPriorityMatch.agent;
    }
  }

  // Try just category
  const categoryMatch = await prisma.agentAssignment.findFirst({
    where: {
      categoryId,
      subcategoryId: null,
      priority: null,
      active: true,
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (categoryMatch) {
    return categoryMatch.agent;
  }

  return null;
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
  const whereClause: any = {
    active: true,
  };
  
  // Only add category filter if categoryId is provided
  if (categoryId) {
    whereClause.OR = [
      { categoryId: categoryId },
      { categoryId: null },
    ];
  } else {
    whereClause.categoryId = null;
  }

  const rules = await prisma.agentAssignmentRule.findMany({
    where: whereClause,
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
