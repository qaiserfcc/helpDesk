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
import { isAxiosError } from "axios";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/AppNavigator";
import {
  CreateTicketPayload,
  IssueType,
  TicketPriority,
  createTicket,
  fetchTicket,
  updateTicket,
} from "@/services/tickets";
import { queueTicket } from "@/storage/offline-db";
import { syncQueuedTickets } from "@/services/syncService";

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

type Props = NativeStackScreenProps<RootStackParamList, "TicketForm">;

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
  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    enabled: isEdit,
    queryFn: () => fetchTicket(ticketId!),
  });

  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [issueType, setIssueType] = useState<IssueType>("other");
  const [submitting, setSubmitting] = useState(false);

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

  const handleQueueFallback = async (payload: CreateTicketPayload) => {
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

    try {
      if (isEdit && ticketId) {
        await updateTicket(ticketId, payload);
      } else {
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected) {
          await handleQueueFallback(payload);
          return;
        }
        await createTicket(payload);
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
});
