"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWorkflow } from "@/services/workflows";

interface WorkflowProgressIndicatorProps {
  workflowId: string | null;
  currentStepId: string | null;
}

export function WorkflowProgressIndicator({
  workflowId,
  currentStepId,
}: WorkflowProgressIndicatorProps) {
  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => fetchWorkflow(workflowId!),
    enabled: !!workflowId,
  });

  if (!workflowId || isLoading || !workflow) {
    return null;
  }

  const steps = workflow.steps || [];
  const currentStepIndex = steps.findIndex((step: any) => step.id === currentStepId);
  const completedSteps = currentStepIndex >= 0 ? currentStepIndex : 0;
  const totalSteps = steps.length;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Workflow Progress</h3>
        <span className="text-sm text-white/60">
          {workflow.name} (v{workflow.version})
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-white/70 mb-2">
          <span>Step {completedSteps + 1} of {totalSteps}</span>
          <span>{Math.round(((completedSteps + 1) / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((completedSteps + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step List */}
      <div className="space-y-3">
        {steps.map((step: any, index: number) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = step.id === currentStepId;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                isCurrent
                  ? "bg-cyan-500/20 border border-cyan-500/30"
                  : isCompleted
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              {/* Step Icon */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  isCurrent
                    ? "bg-cyan-500 text-white"
                    : isCompleted
                    ? "bg-green-500 text-white"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4
                    className={`font-medium ${
                      isCurrent ? "text-white" : isCompleted ? "text-green-400" : "text-white/60"
                    }`}
                  >
                    {step.name}
                  </h4>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                      Current
                    </span>
                  )}
                  {isCompleted && (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      Completed
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-sm text-white/50 mt-1">{step.description}</p>
                )}
                {step.initiatorRole && (
                  <p className="text-xs text-white/40 mt-1">
                    Role: <span className="capitalize">{step.initiatorRole}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Workflow Complete or On Final Step */}
      {currentStepIndex >= 0 && currentStepIndex === totalSteps - 1 && (
        <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
          ✅ On Final Workflow Step
        </div>
      )}
    </div>
  );
}
