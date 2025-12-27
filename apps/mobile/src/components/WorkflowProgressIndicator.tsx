import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkflow } from '@/services/workflows';

interface WorkflowProgressIndicatorProps {
  workflowId: string | null;
  currentStepId: string | null;
}

export function WorkflowProgressIndicator({
  workflowId,
  currentStepId,
}: WorkflowProgressIndicatorProps) {
  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
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
  const progress = ((completedSteps + 1) / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workflow Progress</Text>
        <Text style={styles.subtitle}>
          {workflow.name} (v{workflow.version})
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Step {completedSteps + 1} of {totalSteps}
          </Text>
          <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Steps List */}
      <View style={styles.stepsList}>
        {steps.map((step: any, index: number) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = step.id === currentStepId;
          const isPending = index > currentStepIndex;

          return (
            <View
              key={step.id}
              style={[
                styles.stepItem,
                isCurrent && styles.stepItemCurrent,
                isCompleted && styles.stepItemCompleted,
              ]}
            >
              <View
                style={[
                  styles.stepIcon,
                  isCurrent && styles.stepIconCurrent,
                  isCompleted && styles.stepIconCompleted,
                  isPending && styles.stepIconPending,
                ]}
              >
                <Text
                  style={[
                    styles.stepIconText,
                    (isCurrent || isCompleted) && styles.stepIconTextActive,
                  ]}
                >
                  {isCompleted ? '✓' : index + 1}
                </Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text
                    style={[
                      styles.stepName,
                      isCurrent && styles.stepNameCurrent,
                      isCompleted && styles.stepNameCompleted,
                    ]}
                  >
                    {step.name}
                  </Text>
                  {isCurrent && <Text style={styles.badge}>Current</Text>}
                  {isCompleted && <Text style={styles.badgeCompleted}>Completed</Text>}
                </View>
                {step.description && (
                  <Text style={styles.stepDescription}>{step.description}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {currentStepIndex === totalSteps - 1 && (
        <View style={styles.completeMessage}>
          <Text style={styles.completeMessageText}>✅ Workflow Complete</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 4,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepItemCurrent: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  stepItemCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepIconCurrent: {
    backgroundColor: '#06b6d4',
  },
  stepIconCompleted: {
    backgroundColor: '#22c55e',
  },
  stepIconPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  stepIconTextActive: {
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  stepNameCurrent: {
    color: '#fff',
  },
  stepNameCompleted: {
    color: '#22c55e',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    fontSize: 10,
    fontWeight: '600',
    color: '#06b6d4',
  },
  badgeCompleted: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    fontSize: 10,
    fontWeight: '600',
    color: '#22c55e',
  },
  stepDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  completeMessage: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
  },
  completeMessageText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
});
