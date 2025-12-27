import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { apiClient } from '@/services/apiClient';
import { fetchCannedResponses } from '@/services/cannedResponses';

interface TicketReplySectionProps {
  ticketId: string;
  ticketCreatorId: string;
}

export function TicketReplySection({ ticketId, ticketCreatorId }: TicketReplySectionProps) {
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const authUser = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();

  const isAgent = authUser?.role === 'agent' || authUser?.role === 'admin';
  const canAddReply = authUser?.id === ticketCreatorId || isAgent;

  const addReplyMutation = useMutation({
    mutationFn: async (data: { content: string; isInternal: boolean }) => {
      const response = await apiClient.post(`/tickets/${ticketId}/replies`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-activity', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setReplyContent('');
      setIsInternal(false);
    },
  });

  const handleSubmit = () => {
    if (!replyContent.trim()) return;

    addReplyMutation.mutate({
      content: replyContent.trim(),
      isInternal,
    });
  };

  if (!canAddReply) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isAgent ? 'Add Reply or Note' : 'Add Reply'}
      </Text>

      <TextInput
        style={styles.textInput}
        value={replyContent}
        onChangeText={setReplyContent}
        placeholder={
          isInternal
            ? 'Add an internal note (visible only to agents)...'
            : 'Type your reply...'
        }
        placeholderTextColor="#666"
        multiline
        numberOfLines={4}
        editable={!addReplyMutation.isPending}
      />

      {isAgent && (
        <View style={styles.internalToggle}>
          <Text style={styles.toggleLabel}>Internal Note</Text>
          <Switch
            value={isInternal}
            onValueChange={setIsInternal}
            trackColor={{ false: '#333', true: '#06b6d4' }}
            thumbColor={isInternal ? '#fff' : '#f4f3f4'}
          />
        </View>
      )}

      {isInternal && (
        <Text style={styles.warningText}>⚠️ Only visible to agents</Text>
      )}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!replyContent.trim() || addReplyMutation.isPending) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!replyContent.trim() || addReplyMutation.isPending}
      >
        {addReplyMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isInternal ? 'Add Note' : 'Send Reply'}
          </Text>
        )}
      </TouchableOpacity>

      {addReplyMutation.isError && (
        <Text style={styles.errorText}>Failed to add reply. Please try again.</Text>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  internalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  toggleLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 12,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#06b6d4',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
  },
});
