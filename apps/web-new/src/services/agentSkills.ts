import { apiClient } from "@/services/apiClient";

export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  userSkills?: UserSkill[];
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  proficiency: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  skill?: AgentSkill;
}

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

export async function fetchAgentSkills(activeOnly = false): Promise<AgentSkill[]> {
  const { data } = await apiClient.get(`/agent-skills`, {
    params: { active: activeOnly },
  });
  return data.skills;
}

export async function fetchAgentSkill(id: string): Promise<AgentSkill> {
  const { data } = await apiClient.get(`/agent-skills/${id}`);
  return data.skill;
}

export async function createAgentSkill(payload: CreateAgentSkillPayload): Promise<AgentSkill> {
  const { data } = await apiClient.post(`/agent-skills`, payload);
  return data.skill;
}

export async function updateAgentSkill(id: string, payload: UpdateAgentSkillPayload): Promise<AgentSkill> {
  const { data } = await apiClient.patch(`/agent-skills/${id}`, payload);
  return data.skill;
}

export async function deleteAgentSkill(id: string): Promise<void> {
  await apiClient.delete(`/agent-skills/${id}`);
}

export async function assignSkillToUser(payload: AssignSkillPayload): Promise<UserSkill> {
  const { data } = await apiClient.post(`/agent-skills/assign`, payload);
  return data.userSkill;
}

export async function removeSkillFromUser(userId: string, skillId: string): Promise<void> {
  await apiClient.delete(`/agent-skills/assign/${userId}/${skillId}`);
}

export async function fetchUserSkills(userId: string): Promise<UserSkill[]> {
  const { data } = await apiClient.get(`/agent-skills/users/${userId}`);
  return data.skills;
}
