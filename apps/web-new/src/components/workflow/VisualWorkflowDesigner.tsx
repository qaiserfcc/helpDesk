"use client";

import { useState } from "react";
import { WorkflowStep } from "@/services/workflows";

interface VisualWorkflowDesignerProps {
  steps: WorkflowStep[];
  onAddStep: () => void;
  onEditStep: (step: WorkflowStep) => void;
  onDeleteStep: (stepId: string) => void;
}

export function VisualWorkflowDesigner({
  steps,
  onAddStep,
  onEditStep,
  onDeleteStep,
}: VisualWorkflowDesignerProps) {
  const [draggedStep, setDraggedStep] = useState<WorkflowStep | null>(null);

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  const handleDragStart = (step: WorkflowStep) => {
    setDraggedStep(step);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetStep: WorkflowStep) => {
    if (!draggedStep || draggedStep.id === targetStep.id) {
      setDraggedStep(null);
      return;
    }

    // Reordering logic would go here
    setDraggedStep(null);
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "agent":
        return "bg-blue-500";
      case "user":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRoleLabel = (role?: string) => {
    return role || "Any";
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white">Workflow Visual Designer</h3>
        <button
          onClick={onAddStep}
          className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
        >
          + Add Step
        </button>
      </div>

      {sortedSteps.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">No steps defined yet</p>
          <button
            onClick={onAddStep}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-600 transition"
          >
            Create First Step
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Workflow Timeline */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-white/30"></div>

          <div className="space-y-6">
            {sortedSteps.map((step, index) => (
              <div key={step.id} className="relative pl-20">
                {/* Step Number Circle */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg z-10">
                  {index + 1}
                </div>

                {/* Step Card */}
                <div
                  draggable
                  onDragStart={() => handleDragStart(step)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(step)}
                  className="bg-white/20 backdrop-blur rounded-lg p-5 border border-white/30 hover:bg-white/30 transition cursor-move group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-semibold text-white">{step.name}</h4>
                        {step.initiatorRole && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getRoleColor(
                              step.initiatorRole
                            )}`}
                          >
                            {getRoleLabel(step.initiatorRole)}
                          </span>
                        )}
                      </div>
                      {step.description && (
                        <p className="text-white/70 text-sm mb-3">{step.description}</p>
                      )}
                      {step.allowedActions && step.allowedActions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {step.allowedActions.map((action: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-cyan-500/30 text-cyan-100 text-xs rounded"
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditStep(step)}
                        className="text-white hover:text-blue-200 text-sm font-medium px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteStep(step.id)}
                        className="text-red-200 hover:text-red-100 text-sm font-medium px-3 py-1 bg-red-500/20 rounded hover:bg-red-500/30 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Arrow to next step */}
                {index < sortedSteps.length - 1 && (
                  <div className="absolute left-8 -bottom-3 flex flex-col items-center z-0">
                    <svg
                      className="w-5 h-5 text-white/50"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Completion Indicator */}
          <div className="relative pl-20 mt-6">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white shadow-lg z-10">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-5 border border-white/30">
              <h4 className="text-xl font-semibold text-white">Workflow Complete</h4>
              <p className="text-white/70 text-sm">Ticket is resolved</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
        <p className="text-blue-100 text-sm">
          💡 <strong>Tip:</strong> Drag and drop steps to reorder them. Each step defines who can
          perform actions and what actions are allowed.
        </p>
      </div>
    </div>
  );
}
