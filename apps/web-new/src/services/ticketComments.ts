import { apiClient } from "./apiClient";

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  content: string;
  parentId?: string | null;
  replies?: TicketComment[];
  createdAt: string;
  updatedAt: string;
}

export const ticketCommentsService = {
  listComments: async (ticketId: string): Promise<TicketComment[]> => {
    const response = await apiClient.get(`/tickets/${ticketId}/comments`);
    return response.data;
  },

  createComment: async (
    ticketId: string,
    content: string,
    parentId?: string,
  ): Promise<TicketComment> => {
    const response = await apiClient.post(`/tickets/${ticketId}/comments`, {
      content,
      parentId,
    });
    return response.data;
  },

  updateComment: async (
    commentId: string,
    content: string,
  ): Promise<TicketComment> => {
    const response = await apiClient.put(`/tickets/comments/${commentId}`, {
      content,
    });
    return response.data;
  },

  deleteComment: async (commentId: string): Promise<{ id: string }> => {
    const response = await apiClient.delete(`/tickets/comments/${commentId}`);
    return response.data;
  },
};
