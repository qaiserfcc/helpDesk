import React from "react";
import {
  ActivityIndicator,
  Alert,
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
  fetchTicket,
  resolveTicket,
  TicketStatus,
} from "@/services/tickets";

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

export function TicketDetailScreen({ route, navigation }: Props) {
  const { ticketId } = route.params;
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.session?.user);
  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const canAssign = authUser?.role === "agent" || authUser?.role === "admin";
  const canEdit = authUser?.id && ticket?.creator.id === authUser.id;

  const invalidateTickets = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["tickets"],
      exact: false,
    });
    await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
  };

  const handleAssign = async () => {
    try {
      await assignTicket(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("assign ticket failed", error);
      Alert.alert("Assignment failed", "Please try again in a moment.");
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
      </View>

      {ticket.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Attachments</Text>
          {ticket.attachments.map((attachment) => (
            <Text key={attachment} style={styles.attachment}>
              {attachment}
            </Text>
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
          <Pressable style={styles.primaryBtn} onPress={handleAssign}>
            <Text style={styles.primaryText}>
              {ticket.assignee ? "Reassign to me" : "Assign to me"}
            </Text>
          </Pressable>
        )}
        {canAssign && ticket.status !== "resolved" && (
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
  attachment: {
    color: "#38BDF8",
    marginTop: 4,
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
});
