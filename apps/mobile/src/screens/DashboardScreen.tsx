import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Ticket,
  TicketActivityEntry,
  TicketStatus,
  fetchRecentTicketActivity,
  fetchTicketStatusSummary,
  fetchTickets,
} from "@/services/tickets";
import { listQueuedTickets } from "@/storage/offline-db";
import { syncQueuedTickets } from "@/services/syncService";

const statusFilters: Array<{ label: string; value?: TicketStatus }> = [
  { label: "All" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

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

type Navigation = NativeStackNavigationProp<RootStackParamList, "Dashboard">;

export function DashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((state) => state.session?.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [assignedOnly, setAssignedOnly] = useState(false);
  const canCreate = user?.role === "user" || user?.role === "admin";

  const {
    data: tickets = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["tickets", { statusFilter, assignedOnly }],
    queryFn: () =>
      fetchTickets({
        status: statusFilter,
        assignedToMe: assignedOnly || undefined,
      }),
  });

  const {
    data: queuedTickets = [],
    isFetching: queuedLoading,
    refetch: refetchQueued,
  } = useQuery({
    queryKey: ["queuedTickets"],
    queryFn: listQueuedTickets,
  });

  const {
    data: recentActivity = [],
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["reports", "activity"],
    queryFn: () => fetchRecentTicketActivity(10),
    enabled: user?.role === "admin",
  });

  const {
    data: statusSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["reports", "status-summary"],
    queryFn: fetchTicketStatusSummary,
    enabled: user?.role === "admin",
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchQueued();
      if (user?.role === "admin") {
        refetchActivity();
        refetchSummary();
      }
    }, [refetch, refetchQueued, refetchActivity, refetchSummary, user?.role]),
  );

  const counters = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] += 1;
        return acc;
      },
      { open: 0, in_progress: 0, resolved: 0 },
    );
  }, [tickets]);

  const onCreateTicket = () => {
    navigation.navigate("TicketForm");
  };

  const onRefresh = () => {
    refetch();
    refetchQueued();
    if (user?.role === "admin") {
      refetchActivity();
      refetchSummary();
    }
  };

  const queuedCount = queuedTickets.length;

  const renderTicket = ({ item }: { item: Ticket }) => (
    <Pressable
      style={styles.ticketCard}
      onPress={() => navigation.navigate("TicketDetail", { ticketId: item.id })}
    >
      <View style={styles.ticketCardHeader}>
        <Text style={styles.ticketId}>#{item.id.slice(0, 8)}</Text>
        <View style={[styles.statusPill, styles[`status_${item.status}`]]}>
          <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.ticketDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.ticketMetaRow}>
        <Text style={styles.metaText}>Priority: {item.priority}</Text>
        <Text style={styles.metaText}>Type: {item.issueType}</Text>
      </View>
      <Text style={styles.metaSubtext}>
        {item.assignee ? `Assigned to ${item.assignee.name}` : "Unassigned"}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Help Desk</Text>
            <Text style={styles.subtitle}>
              {user ? `Welcome, ${user.name}` : "Tickets overview"}
            </Text>
          </View>
          <Pressable style={styles.signOut} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.cardsRow}>
          {["open", "in_progress", "resolved"].map((statusKey) => (
            <View key={statusKey} style={styles.card}>
              <Text style={styles.cardLabel}>
                {formatStatus(statusKey as TicketStatus)}
              </Text>
              <Text style={styles.cardValue}>
                {statusKey === "open"
                  ? counters.open
                  : statusKey === "in_progress"
                    ? counters.in_progress
                    : counters.resolved}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterTabs}>
            {statusFilters.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <Pressable
                  key={filter.label}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(filter.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {user?.role !== "user" && (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Assigned to me</Text>
              <Switch
                value={assignedOnly}
                onValueChange={setAssignedOnly}
                trackColor={{ false: "#475569", true: "#38BDF8" }}
              />
            </View>
          )}
        </View>

        {queuedCount > 0 && (
          <View style={styles.queueBanner}>
            <View>
              <Text style={styles.queueTitle}>
                {queuedCount} offline ticket(s)
              </Text>
              <Text style={styles.queueSubtitle}>
                We will sync automatically when you are online.
              </Text>
            </View>
            <Pressable
              style={styles.syncButton}
              onPress={() => syncQueuedTickets().then(() => refetchQueued())}
            >
              {queuedLoading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.syncText}>Sync now</Text>
              )}
            </Pressable>
          </View>
        )}

        {user?.role === "admin" && (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>Status summary</Text>
            {summaryLoading && !statusSummary ? (
              <ActivityIndicator color="#38BDF8" />
            ) : statusSummary ? (
              <View style={styles.summaryGrid}>
                {statusSummary.statuses.map((bucket) => (
                  <View key={bucket.status} style={styles.summaryChip}>
                    <Text style={styles.summaryChipLabel}>
                      {formatStatus(bucket.status)}
                    </Text>
                    <Text style={styles.summaryChipValue}>{bucket.count}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.reportHint}>No summary data yet.</Text>
            )}
            <Text style={styles.reportTitle}>Assignments</Text>
            {summaryLoading && !statusSummary ? (
              <ActivityIndicator color="#38BDF8" />
            ) : statusSummary && statusSummary.assignments.length > 0 ? (
              <View style={styles.assignmentList}>
                {statusSummary.assignments.map((assignment) => (
                  <View key={assignment.agentId} style={styles.assignmentRow}>
                    <Text style={styles.assignmentName}>
                      {assignment.agent?.name ?? "Unknown agent"}
                    </Text>
                    <Text style={styles.assignmentCount}>{assignment.count}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.reportHint}>No active assignments.</Text>
            )}
          </View>
        )}

        {user?.role === "admin" && (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>Recent activity</Text>
            {activityLoading && recentActivity.length === 0 ? (
              <ActivityIndicator color="#38BDF8" />
            ) : recentActivity.length === 0 ? (
              <Text style={styles.reportHint}>No recent changes.</Text>
            ) : (
              <View style={styles.activityFeed}>
                {recentActivity.map((entry: TicketActivityEntry) => (
                  <View key={entry.id} style={styles.activityFeedRow}>
                    <View>
                      <Text style={styles.activityFeedText}>
                        {entry.actor.name} • {entry.type.replace("_", " ")}
                      </Text>
                      <Text style={styles.activityFeedSub}>
                        Ticket #{entry.ticketId.slice(0, 6)}
                      </Text>
                    </View>
                    <Text style={styles.activityFeedTime}>
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || isRefetching}
              onRefresh={onRefresh}
              tintColor="#38BDF8"
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No tickets found</Text>
              <Text style={styles.emptySubtitle}>
                {canCreate
                  ? "Try a different filter or create a new ticket below."
                  : "Try a different filter or request access from an admin."}
              </Text>
            </View>
          )}
        />

        {canCreate && (
          <Pressable style={styles.primaryCta} onPress={onCreateTicket}>
            <Text style={styles.primaryText}>Create Ticket</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#020617",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: "#CBD5F5",
  },
  signOut: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
  },
  signOutText: {
    color: "#E2E8F0",
    fontSize: 13,
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#0F172A",
  },
  cardLabel: {
    fontSize: 13,
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  cardValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  filterRow: {
    marginTop: 16,
  },
  filterTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  filterChipActive: {
    backgroundColor: "#22D3EE",
    borderColor: "#22D3EE",
  },
  filterChipText: {
    color: "#CBD5F5",
    fontSize: 13,
  },
  filterChipTextActive: {
    color: "#0F172A",
    fontWeight: "600",
  },
  switchRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    color: "#E2E8F0",
    fontSize: 14,
    marginRight: 8,
  },
  queueBanner: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  queueTitle: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  queueSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  syncButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#22D3EE",
  },
  syncText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  ticketCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  ticketCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketId: {
    color: "#94A3B8",
    fontSize: 13,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  status_open: {
    backgroundColor: "#0F172A",
  },
  status_in_progress: {
    backgroundColor: "#1E3A8A",
  },
  status_resolved: {
    backgroundColor: "#0F766E",
  },
  statusText: {
    color: "#F8FAFC",
    fontSize: 12,
  },
  ticketDescription: {
    marginTop: 12,
    color: "#E2E8F0",
    fontSize: 16,
  },
  ticketMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  metaSubtext: {
    marginTop: 6,
    color: "#CBD5F5",
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 140,
  },
  emptyState: {
    marginTop: 80,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    marginTop: 8,
    color: "#94A3B8",
    textAlign: "center",
  },
  primaryCta: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#22D3EE",
  },
  primaryText: {
    fontWeight: "700",
    color: "#020617",
  },
  reportCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  reportTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  reportHint: {
    color: "#94A3B8",
    fontSize: 13,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  summaryChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 10,
    backgroundColor: "#0B1220",
    flexBasis: "30%",
  },
  summaryChipLabel: {
    color: "#CBD5F5",
    fontSize: 12,
  },
  summaryChipValue: {
    marginTop: 6,
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  assignmentList: {
    marginTop: 8,
    gap: 8,
  },
  assignmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  assignmentName: {
    color: "#E2E8F0",
    fontSize: 14,
  },
  assignmentCount: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  activityFeed: {
    marginTop: 8,
    gap: 10,
  },
  activityFeedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  activityFeedText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
  },
  activityFeedSub: {
    color: "#94A3B8",
    fontSize: 12,
  },
  activityFeedTime: {
    color: "#94A3B8",
    fontSize: 12,
  },
});
