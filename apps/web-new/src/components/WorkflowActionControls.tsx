"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllowedActions, advanceWorkflowStep } from "@/services/workflows";
import { useToastStore } from "@/store/useToastStore";
import { AxiosError } from "axios";

interface WorkflowActionControlsProps {
  ticketId: string;
  ticketStatus: string;
  userRole: string;
}

interface ApiError {
  message?: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: "Create",
  update: "Update",
  assign: "Assign",
  resolve: "Resolve",
  escalate: "Escalate",
  comment: "Comment",
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  create: "Create ticket",
  update: "Update ticket details",
  assign: "Assign ticket to agent",
  resolve: "Resolve ticket",
  escalate: "Escalate ticket",
  comment: "Add comments/replies",
};

export function WorkflowActionControls({
  ticketId,
  ticketStatus,
  userRole,
}: WorkflowActionControlsProps) {
  const [notes, setNotes] = useState("");
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const queryClient = useQueryClient();
  const addNotification = useToastStore((state) => state.addNotification);

  const { data: allowedActionsData, isLoading } = useQuery({
    queryKey: ["workflow-actions", ticketId],
    queryFn: () => fetchAllowedActions(ticketId),
    enabled: !!ticketId,
  });

  const advanceMutation = useMutation({
    mutationFn: (notes?: string) => advanceWorkflowStep(ticketId, notes),
    onSuccess: (data) => {
      addNotification({
        type: "success",
        title: "Workflow Advanced",
        message: data.message,
      });
      setShowAdvanceDialog(false);
      setNotes("");
      // Invalidate queries to refresh ticket data
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-actions", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activity", ticketId] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<ApiError>;
      addNotification({
        type: "error",
        title: "Failed to Advance Workflow",
        message: axiosError.response?.data?.message || "Failed to advance workflow step",
      });
    },
  });

  if (isLoading || !allowedActionsData) {
    return null;
  }

  const { currentStep, allowedActions, canAdvance } = allowedActionsData;

  // Don't show if no workflow or resolved
  if (!currentStep || ticketStatus === "resolved") {
    return null;
  }

  const handleAdvance = () => {
    advanceMutation.mutate(notes || undefined);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Workflow Actions</h3>
        {currentStep && (
          <span className="text-sm text-white/60">
            Current Step: {currentStep.name}
          </span>
        )}
      </div>

      {/* Allowed Actions */}
      {allowedActions && allowedActions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white/80 mb-3">
            Allowed Actions at Current Step:
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {allowedActions.map((action) => (
              <div
                key={action}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10"
                title={ACTION_DESCRIPTIONS[action] || action}
              >
                <svg
                  className="w-4 h-4 text-cyan-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-white/90 capitalize">
                  {ACTION_LABELS[action] || action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advance Step Button */}
      {canAdvance && (
        <div>
          <button
            onClick={() => setShowAdvanceDialog(true)}
            disabled={advanceMutation.isPending}
            className="btn btn-primary w-full"
          >
            {advanceMutation.isPending ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Advancing...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                Advance to Next Step
              </>
            )}
          </button>
        </div>
      )}

      {/* No actions available */}
      {(!allowedActions || allowedActions.length === 0) && !canAdvance && (
        <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm">
          No workflow actions available at this step for your role
        </div>
      )}

      {/* Advance Dialog */}
      {showAdvanceDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="advance-dialog-title"
        >
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h3 
              id="advance-dialog-title"
              className="text-xl font-semibold text-white mb-4"
            >
              Advance Workflow Step
            </h3>
            <p className="text-white/70 text-sm mb-4">
              You are about to advance this ticket to the next workflow step.
            </p>
            
            <div className="mb-4">
              <label 
                htmlFor="workflow-notes"
                className="block text-sm font-medium text-white/80 mb-2"
              >
                Notes (optional)
              </label>
              <textarea
                id="workflow-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input w-full h-24 resize-none"
                placeholder="Add notes about this step advancement..."
                aria-label="Notes for workflow step advancement"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAdvanceDialog(false);
                  setNotes("");
                }}
                className="btn btn-secondary flex-1"
                disabled={advanceMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleAdvance}
                className="btn btn-primary flex-1"
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending ? "Advancing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
