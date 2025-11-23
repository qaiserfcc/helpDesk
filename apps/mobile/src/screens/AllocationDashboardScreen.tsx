import React, { useMemo, useReducer } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/AppNavigator";
import {
  fetchAdminOverviewReport,
  fetchAdminProductivityReport,
  fetchAdminEscalationReport,
  type ReportTicket,
  type StatusCounts,
} from "@/services/tickets";
import { formatTicketStatus } from "@/utils/ticketActivity";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { RoleRestrictedView } from "@/components/RoleRestrictedView";
import {
  buildStatusBuckets,
  deriveTrendSummary,
  deriveWorkloadStats,
  insightViewReducer,
  INSIGHT_TABS,
  DEFAULT_STATUS_COUNTS,
  type AssignmentLoadEntry,
  type ResolutionTrendEntry,
} from "./AllocationDashboardScreen.helpers";

const formatStatus = formatTicketStatus;

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "AllocationDashboard"
>;

export function AllocationDashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const { isAuthorized } = useRoleGuard(["admin"]);
  const [insightView, dispatchInsightView] = useReducer(
    insightViewReducer,
    "agents",
  );

  const {
    data: overview,
    isLoading: overviewLoading,
    isRefetching: overviewRefetching,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["reports", "allocation", "overview"],
    queryFn: fetchAdminOverviewReport,
    enabled: isAuthorized,
  });

  const {
    data: productivity,
    isLoading: productivityLoading,
    isRefetching: productivityRefetching,
    refetch: refetchProductivity,
  } = useQuery({
    queryKey: ["reports", "allocation", "productivity"],
    queryFn: () => fetchAdminProductivityReport(14),
    enabled: isAuthorized,
  });

  const {
    data: escalations,
    isLoading: escalationsLoading,
    isRefetching: escalationsRefetching,
    refetch: refetchEscalations,
  } = useQuery({
    queryKey: ["reports", "allocation", "escalations"],
    queryFn: fetchAdminEscalationReport,
    enabled: isAuthorized,
  });

  const refreshing =
    overviewRefetching || productivityRefetching || escalationsRefetching;

  const statusCounts: StatusCounts =
    overview?.statusCounts ?? DEFAULT_STATUS_COUNTS;
  const assignments: AssignmentLoadEntry[] = overview?.assignmentLoad ?? [];
  const oldestOpen = overview?.oldestOpen ?? [];
  const resolutionTrend: ResolutionTrendEntry[] =
    productivity?.resolutionTrend ?? [];
  const highPriority = escalations?.highPriority ?? [];
  const staleTickets = escalations?.staleTickets ?? [];

  const statusBuckets = buildStatusBuckets(statusCounts);

  const totalTickets = statusBuckets.reduce(
    (acc, bucket) => acc + bucket.count,
    0,
  );

  const workloadStats = useMemo(
    () => deriveWorkloadStats(assignments),
    [assignments],
  );

  const trendSummary = useMemo(
    () => deriveTrendSummary(resolutionTrend),
    [resolutionTrend],
  );

  const insightContent =
    insightView === "agents" ? (
      overviewLoading && assignments.length === 0 ? (
        <ActivityIndicator color="#38BDF8" />
      ) : assignments.length > 0 ? (
        <View style={styles.assignmentList}>
          {assignments
            .slice()
            .sort((a, b) => b.count - a.count)
            .map((assignment) => (
              <View key={assignment.agentId} style={styles.assignmentRow}>
                <View>
                  <Text style={styles.assignmentName}>
                    {assignment.agent?.name ?? "Unknown agent"}
                  </Text>
                  <Text style={styles.assignmentMeta}>
                    {assignment.agent?.email ?? "N/A"}
                  </Text>
                </View>
                <View style={styles.assignmentBadge}>
                  <Text style={styles.assignmentValue}>{assignment.count}</Text>
                  <Text style={styles.assignmentLabel}>Tickets</Text>
                </View>
              </View>
            ))}
        </View>
      ) : (
        <Text style={styles.sectionHint}>No agent workload data yet.</Text>
      )
    ) : overviewLoading && oldestOpen.length === 0 ? (
      <ActivityIndicator color="#38BDF8" />
    ) : oldestOpen.length > 0 ? (
      <View style={styles.ticketList}>
        {oldestOpen.map((ticket: ReportTicket) => (
          <View key={ticket.id} style={styles.ticketRow}>
            <View style={styles.ticketTextGroup}>
              <Text style={styles.ticketTitle}>{ticket.description}</Text>
              <Text style={styles.ticketMeta}>
                Opened {new Date(ticket.createdAt).toLocaleDateString()} •{" "}
                {ticket.creator.name}
              </Text>
            </View>
            <Text style={styles.ticketStatus}>
              {formatStatus(ticket.status)}
            </Text>
          </View>
        ))}
      </View>
    ) : (
      <Text style={styles.sectionHint}>No aging backlog entries.</Text>
    );

  const onRefresh = () => {
    refetchOverview();
    refetchProductivity();
    refetchEscalations();
  };

  if (!isAuthorized) {
    return (
      <RoleRestrictedView
        title="Admins only"
        message="You need admin access to inspect allocation reports."
        onBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38BDF8"
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backIcon}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backGlyph}>←</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>Allocation dashboard</Text>
            <Text style={styles.subtitle}>Live workload + reporting</Text>
          </View>
        </View>

        <View style={styles.summaryHighlights}>
          {statusBuckets.map((bucket) => (
            <View key={bucket.status} style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>
                {formatStatus(bucket.status)}
              </Text>
              <Text style={styles.highlightValue}>{bucket.count}</Text>
              <Text style={styles.highlightHint}>
                {totalTickets
                  ? `${Math.round((bucket.count / totalTickets) * 100)}%`
                  : "0%"}{" "}
                of tracked
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Allocation snapshot</Text>
          <Text style={styles.sectionSubtitle}>
            {workloadStats.totalAgents} active agent
            {workloadStats.totalAgents === 1 ? "" : "s"}
          </Text>
          <View style={styles.snapshotRow}>
            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>Avg load</Text>
              <Text style={styles.snapshotValue}>
                {workloadStats.averageLoad}
              </Text>
              <Text style={styles.snapshotHint}>tickets / agent</Text>
            </View>
            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>Total assigned</Text>
              <Text style={styles.snapshotValue}>
                {workloadStats.totalAssignments}
              </Text>
              <Text style={styles.snapshotHint}>tickets</Text>
            </View>
            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>Busiest agent</Text>
              <Text style={styles.snapshotValue} numberOfLines={1}>
                {workloadStats.busiestAgent?.agent?.name ?? "—"}
              </Text>
              <Text style={styles.snapshotHint}>
                {workloadStats.busiestAgent
                  ? `${workloadStats.busiestAgent.count} tickets`
                  : "No load"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Live backlog</Text>
              <Text style={styles.sectionSubtitle}>
                {insightView === "agents"
                  ? "Assignments per agent"
                  : "Oldest unresolved tickets"}
              </Text>
            </View>
            <View style={styles.filterRow}>
              {INSIGHT_TABS.map((tab) => {
                const active = insightView === tab.value;
                return (
                  <Pressable
                    key={tab.value}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      dispatchInsightView({ type: "select", view: tab.value })
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {insightContent}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Resolution trend</Text>
              <Text style={styles.sectionSubtitle}>
                Last {trendSummary.window || 0} days • {trendSummary.total}{" "}
                tickets
              </Text>
            </View>
          </View>
          {productivityLoading && resolutionTrend.length === 0 ? (
            <ActivityIndicator color="#38BDF8" />
          ) : resolutionTrend.length > 0 ? (
            <View style={styles.trendList}>
              {resolutionTrend.map((entry) => (
                <View key={entry.date} style={styles.trendRow}>
                  <View>
                    <Text style={styles.trendLabel}>
                      {new Date(entry.date).toLocaleDateString()}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(entry.count * 8, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.trendValue}>{entry.count}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.sectionHint}>
              No resolution data captured yet.
            </Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Escalation alerts</Text>
          <Text style={styles.sectionSubtitle}>High priority + stale</Text>
          {escalationsLoading &&
          highPriority.length === 0 &&
          staleTickets.length === 0 ? (
            <ActivityIndicator color="#38BDF8" />
          ) : highPriority.length === 0 && staleTickets.length === 0 ? (
            <Text style={styles.sectionHint}>No escalations detected.</Text>
          ) : (
            <View style={styles.ticketList}>
              {highPriority.slice(0, 3).map((ticket) => (
                <View key={`high-${ticket.id}`} style={styles.ticketRow}>
                  <View style={styles.ticketTextGroup}>
                    <Text style={styles.ticketTitle}>{ticket.description}</Text>
                    <Text style={styles.ticketMeta}>
                      {formatStatus(ticket.status)} • HIGH
                    </Text>
                  </View>
                  <Text style={styles.ticketStatus}>🔥</Text>
                </View>
              ))}
              {staleTickets.slice(0, 3).map((ticket) => (
                <View key={`stale-${ticket.id}`} style={styles.ticketRow}>
                  <View style={styles.ticketTextGroup}>
                    <Text style={styles.ticketTitle}>{ticket.description}</Text>
                    <Text style={styles.ticketMeta}>
                      Updated {new Date(ticket.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.ticketStatus}>⏳</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: {
    color: "#E2E8F0",
    fontSize: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    marginTop: 4,
  },
  summaryHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  highlightCard: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    backgroundColor: "#0B1220",
  },
  highlightLabel: {
    color: "#94A3B8",
    fontSize: 13,
    textTransform: "uppercase",
  },
  highlightValue: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  highlightHint: {
    color: "#64748B",
    marginTop: 4,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionSubtitle: {
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 12,
  },
  sectionHint: {
    color: "#94A3B8",
  },
  snapshotRow: {
    flexDirection: "row",
    gap: 12,
  },
  snapshotCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    backgroundColor: "#111827",
  },
  snapshotLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  snapshotValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
  snapshotHint: {
    color: "#64748B",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#0B1120",
  },
  filterChipActive: {
    borderColor: "#22D3EE",
    backgroundColor: "#082F49",
  },
  filterChipText: {
    color: "#94A3B8",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#F8FAFC",
  },
  assignmentList: {
    marginTop: 4,
  },
  assignmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  assignmentName: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  assignmentMeta: {
    color: "#94A3B8",
    fontSize: 12,
  },
  assignmentBadge: {
    minWidth: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  assignmentValue: {
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 18,
  },
  assignmentLabel: {
    color: "#94A3B8",
    fontSize: 11,
  },
  ticketList: {
    gap: 12,
  },
  ticketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingBottom: 12,
  },
  ticketTextGroup: {
    flex: 1,
  },
  ticketTitle: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  ticketMeta: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  ticketStatus: {
    color: "#E2E8F0",
    fontWeight: "700",
  },
  trendList: {
    gap: 12,
  },
  trendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  trendLabel: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  trendValue: {
    color: "#F8FAFC",
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1E293B",
    marginTop: 6,
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#22D3EE",
  },
});
