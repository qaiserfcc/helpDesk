import { prisma } from "../lib/prisma.js";
import createError from "http-errors";

export interface CreateAgentSkillPayload {
  name: string;
  description?: string;
  active?: boolean;
}

export interface UpdateAgentSkillPayload {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface AssignSkillPayload {
  userId: string;
  skillId: string;
  proficiency?: number;
}

export async function listAgentSkills(activeOnly = false) {
  return prisma.agentSkill.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: {
      userSkills: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getAgentSkill(id: string) {
  const skill = await prisma.agentSkill.findUnique({
    where: { id },
    include: {
      userSkills: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!skill) {
    throw createError(404, "Agent skill not found");
  }

  return skill;
}

export async function createAgentSkill(payload: CreateAgentSkillPayload) {
  return prisma.agentSkill.create({
    data: {
      name: payload.name,
      description: payload.description,
      active: payload.active ?? true,
    },
  });
}

export async function updateAgentSkill(
  id: string,
  payload: UpdateAgentSkillPayload,
) {
  return prisma.agentSkill.update({
    where: { id },
    data: payload,
  });
}

export async function deleteAgentSkill(id: string) {
  return prisma.agentSkill.delete({
    where: { id },
  });
}

export async function assignSkillToUser(payload: AssignSkillPayload) {
  return prisma.userSkill.upsert({
    where: {
      userId_skillId: {
        userId: payload.userId,
        skillId: payload.skillId,
      },
    },
    create: {
      userId: payload.userId,
      skillId: payload.skillId,
      proficiency: payload.proficiency ?? 1,
    },
    update: {
      proficiency: payload.proficiency ?? 1,
    },
  });
}

export async function removeSkillFromUser(userId: string, skillId: string) {
  return prisma.userSkill.delete({
    where: {
      userId_skillId: {
        userId,
        skillId,
      },
    },
  });
}

export async function getUserSkills(userId: string) {
  return prisma.userSkill.findMany({
    where: { userId },
    include: {
      skill: true,
    },
  });
}
