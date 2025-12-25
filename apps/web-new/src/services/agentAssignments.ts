import { apiClient } from "./apiClient";

export type AgentAssignment = {
  id: string;
  categoryId: string;
  subcategoryId: string | null;
  agentId: string;
  priority: "low" | "medium" | "high" | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  };
  subcategory: {
    id: string;
    name: string;
  } | null;
  agent: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export type CreateAgentAssignmentPayload = {
  categoryId: string;
  subcategoryId?: string | null;
  agentId: string;
  priority?: "low" | "medium" | "high" | null;
  active?: boolean;
};

export type UpdateAgentAssignmentPayload = {
  agentId?: string;
  priority?: "low" | "medium" | "high" | null;
  active?: boolean;
};

export type RecommendAgentPayload = {
  categoryId: string;
  subcategoryId?: string | null;
  priority?: "low" | "medium" | "high";
};

export type RecommendedAgent = {
  id: string;
  name: string;
  email: string;
  role: string;
} | null;

export async function fetchAgentAssignments(
  categoryId?: string,
  subcategoryId?: string,
  activeOnly = false,
): Promise<AgentAssignment[]> {
  const params = new URLSearchParams();
  if (categoryId) {
    params.append("categoryId", categoryId);
  }
  if (subcategoryId !== undefined) {
    params.append("subcategoryId", subcategoryId);
  }
  if (activeOnly) {
    params.append("active", "true");
  }
  const response = await apiClient.get<{ assignments: AgentAssignment[] }>(
    `/agent-assignments?${params.toString()}`,
  );
  return response.data.assignments;
}

export async function fetchAgentAssignment(
  id: string,
): Promise<AgentAssignment> {
  const response = await apiClient.get<{ assignment: AgentAssignment }>(
    `/agent-assignments/${id}`,
  );
  return response.data.assignment;
}

export async function createAgentAssignment(
  payload: CreateAgentAssignmentPayload,
): Promise<AgentAssignment> {
  const response = await apiClient.post<{ assignment: AgentAssignment }>(
    "/agent-assignments",
    payload,
  );
  return response.data.assignment;
}

export async function updateAgentAssignment(
  id: string,
  payload: UpdateAgentAssignmentPayload,
): Promise<AgentAssignment> {
  const response = await apiClient.patch<{ assignment: AgentAssignment }>(
    `/agent-assignments/${id}`,
    payload,
  );
  return response.data.assignment;
}

export async function deleteAgentAssignment(id: string): Promise<void> {
  await apiClient.delete(`/agent-assignments/${id}`);
}

export async function recommendAgent(
  payload: RecommendAgentPayload,
): Promise<RecommendedAgent> {
  const response = await apiClient.post<{ agent: RecommendedAgent }>(
    "/agent-assignments/recommend",
    payload,
  );
  return response.data.agent;
}
