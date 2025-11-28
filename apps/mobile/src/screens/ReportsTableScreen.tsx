import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/useAuthStore";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { ReportTicket, fetchTicketExportDataset } from "@/services/tickets";
import { formatTicketStatus } from "@/utils/ticketActivity";
import {
  AdminAggregates,
  StatusFilter,
  buildAdminAggregates,
  buildNoDataMessage,
  buildSectionSubtitle,
  countTicketStatuses,
  filterTicketsByStatus,
  selectAdminAggregate,
  sliceTableRows,
} from "./ReportsTableScreen.helpers";

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

type Navigation = NativeStackNavigationProp<RootStackParamList, "ReportsTable">;
export function ReportsTableScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((state) => state.session?.user);
  const role = (user?.role ?? "user") as "admin" | "agent" | "user";
  const datasetScope =
    role === "admin" ? "admin" : role === "agent" ? "agent" : "user";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [adminAllView, setAdminAllView] = useState<"user" | "agent">("user");

  const {
    data: dataset,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["reports", "table", datasetScope],
    queryFn: () =>
      fetchTicketExportDataset({
        scope: datasetScope,
        format: "json",
      }),
    enabled: Boolean(user),
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      fetchTicketExportDataset({
        scope: datasetScope,
        format: "json",
      }),
    onSuccess: (payload) => {
      Alert.alert(
        "Export ready",
        `Downloaded ${payload.tickets.length} tickets in ${payload.scope} scope.`,
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "Unable to export tickets.",
      );
    },
  });

  const tickets = dataset?.tickets ?? [];
  const statusCounts = useMemo(() => countTicketStatuses(tickets), [tickets]);

  const filteredTickets = useMemo(
    () => filterTicketsByStatus(tickets, statusFilter),
    [tickets, statusFilter],
  );

  const tableRows = useMemo(
    () => sliceTableRows(filteredTickets),
    [filteredTickets],
  );
  const refreshing = isLoading || isRefetching;

  const adminAggregates = useMemo<AdminAggregates>(() => {
    if (role !== "admin") {
      return { user: [], agent: [] };
    }
    return buildAdminAggregates(tickets);
  }, [role, tickets]);

  const activeAdminAggregate = selectAdminAggregate(
    adminAllView,
    adminAggregates,
  );

  const handleExport = () => {
    if (!exportMutation.isPending) {
      exportMutation.mutate();
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedTitle}>Please sign in</Text>
          <Text style={styles.unauthorizedCopy}>
            A valid session is required to view reporting data.
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

  const sectionSubtitle = buildSectionSubtitle({
    role,
    statusFilter,
    tableLength: tableRows.length,
    filteredLength: filteredTickets.length,
    aggregateLength: activeAdminAggregate.length,
    adminView: adminAllView,
  });

  const noDataMessage = buildNoDataMessage({ role, statusFilter });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetch()}
            tintColor={colors.accentMuted}
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
            <Text style={styles.title}>Reporting</Text>
            <Text style={styles.subtitle}>
              Status snapshots for{" "}
              {role === "admin"
                ? "the organization"
                : role === "agent"
                  ? "your queue"
                  : "your tickets"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryHighlights}>
          {(["open", "in_progress", "resolved"] as const).map((status) => (
            <View key={status} style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>
                {status === "open"
                  ? "Open"
                  : status === "in_progress"
                    ? "In progress"
                    : "Resolved"}
              </Text>
              <Text style={styles.highlightValue}>{statusCounts[status]}</Text>
            </View>
          ))}
        </View>

        <View style={styles.filterRow}>
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
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

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {role === "admin" && statusFilter === "all"
                  ? "All tickets overview"
                  : "Ticket table"}
              </Text>
              <Text style={styles.sectionSubtitle}>{sectionSubtitle}</Text>
            </View>
            <Pressable
              style={[
                styles.exportButton,
                exportMutation.isPending && styles.exportButtonDisabled,
              ]}
              onPress={handleExport}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <ActivityIndicator color={colors.card} />
              ) : (
                <Text style={styles.exportButtonText}>Export</Text>
              )}
            </Pressable>
          </View>

          {role === "admin" && statusFilter === "all" && (
            <View style={styles.adminToggle}>
              {["user", "agent"].map((key) => {
                const isActive = adminAllView === key;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.adminToggleButton,
                      isActive && styles.adminToggleButtonActive,
                    ]}
                    onPress={() => setAdminAllView(key as "user" | "agent")}
                  >
                    <Text
                      style={[
                        styles.adminToggleText,
                        isActive && styles.adminToggleTextActive,
                      ]}
                    >
                      {key === "user" ? "User wise" : "Agent wise"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {isLoading && !dataset ? (
            <ActivityIndicator color={colors.accentMuted} />
          ) : role === "admin" && statusFilter === "all" ? (
            activeAdminAggregate.length === 0 ? (
              <Text style={styles.sectionHint}>{noDataMessage}</Text>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <Text style={[styles.tableCell, styles.cellTicket]}>
                    Name
                  </Text>
                  <Text style={[styles.tableCell, styles.cellNumeric]}>
                    Total
                  </Text>
                  <Text style={[styles.tableCell, styles.cellNumeric]}>
                    Open
                  </Text>
                  <Text style={[styles.tableCell, styles.cellNumeric]}>
                    In progress
                  </Text>
                  <Text style={[styles.tableCell, styles.cellNumeric]}>
                    Resolved
                  </Text>
                </View>
                {activeAdminAggregate.map((row) => (
                  <View key={row.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.cellTicket]}>
                      {row.label}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellNumeric]}>
                      {row.total}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellNumeric]}>
                      {row.open}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellNumeric]}>
                      {row.in_progress}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellNumeric]}>
                      {row.resolved}
                    </Text>
                  </View>
                ))}
              </View>
            )
          ) : tableRows.length === 0 ? (
            <Text style={styles.sectionHint}>{noDataMessage}</Text>
          ) : (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.cellTicket]}>
                  Ticket
                </Text>
                <Text style={[styles.tableCell, styles.cellStatus]}>
                  Status
                </Text>
                <Text style={[styles.tableCell, styles.cellPriority]}>
                  Priority
                </Text>
                <Text style={[styles.tableCell, styles.cellUpdated]}>
                  Updated
                </Text>
              </View>
              {tableRows.map((ticket: ReportTicket) => (
                <View key={ticket.id} style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.cellTicket]}>
                    <Text style={styles.tableTicketId}>
                      #{ticket.id.slice(0, 8)}
                    </Text>
                    <Text style={styles.tableTicketText} numberOfLines={1}>
                      {ticket.description}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, styles.cellStatus]}>
                    <View
                      style={[
                        styles.statusPill,
                        styles[`status_${ticket.status}`],
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {formatTicketStatus(ticket.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, styles.cellPriority]}>
                    {ticket.priority}
                  </Text>
                  <Text style={[styles.tableCell, styles.cellUpdated]}>
                    {new Date(
                      ticket.updatedAt ?? ticket.createdAt,
                    ).toLocaleDateString()}
                  </Text>
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
    ...commonStyles.safeArea,
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
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: {
    color: colors.text,
    fontSize: 18,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 4,
  },
  summaryHighlights: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  highlightCard: {
    ...commonStyles.card,
    flex: 1,
    padding: 16,
  },
  highlightLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  highlightValue: {
    marginTop: 8,
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 13,
  },
  filterChipTextActive: {
    color: colors.card,
    fontWeight: "600",
  },
  sectionCard: {
    ...commonStyles.sectionCard,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  sectionHint: {
    color: colors.textMuted,
  },
  adminToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  adminToggleButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  adminToggleButtonActive: {
    backgroundColor: colors.statusInProgress,
    borderColor: colors.statusInProgress,
  },
  adminToggleText: {
    color: colors.textMuted,
    fontWeight: "500",
  },
  adminToggleTextActive: {
    color: colors.text,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  tableRow: {
    ...commonStyles.card,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderRow: {
    ...commonStyles.card,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: colors.text,
  },
  cellTicket: {
    flex: 2,
  },
  cellStatus: {
    flex: 1,
  },
  cellPriority: {
    flex: 1,
    textTransform: "capitalize",
    color: colors.text,
  },
  cellUpdated: {
    flex: 1,
    color: colors.text,
  },
  cellNumeric: {
    textAlign: "right",
    color: colors.text,
  },
  tableTicketId: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  tableTicketText: {
    color: colors.text,
    fontSize: 13,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  status_open: {
    backgroundColor: colors.card,
  },
  status_in_progress: {
    backgroundColor: colors.statusInProgress,
  },
  status_resolved: {
    backgroundColor: colors.statusResolved,
  },
  statusText: {
    color: colors.text,
    fontSize: 12,
  },
  exportButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.accentMuted,
    minWidth: 100,
    alignItems: "center",
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: colors.card,
    fontWeight: "700",
  },
  unauthorized: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  unauthorizedTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  unauthorizedCopy: {
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
});
