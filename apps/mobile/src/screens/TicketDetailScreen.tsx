import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/useAuthStore";
import {
  assignTicket,
  declineAssignmentRequest,
  fetchTicket,
  requestAssignment,
  resolveTicket,
  TicketStatus,
} from "@/services/tickets";
import { env } from "@/config/env";

function formatStatus(status: TicketStatus) {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    default:
      return status;
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "TicketDetail">;

const httpLikePattern = /^https?:\/\//i;

const buildAttachmentUrl = (path: string) => {
  if (httpLikePattern.test(path)) {
    return path;
  }
  const sanitized = path.replace(/^\/+/, "");
  return `${env.apiBaseUrl}/${sanitized}`;
};

export function TicketDetailScreen({ route, navigation }: Props) {
  const { ticketId } = route.params;
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.session?.user);
  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const isAdmin = authUser?.role === "admin";
  const isAgent = authUser?.role === "agent";
  const canAssign = isAdmin;
  const canEdit = Boolean(
    ticket &&
      ((isAdmin && authUser?.id) ||
        (authUser?.role === "user" && ticket.creator.id === authUser.id)),
  );
  const pendingRequest = ticket?.assignmentRequest;
  const agentHasPendingRequest =
    isAgent && pendingRequest?.id === authUser?.id;
  const otherAgentRequested =
    isAgent && !!pendingRequest && pendingRequest.id !== authUser?.id;
  const isAssignedAgent =
    isAgent && ticket?.assignee?.id === authUser?.id;
  const canResolve = Boolean(isAssignedAgent && ticket?.status !== "resolved");
  const canDeclineRequest = Boolean(canAssign && pendingRequest);
  const canRequestAssignment = Boolean(
    isAgent &&
      !ticket?.assignee &&
      ticket?.status !== "resolved" &&
      !isAssignedAgent,
  );

  const invalidateTickets = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["tickets"],
      exact: false,
    });
    await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
  };

  const handleAssign = async () => {
    if (!ticket) return;
    if (!ticket.assignmentRequest) {
      Alert.alert(
        "No pending request",
        "This ticket has no agent request to approve yet.",
      );
      return;
    }
    try {
      await assignTicket(ticketId, ticket.assignmentRequest.id);
      await invalidateTickets();
    } catch (error) {
      console.error("assign ticket failed", error);
      Alert.alert("Assignment failed", "Please try again in a moment.");
    }
  };

  const handleDeclineRequest = async () => {
    if (!pendingRequest) {
      return;
    }
    try {
      await declineAssignmentRequest(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("decline request failed", error);
      Alert.alert("Decline failed", "Please try again in a moment.");
    }
  };

  const handleResolve = async () => {
    try {
      await resolveTicket(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("resolve ticket failed", error);
      Alert.alert("Resolve failed", "Please try again in a moment.");
    }
  };

  const handleEdit = () => {
    navigation.navigate("TicketForm", { ticketId });
  };

  const handleRequestAssignment = async () => {
    try {
      await requestAssignment(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("request assignment failed", error);
      Alert.alert(
        "Request failed",
        "Unable to request this ticket right now.",
      );
    }
  };

  const handleOpenAttachment = async (attachment: string) => {
    const url = buildAttachmentUrl(attachment);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Cannot open attachment", "Unsupported file link.");
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error("open attachment failed", error);
      Alert.alert("Unable to open attachment", "Please try again later.");
    }
  };

  if (isLoading || !ticket) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.ticketId}>Ticket #{ticket.id.slice(0, 8)}</Text>
      <Text style={styles.title}>{ticket.description}</Text>

      <View style={styles.badgesRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Status</Text>
          <Text style={styles.badgeValue}>{formatStatus(ticket.status)}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Priority</Text>
          <Text style={styles.badgeValue}>{ticket.priority}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Type</Text>
          <Text style={styles.badgeValue}>{ticket.issueType}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Creator</Text>
        <Text style={styles.sectionValue}>{ticket.creator.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Assignee</Text>
        <Text style={styles.sectionValue}>
          {ticket.assignee ? ticket.assignee.name : "Unassigned"}
        </Text>
        {ticket.assignmentRequest && !ticket.assignee && (
          <Text style={styles.assignmentNote}>
            Requested by {ticket.assignmentRequest.name}
          </Text>
        )}
      </View>

      {ticket.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Attachments</Text>
          {ticket.attachments.map((attachment) => (
            <Pressable
              key={attachment}
              style={styles.attachmentButton}
              onPress={() => handleOpenAttachment(attachment)}
            >
              <Text style={styles.attachmentLabel}>
                {attachment.split("/").pop() ?? attachment}
              </Text>
              <Text style={styles.attachmentHint}>Tap to open</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        {canEdit && (
          <Pressable style={styles.secondaryBtn} onPress={handleEdit}>
            <Text style={styles.secondaryText}>Edit ticket</Text>
          </Pressable>
        )}
        {canAssign && ticket.status !== "resolved" && (
          <Pressable
            style={[styles.primaryBtn, !pendingRequest && styles.disabledBtn]}
            onPress={handleAssign}
            disabled={!pendingRequest}
          >
            <Text style={styles.primaryText}>
              {pendingRequest
                ? `Assign to ${pendingRequest.name}`
                : "Awaiting agent request"}
            </Text>
          </Pressable>
        )}
          {canDeclineRequest && ticket.status !== "resolved" && (
            <Pressable
              style={[styles.secondaryBtn, styles.dangerBtn]}
              onPress={handleDeclineRequest}
            >
              <Text style={styles.dangerText}>Decline request</Text>
            </Pressable>
          )}
          {canRequestAssignment && (
          <Pressable
            style={[
              styles.secondaryBtn,
              (agentHasPendingRequest || otherAgentRequested) &&
                styles.disabledBtn,
            ]}
            onPress={handleRequestAssignment}
            disabled={agentHasPendingRequest || otherAgentRequested}
          >
            <Text style={styles.secondaryText}>
              {agentHasPendingRequest
                ? "Request pending approval"
                : otherAgentRequested
                  ? "Another agent requested"
                  : "Request assignment"}
            </Text>
          </Pressable>
        )}
        {canResolve && (
          <Pressable
            style={[styles.primaryBtn, styles.resolveBtn]}
            onPress={handleResolve}
          >
            <Text style={styles.primaryText}>Resolve</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  ticketId: {
    color: "#94A3B8",
    fontSize: 14,
  },
  title: {
    marginTop: 8,
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "700",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  badge: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    padding: 12,
  },
  badgeLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  badgeValue: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 6,
  },
  sectionValue: {
    color: "#E2E8F0",
    fontSize: 16,
  },
  attachmentButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1D4ED8",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
    backgroundColor: "#0F172A",
  },
  attachmentLabel: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  attachmentHint: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    marginTop: 28,
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#22D3EE",
  },
  resolveBtn: {
    backgroundColor: "#0EA5E9",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryText: {
    color: "#0B1120",
    fontWeight: "700",
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  secondaryText: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  dangerBtn: {
    borderColor: "#DC2626",
  },
  dangerText: {
    color: "#FCA5A5",
    fontWeight: "600",
  },
  assignmentNote: {
    marginTop: 4,
    color: "#FACC15",
    fontSize: 13,
  },
});
