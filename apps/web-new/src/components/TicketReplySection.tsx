"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchCannedResponses } from "@/services/cannedResponses";
import { apiClient } from "@/services/apiClient";

interface TicketReplySectionProps {
  ticketId: string;
  ticketCreatorId: string;
}

export function TicketReplySection({ ticketId, ticketCreatorId }: TicketReplySectionProps) {
  const [replyContent, setReplyContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [selectedCannedResponseId, setSelectedCannedResponseId] = useState<string | undefined>();
  const authUser = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();

  const isAgent = authUser?.role === "agent" || authUser?.role === "admin";
  const canAddReply = authUser?.id === ticketCreatorId || isAgent;

  // Fetch canned responses for agents
  const { data: cannedResponses = [] } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: () => fetchCannedResponses(),
    enabled: isAgent,
  });

  const addReplyMutation = useMutation({
    mutationFn: async (data: { content: string; isInternal: boolean; cannedResponseId?: string }) => {
      const response = await apiClient.post(`/tickets/${ticketId}/replies`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-activity", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setReplyContent("");
      setIsInternal(false);
      setShowCannedResponses(false);
      setSelectedCannedResponseId(undefined);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    addReplyMutation.mutate({
      content: replyContent.trim(),
      isInternal,
      cannedResponseId: selectedCannedResponseId,
    });
  };

  const handleCannedResponseSelect = (response: any) => {
    setReplyContent(response.content);
    setSelectedCannedResponseId(response.id);
    setShowCannedResponses(false);
  };

  if (!canAddReply) return null;

  return (
    <div className="card p-6 mt-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        {isAgent ? "Add Reply or Note" : "Add Reply"}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Canned Responses Dropdown for Agents */}
        {isAgent && cannedResponses.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCannedResponses(!showCannedResponses)}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <span>💬</span>
              <span>Use Canned Response</span>
              <svg
                className={`w-4 h-4 transition-transform ${showCannedResponses ? "rotate-180" : ""}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </button>

            {showCannedResponses && (
              <div className="absolute top-full mt-2 left-0 bg-white/10 backdrop-blur-xl rounded-lg shadow-2xl py-2 min-w-[320px] max-h-64 overflow-y-auto z-10 border border-white/20">
                {cannedResponses.map((response: any) => (
                  <button
                    key={response.id}
                    type="button"
                    onClick={() => handleCannedResponseSelect(response)}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="text-sm font-medium text-white">{response.title}</div>
                    <div className="text-xs text-white/60 mt-1 line-clamp-2">
                      {response.content}
                    </div>
                    <div className="text-xs text-white/40 mt-1">{response.shortcut}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reply Text Area */}
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder={isInternal ? "Add an internal note (visible only to agents)..." : "Type your reply..."}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent min-h-[120px] resize-y"
          disabled={addReplyMutation.isPending}
        />

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Internal Note Toggle (Agents Only) */}
            {isAgent && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                />
                <span className="text-sm text-white/70">Internal Note</span>
              </label>
            )}
            
            {isInternal && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Only visible to agents
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!replyContent.trim() || addReplyMutation.isPending}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {addReplyMutation.isPending ? "Sending..." : isInternal ? "Add Note" : "Send Reply"}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {addReplyMutation.isError && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to add reply. Please try again.
        </div>
      )}
    </div>
  );
}
