import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

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
  const { data } = await axios.get(`${API_BASE_URL}/api/agent-skills`, {
    params: { active: activeOnly },
  });
  return data.skills;
}

export async function fetchAgentSkill(id: string): Promise<AgentSkill> {
  const { data } = await axios.get(`${API_BASE_URL}/api/agent-skills/${id}`);
  return data.skill;
}

export async function createAgentSkill(payload: CreateAgentSkillPayload): Promise<AgentSkill> {
  const { data } = await axios.post(`${API_BASE_URL}/api/agent-skills`, payload);
  return data.skill;
}

export async function updateAgentSkill(id: string, payload: UpdateAgentSkillPayload): Promise<AgentSkill> {
  const { data } = await axios.patch(`${API_BASE_URL}/api/agent-skills/${id}`, payload);
  return data.skill;
}

export async function deleteAgentSkill(id: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/agent-skills/${id}`);
}

export async function assignSkillToUser(payload: AssignSkillPayload): Promise<UserSkill> {
  const { data } = await axios.post(`${API_BASE_URL}/api/agent-skills/assign`, payload);
  return data.userSkill;
}

export async function removeSkillFromUser(userId: string, skillId: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/agent-skills/assign/${userId}/${skillId}`);
}

export async function fetchUserSkills(userId: string): Promise<UserSkill[]> {
  const { data } = await axios.get(`${API_BASE_URL}/api/agent-skills/users/${userId}`);
  return data.skills;
}
