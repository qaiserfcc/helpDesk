import { apiClient } from "./apiClient";

export type WorkflowDefinition = {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  version: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowStep = {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  order: number;
  initiatorRole?: string;
  allowedActions?: any;
  conditions?: any;
};

export type WorkflowWithSteps = WorkflowDefinition & {
  steps?: WorkflowStep[];
};

export type CreateWorkflowPayload = {
  name: string;
  description?: string;
  categoryId?: string;
  version?: number;
  active?: boolean;
};

export type UpdateWorkflowPayload = {
  name?: string;
  description?: string;
  categoryId?: string;
  version?: number;
  active?: boolean;
};

export type CreateWorkflowStepPayload = {
  workflowId: string;
  name: string;
  description?: string;
  order: number;
  initiatorRole?: string;
  allowedActions?: any;
  conditions?: any;
};

export type UpdateWorkflowStepPayload = {
  name?: string;
  description?: string;
  order?: number;
  initiatorRole?: string;
  allowedActions?: any;
  conditions?: any;
};

export async function fetchWorkflows() {
  const { data } = await apiClient.get<WorkflowDefinition[]>("/workflows");
  return data;
}

export async function fetchWorkflow(workflowId: string) {
  const { data } = await apiClient.get<WorkflowWithSteps>(`/workflows/${workflowId}`);
  return data;
}

export async function createWorkflow(payload: CreateWorkflowPayload) {
  const { data } = await apiClient.post<WorkflowDefinition>("/workflows", payload);
  return data;
}

export async function updateWorkflow(workflowId: string, payload: UpdateWorkflowPayload) {
  const { data } = await apiClient.patch<WorkflowDefinition>(`/workflows/${workflowId}`, payload);
  return data;
}

export async function deleteWorkflow(workflowId: string) {
  await apiClient.delete(`/workflows/${workflowId}`);
}

export async function fetchWorkflowSteps(workflowId: string) {
  const { data } = await apiClient.get<WorkflowStep[]>(`/workflows/${workflowId}/steps`);
  return data;
}

export async function createWorkflowStep(payload: CreateWorkflowStepPayload) {
  const { data } = await apiClient.post<WorkflowStep>("/workflows/steps", payload);
  return data;
}

export async function updateWorkflowStep(stepId: string, payload: UpdateWorkflowStepPayload) {
  const { data } = await apiClient.patch<WorkflowStep>(`/workflows/steps/${stepId}`, payload);
  return data;
}

export async function deleteWorkflowStep(stepId: string) {
  await apiClient.delete(`/workflows/steps/${stepId}`);
}

export default {
  fetchWorkflows,
  fetchWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  fetchWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
};
