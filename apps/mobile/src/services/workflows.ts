import { apiClient } from "@/services/apiClient";

export type Role = "user" | "agent" | "admin";

export interface WorkflowStep {
  id: string;
  workflowId: string;
  name: string;
  description?: string | null;
  order: number;
  requiredRole?: Role | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  roleFilter?: Role | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
}

export interface WorkflowStepCompletion {
  id: string;
  ticketId: string;
  stepId: string;
  completedBy: string;
  completedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  comment?: string | null;
  completedAt: string;
}

export type MoreInfoState = {
  requestedAt: string | null;
  requestedBy: string | null;
  question: string | null;
  stepId: string | null;
  commentId: string | null;
  responseCommentId: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export interface WorkflowProgress {
  workflow: Workflow;
  progress: {
    step: WorkflowStep;
    completion: WorkflowStepCompletion | null;
    isCompleted: boolean;
    isCurrent: boolean;
  }[];
  totalSteps: number;
  completedSteps: number;
  currentStepId: string | null;
  moreInfo: MoreInfoState;
}

export const workflowsService = {
  getWorkflowProgress: async (
    ticketId: string,
  ): Promise<WorkflowProgress | null> => {
    const response = await apiClient.get(
      `/workflows/ticket/${ticketId}/progress`,
    );
    return response.data;
  },

  completeStep: async (
    ticketId: string,
    stepId: string,
    comment?: string,
  ): Promise<WorkflowStepCompletion> => {
    const response = await apiClient.post(
      `/workflows/ticket/${ticketId}/step/${stepId}/complete`,
      { comment },
    );
    return response.data;
  },

  moveCurrentStep: async (
    ticketId: string,
    direction: "next" | "prev",
  ): Promise<{ stepId: string }> => {
    const response = await apiClient.post(
      `/workflows/ticket/${ticketId}/current-step/move`,
      { direction },
    );
    return response.data;
  },

  requestMoreInfo: async (
    ticketId: string,
    question: string,
  ): Promise<{ commentId: string }> => {
    const response = await apiClient.post(
      `/workflows/ticket/${ticketId}/more-info/request`,
      {
        question,
      },
    );
    return response.data;
  },

  respondMoreInfo: async (
    ticketId: string,
    responseText: string,
  ): Promise<{ responseCommentId: string }> => {
    const response = await apiClient.post(
      `/workflows/ticket/${ticketId}/more-info/respond`,
      {
        response: responseText,
      },
    );
    return response.data;
  },
};
