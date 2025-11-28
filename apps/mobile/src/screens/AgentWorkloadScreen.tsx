import React from "react";
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
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { useAuthStore } from "@/store/useAuthStore";
import {
  AgentWorkloadReport,
  ReportTicket,
  fetchAgentWorkloadReport,
} from "@/services/tickets";
import { formatTicketStatus } from "@/utils/ticketActivity";

const defaultCounts = { open: 0, in_progress: 0, resolved: 0 };

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "AgentWorkload"
>;

export function AgentWorkloadScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((state) => state.session?.user);

  const {
    data: report,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AgentWorkloadReport>({
    queryKey: ["reports", "agent", user?.id],
    queryFn: fetchAgentWorkloadReport,
    enabled: user?.role === "agent",
  });

  const statusCounts = report?.statusCounts ?? defaultCounts;
  const assigned = report?.assigned ?? [];
  const escalations = report?.escalations ?? [];
  const pending = report?.pendingRequests ?? [];
  const refreshing = isLoading || isRefetching;

  if (user?.role !== "agent") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedTitle}>Agents only</Text>
          <Text style={styles.unauthorizedCopy}>
            Switch to an agent account to review workload insights.
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
            <Text style={styles.title}>My workload</Text>
            <Text style={styles.subtitle}>
              Assignments, requests, escalations
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

        <TicketSection
          title="Assigned to me"
          hint="You have not been assigned any tickets yet."
          tickets={assigned}
          loading={isLoading && !report}
        />

        <TicketSection
          title="Pending assignment requests"
          hint="You do not have any outstanding assignment requests."
          tickets={pending}
          loading={false}
        />

        <TicketSection
          title="Escalations"
          hint="No escalations at the moment."
          tickets={escalations}
          loading={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function TicketSection({
  title,
  hint,
  tickets,
  loading,
}: {
  title: string;
  hint: string;
  tickets: ReportTicket[];
  loading: boolean;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator color={colors.accentMuted} />
      ) : tickets.length === 0 ? (
        <Text style={styles.sectionHint}>{hint}</Text>
      ) : (
        <View style={styles.ticketList}>
          {tickets.map((ticket) => (
            <View key={`${title}-${ticket.id}`} style={styles.ticketCard}>
              <View style={styles.ticketCardHeader}>
                <Text style={styles.ticketId}>#{ticket.id.slice(0, 8)}</Text>
                <View
                  style={[styles.statusPill, styles[`status_${ticket.status}`]]}
                >
                  <Text style={styles.statusText}>
                    {formatTicketStatus(ticket.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.ticketDescription} numberOfLines={2}>
                {ticket.description}
              </Text>
              <View style={styles.ticketMetaRow}>
                <Text style={styles.metaText}>Priority: {ticket.priority}</Text>
                <Text style={styles.metaText}>Type: {ticket.issueType}</Text>
              </View>
              <Text style={styles.metaSubtext}>
                Created {new Date(ticket.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
    marginBottom: 20,
  },
  highlightCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    ...commonStyles.card,
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
  sectionCard: {
    ...commonStyles.sectionCard,
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionHint: {
    color: colors.textMuted,
  },
  ticketList: {
    gap: 12,
  },
  ticketCard: {
    ...commonStyles.card,
    padding: 16,
    gap: 8,
  },
  ticketCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketId: {
    color: colors.textMuted,
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
  ticketDescription: {
    color: colors.text,
    fontSize: 16,
  },
  ticketMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  metaSubtext: {
    color: colors.muted,
    fontSize: 13,
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
