import { apiClient } from './apiClient';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  active: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  initiatorRole?: string;
}

export async function fetchWorkflow(workflowId: string): Promise<Workflow> {
  const response = await apiClient.get<{ workflow: Workflow }>(`/workflows/${workflowId}`);
  return response.data.workflow;
}
