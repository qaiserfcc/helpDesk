import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllowedActions, advanceWorkflowStep } from '../services/workflows';

interface WorkflowActionControlsProps {
  ticketId: string;
  ticketStatus: string;
  userRole: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  update: 'Update',
  assign: 'Assign',
  resolve: 'Resolve',
  escalate: 'Escalate',
  comment: 'Comment',
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  create: 'Create ticket',
  update: 'Update ticket details',
  assign: 'Assign ticket to agent',
  resolve: 'Resolve ticket',
  escalate: 'Escalate ticket',
  comment: 'Add comments/replies',
};

export function WorkflowActionControls({
  ticketId,
  ticketStatus,
  userRole,
}: WorkflowActionControlsProps) {
  const [notes, setNotes] = useState('');
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: allowedActionsData, isLoading } = useQuery({
    queryKey: ['workflow-actions', ticketId],
    queryFn: () => fetchAllowedActions(ticketId),
    enabled: !!ticketId,
  });

  const advanceMutation = useMutation({
    mutationFn: (notes?: string) => advanceWorkflowStep(ticketId, notes),
    onSuccess: (data) => {
      alert(data.message);
      setShowAdvanceDialog(false);
      setNotes('');
      // Invalidate queries to refresh ticket data
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-actions', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-activity', ticketId] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to advance workflow step');
    },
  });

  if (isLoading || !allowedActionsData) {
    return null;
  }

  const { currentStep, allowedActions, canAdvance } = allowedActionsData;

  // Don't show if no workflow or resolved
  if (!currentStep || ticketStatus === 'resolved') {
    return null;
  }

  const handleAdvance = () => {
    advanceMutation.mutate(notes || undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workflow Actions</Text>
        {currentStep && (
          <Text style={styles.subtitle}>Current Step: {currentStep.name}</Text>
        )}
      </View>

      {/* Allowed Actions */}
      {allowedActions && allowedActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allowed Actions at Current Step:</Text>
          <View style={styles.actionsGrid}>
            {allowedActions.map((action) => (
              <View key={action} style={styles.actionItem}>
                <Text style={styles.actionCheckmark}>✓</Text>
                <Text style={styles.actionLabel}>
                  {ACTION_LABELS[action] || action}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Advance Step Button */}
      {canAdvance && (
        <TouchableOpacity
          style={[styles.advanceButton, advanceMutation.isPending && styles.advanceButtonDisabled]}
          onPress={() => setShowAdvanceDialog(true)}
          disabled={advanceMutation.isPending}
        >
          {advanceMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.advanceButtonText}>→ Advance to Next Step</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* No actions available */}
      {(!allowedActions || allowedActions.length === 0) && !canAdvance && (
        <View style={styles.noActionsContainer}>
          <Text style={styles.noActionsText}>
            No workflow actions available at this step for your role
          </Text>
        </View>
      )}

      {/* Advance Dialog */}
      <Modal
        visible={showAdvanceDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAdvanceDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Advance Workflow Step</Text>
            <Text style={styles.modalDescription}>
              You are about to advance this ticket to the next workflow step.
            </Text>

            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this step advancement..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAdvanceDialog(false);
                  setNotes('');
                }}
                disabled={advanceMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAdvance}
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: '45%',
  },
  actionCheckmark: {
    color: '#06b6d4',
    fontSize: 16,
    marginRight: 8,
  },
  actionLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  advanceButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceButtonDisabled: {
    opacity: 0.5,
  },
  advanceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noActionsContainer: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noActionsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 96,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#7c3aed',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
