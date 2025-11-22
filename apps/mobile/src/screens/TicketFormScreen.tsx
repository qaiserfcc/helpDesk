import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import * as Network from "expo-network";
import * as DocumentPicker from "expo-document-picker";
import { isAxiosError } from "axios";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/AppNavigator";
import {
  CreateTicketPayload,
  IssueType,
  TicketPriority,
  Ticket,
  createTicket,
  fetchTicket,
  uploadTicketAttachments,
  updateTicket,
} from "@/services/tickets";
import { queueTicket } from "@/storage/offline-db";
import { syncQueuedTickets } from "@/services/syncService";
import { useAuthStore } from "@/store/useAuthStore";

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

type Props = NativeStackScreenProps<RootStackParamList, "TicketForm">;

type AttachmentDraft = {
  uri: string;
  name: string;
  type: string;
};

const defaultMimeType = "application/octet-stream";

function getAttachmentName(path: string) {
  return path.replace(/^.*[\\/]/, "");
}

function isNetworkError(error: unknown) {
  if (isAxiosError(error)) {
    return !error.response;
  }
  return false;
}

export function TicketFormScreen({ route, navigation }: Props) {
  const ticketId = route.params?.ticketId;
  const isEdit = Boolean(ticketId);
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.session?.user);
  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    enabled: isEdit,
    queryFn: () => fetchTicket(ticketId!),
  });

  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [issueType, setIssueType] = useState<IssueType>("other");
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const isResolvedTicket = Boolean(ticket && ticket.status === "resolved");
  const lockedFromEditing = Boolean(isEdit && isResolvedTicket);

  useEffect(() => {
    if (ticket) {
      setDescription(ticket.description);
      setPriority(ticket.priority);
      setIssueType(ticket.issueType);
    }
  }, [ticket]);

  const headerTitle = useMemo(
    () => (isEdit ? "Update ticket" : "Create ticket"),
    [isEdit],
  );

  const handleAddAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const mapped = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name ?? getAttachmentName(asset.uri),
        type: asset.mimeType ?? defaultMimeType,
      }));
      setAttachments((prev) => [...prev, ...mapped]);
    } catch (error) {
      console.error("document picker error", error);
      Alert.alert("Attachment error", "Unable to pick a file right now.");
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQueueFallback = async (payload: CreateTicketPayload) => {
    if (attachments.length) {
      Alert.alert(
        "Attachments pending",
        "Attachments can't be queued offline. Re-open the ticket when you're back online to upload them.",
      );
    }
    const tempId = Crypto.randomUUID();
    await queueTicket({
      tickets: [
        {
          tempId,
          description: payload.description,
          priority: payload.priority,
          issueType: payload.issueType,
          attachments: payload.attachments ?? [],
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await syncQueuedTickets();
    await queryClient.invalidateQueries({ queryKey: ["queuedTickets"] });
    Alert.alert(
      "Queued offline",
      "We stored your ticket locally and will sync it when you reconnect.",
    );
    navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Description required", "Please describe the issue.");
      return;
    }

    setSubmitting(true);
    const payload: CreateTicketPayload = {
      description: description.trim(),
      priority,
      issueType,
    };

    let savedTicket: Ticket | undefined;

    try {
      if (isEdit && ticketId) {
        savedTicket = await updateTicket(ticketId, payload);
      } else {
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected) {
          await handleQueueFallback(payload);
          return;
        }
        savedTicket = await createTicket(payload);
      }

      if (attachments.length && savedTicket) {
        try {
          await uploadTicketAttachments(savedTicket.id, attachments);
          setAttachments([]);
        } catch (error) {
          console.error("attachment upload failed", error);
          Alert.alert(
            "Attachment upload failed",
            "Ticket saved but files could not be uploaded. Please try again from the ticket detail screen.",
          );
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ["tickets"],
        exact: false,
      });
      if (isEdit && ticketId) {
        await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      }
      navigation.goBack();
    } catch (error) {
      if (!isEdit && isNetworkError(error)) {
        await handleQueueFallback(payload);
        return;
      }
      Alert.alert("Save failed", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (lockedFromEditing) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Ticket is resolved</Text>
          <Text style={styles.lockedMessage}>
            Reopen the ticket from the detail screen before making changes.
            Contact support if you need additional help.
          </Text>
          <Pressable style={styles.lockedBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.lockedBtnText}>Back to ticket</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>{headerTitle}</Text>
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Describe the issue"
          placeholderTextColor="#475569"
          style={styles.input}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.optionRow}>
          {priorityOptions.map((option) => {
            const selected = option === priority;
            return (
              <Pressable
                key={option}
                style={[styles.optionChip, selected && styles.optionChipActive]}
                onPress={() => setPriority(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Issue type</Text>
        <View style={styles.optionRow}>
          {issueOptions.map((option) => {
            const selected = option === issueType;
            return (
              <Pressable
                key={option}
                style={[styles.optionChip, selected && styles.optionChipActive]}
                onPress={() => setIssueType(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Attachments</Text>
        {isEdit && ticket?.attachments?.length ? (
          <View style={styles.existingAttachments}>
            <Text style={styles.existingLabel}>Current files</Text>
            {ticket.attachments.map((path) => (
              <Text key={path} style={styles.existingAttachmentText}>
                {getAttachmentName(path)}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.attachmentCard}>
          {attachments.length === 0 ? (
            <Text style={styles.attachmentHint}>No new files selected.</Text>
          ) : (
            attachments.map((file, index) => (
              <View key={`${file.uri}-${index}`} style={styles.attachmentRow}>
                <Text style={styles.attachmentName}>{file.name}</Text>
                <Pressable onPress={() => handleRemoveAttachment(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}
          <Pressable style={styles.attachmentBtn} onPress={handleAddAttachment}>
            <Text style={styles.attachmentBtnText}>+ Add file</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting
              ? "Saving..."
              : isEdit
                ? "Update ticket"
                : "Create ticket"}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 24,
  },
  label: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    color: "#E2E8F0",
    marginBottom: 20,
    textAlignVertical: "top",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  optionChipActive: {
    backgroundColor: "#22D3EE",
    borderColor: "#22D3EE",
  },
  optionText: {
    color: "#CBD5F5",
    textTransform: "capitalize",
  },
  optionTextActive: {
    color: "#0B1120",
    fontWeight: "600",
  },
  existingAttachments: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
    marginBottom: 12,
  },
  existingLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 6,
  },
  existingAttachmentText: {
    color: "#E2E8F0",
    fontSize: 14,
  },
  attachmentCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  attachmentHint: {
    color: "#64748B",
    fontSize: 13,
  },
  attachmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  attachmentName: {
    flex: 1,
    color: "#E2E8F0",
  },
  removeText: {
    color: "#F87171",
    fontWeight: "600",
  },
  attachmentBtn: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#22D3EE",
    paddingVertical: 10,
    alignItems: "center",
  },
  attachmentBtnText: {
    color: "#22D3EE",
    fontWeight: "600",
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#22D3EE",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: "#0B1120",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cancelText: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: 24,
  },
  lockedCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#0F172A",
    padding: 24,
    gap: 16,
  },
  lockedTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
  },
  lockedMessage: {
    color: "#CBD5F5",
    fontSize: 14,
    lineHeight: 20,
  },
  lockedBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#22D3EE",
  },
  lockedBtnText: {
    color: "#22D3EE",
    fontWeight: "600",
  },
});
