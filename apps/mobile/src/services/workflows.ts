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

export interface AllowedActionsResult {
  currentStep: WorkflowStep | null;
  allowedActions: string[];
  canAdvance: boolean;
}

export interface AdvanceWorkflowResult {
  success: boolean;
  newStep: WorkflowStep | null;
  workflowCompleted: boolean;
  message: string;
}

export async function fetchWorkflow(workflowId: string): Promise<Workflow> {
  const response = await apiClient.get<{ workflow: Workflow }>(`/workflows/${workflowId}`);
  return response.data.workflow;
}

export async function fetchAllowedActions(ticketId: string): Promise<AllowedActionsResult> {
  const response = await apiClient.get<AllowedActionsResult>(
    `/workflows/tickets/${ticketId}/allowed-actions`
  );
  return response.data;
}

export async function advanceWorkflowStep(
  ticketId: string,
  notes?: string
): Promise<AdvanceWorkflowResult> {
  const response = await apiClient.post<AdvanceWorkflowResult>(
    `/workflows/tickets/${ticketId}/advance`,
    { notes }
  );
  return response.data;
}

