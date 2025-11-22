import React, { useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/AppNavigator";
import {
  TicketActivityEntry,
  TicketStatus,
  fetchRecentTicketActivity,
  fetchTicketStatusSummary,
} from "@/services/tickets";
import { useAuthStore } from "@/store/useAuthStore";
import {
  describeTicketActivity,
  formatTicketStatus,
} from "@/utils/ticketActivity";

const formatStatus = formatTicketStatus;

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "StatusSummary"
>;

export function StatusSummaryScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((state) => state.session?.user);

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["reports", "status-summary"],
    queryFn: fetchTicketStatusSummary,
    enabled: user?.role === "admin",
  });

  const {
    data: recentActivity = [],
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["reports", "activity"],
    queryFn: () => fetchRecentTicketActivity(25),
    enabled: user?.role === "admin",
  });

  const statusBuckets = summary?.statuses ?? [];
  const assignments = summary?.assignments ?? [];
  const totalTickets = statusBuckets.reduce(
    (acc, bucket) => acc + bucket.count,
    0,
  );

  const topAgents = useMemo(() => {
    return [...assignments].sort((a, b) => b.count - a.count);
  }, [assignments]);

  const onRefresh = () => {
    refetchSummary();
    refetchActivity();
  };

  if (user?.role !== "admin") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedTitle}>Admins only</Text>
          <Text style={styles.unauthorizedCopy}>
            You need admin access to see the organization-wide status summary.
          </Text>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={summaryLoading || activityLoading}
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
            <Text style={styles.title}>Organization report</Text>
            <Text style={styles.subtitle}>Live ticket overview</Text>
          </View>
        </View>

        <View style={styles.summaryHighlights}>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Total tickets</Text>
            <Text style={styles.highlightValue}>{totalTickets}</Text>
          </View>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Open</Text>
            <Text style={styles.highlightValue}>
              {statusBuckets.find((bucket) => bucket.status === "open")
                ?.count ?? 0}
            </Text>
          </View>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>In progress</Text>
            <Text style={styles.highlightValue}>
              {statusBuckets.find((bucket) => bucket.status === "in_progress")
                ?.count ?? 0}
            </Text>
          </View>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Resolved</Text>
            <Text style={styles.highlightValue}>
              {statusBuckets.find((bucket) => bucket.status === "resolved")
                ?.count ?? 0}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Status distribution</Text>
          {summaryLoading && !summary ? (
            <ActivityIndicator color="#38BDF8" />
          ) : statusBuckets.length > 0 ? (
            <View style={styles.statusList}>
              {statusBuckets.map((bucket) => {
                const share = totalTickets
                  ? Math.round((bucket.count / totalTickets) * 100)
                  : 0;
                return (
                  <View key={bucket.status} style={styles.statusRow}>
                    <View>
                      <Text style={styles.statusLabel}>
                        {formatStatus(bucket.status)}
                      </Text>
                      <Text style={styles.statusShare}>{share}% of total</Text>
                    </View>
                    <View style={styles.statusMetric}>
                      <Text style={styles.statusValue}>{bucket.count}</Text>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.max(share, 5)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.sectionHint}>No summary data yet.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Assignment load</Text>
          {summaryLoading && !summary ? (
            <ActivityIndicator color="#38BDF8" />
          ) : topAgents.length > 0 ? (
            <View style={styles.assignmentList}>
              {topAgents.map((assignment) => (
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
                    <Text style={styles.assignmentValue}>
                      {assignment.count}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.sectionHint}>No active assignments.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {activityLoading && recentActivity.length === 0 ? (
            <ActivityIndicator color="#38BDF8" />
          ) : recentActivity.length > 0 ? (
            <View style={styles.activityFeed}>
              {recentActivity.map((entry: TicketActivityEntry) => (
                <View key={entry.id} style={styles.activityRow}>
                  <View style={styles.activityTextGroup}>
                    <Text style={styles.activityTitle}>{entry.actor.name}</Text>
                    <Text style={styles.activityCopy}>
                      {describeTicketActivity(entry)}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.sectionHint}>No recent activity logged.</Text>
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
    flexBasis: "47%",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  highlightLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  highlightValue: {
    marginTop: 8,
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "700",
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionHint: {
    color: "#94A3B8",
  },
  statusList: {
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  statusLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  statusShare: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  statusMetric: {
    flex: 1,
  },
  statusValue: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  progressTrack: {
    marginTop: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1E293B",
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#22D3EE",
  },
  assignmentList: {
    gap: 12,
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
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
    minWidth: 48,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
  },
  assignmentValue: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  activityFeed: {
    gap: 12,
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingBottom: 10,
  },
  activityTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  activityTitle: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  activityCopy: {
    color: "#94A3B8",
    marginTop: 2,
    fontSize: 12,
  },
  activityTime: {
    color: "#94A3B8",
    fontSize: 12,
  },
  unauthorized: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  unauthorizedTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  unauthorizedCopy: {
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  backButtonText: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
});
