import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
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

function describeActivity(entry: TicketActivityEntry) {
  const ticketLabel = `#${entry.ticketId.slice(0, 6)}`;

  switch (entry.type) {
    case "assignment_request":
      return `${entry.actor.name} requested assignment on ${ticketLabel}`;
    case "ticket_update":
      return `${entry.actor.name} updated details on ${ticketLabel}`;
    case "assignment_change":
      if (entry.toAssignee) {
        return `${entry.actor.name} assigned ${ticketLabel} to ${entry.toAssignee.name}`;
      }
      return `${entry.actor.name} unassigned ${ticketLabel}`;
    case "status_change":
      if (entry.toStatus) {
        return `${entry.actor.name} moved ${ticketLabel} to ${formatStatus(entry.toStatus)}`;
      }
      if (entry.fromStatus) {
        return `${entry.actor.name} updated ${ticketLabel} from ${formatStatus(entry.fromStatus)}`;
      }
      return `${entry.actor.name} updated ${ticketLabel}`;
    default:
      return `${entry.actor.name} updated ${ticketLabel}`;
  }
}

type Navigation = NativeStackNavigationProp<RootStackParamList, "Dashboard">;

export function DashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((state) => state.session?.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestActivityId, setLatestActivityId] = useState<string | null>(null);
  const [toastQueue, setToastQueue] = useState<TicketActivityEntry[]>([]);
  const [activeToast, setActiveToast] = useState<TicketActivityEntry | null>(
    null,
  );
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<Ticket> | null>(null);
  const headerHeightRef = useRef(0);
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
    enabled: Boolean(user),
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
      if (user) {
        refetchActivity();
      }
      if (user?.role === "admin") {
        refetchSummary();
      }
    }, [refetch, refetchQueued, refetchActivity, refetchSummary, user]),
  );

  useEffect(() => {
    if (recentActivity.length === 0) {
      return;
    }

    if (!latestActivityId) {
      setLatestActivityId(recentActivity[0].id);
      return;
    }

    if (recentActivity[0].id === latestActivityId) {
      return;
    }

    const newEntries: TicketActivityEntry[] = [];
    for (const entry of recentActivity) {
      if (entry.id === latestActivityId) {
        break;
      }
      newEntries.push(entry);
    }

    if (newEntries.length > 0) {
      setLatestActivityId(recentActivity[0].id);
      setToastQueue((queue) => [...queue, ...newEntries.reverse()]);
      setUnreadCount((count) => count + newEntries.length);
    }
  }, [recentActivity, latestActivityId]);

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) {
      return;
    }

    setActiveToast(toastQueue[0]);
    setToastQueue((queue) => queue.slice(1));
  }, [toastQueue, activeToast]);

  useEffect(() => {
    if (!activeToast) {
      return;
    }

    toastOpacity.setValue(0);
    const fadeIn = Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });

    fadeIn.start();

    const hideTimeout = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setActiveToast(null);
      });
    }, 3400);

    return () => {
      fadeIn.stop();
      clearTimeout(hideTimeout);
    };
  }, [activeToast, toastOpacity]);

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
    if (user) {
      refetchActivity();
    }
    if (user?.role === "admin") {
      refetchSummary();
    }
  };

  const queuedCount = queuedTickets.length;
  const statusBuckets = statusSummary?.statuses ?? [];
  const totalTickets = statusBuckets.reduce(
    (acc, bucket) => acc + bucket.count,
    0,
  );
  const openTotal =
    statusBuckets.find((bucket) => bucket.status === "open")?.count ?? 0;
  const inProgressTotal =
    statusBuckets.find((bucket) => bucket.status === "in_progress")?.count ?? 0;
  const resolvedTotal =
    statusBuckets.find((bucket) => bucket.status === "resolved")?.count ?? 0;
  const assignmentPreview = statusSummary?.assignments.slice(0, 3) ?? [];
  const totalAssignments = statusSummary?.assignments.length ?? 0;

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    headerHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const handleNotificationPress = () => {
    setNotificationsOpen((open) => {
      const next = !open;
      if (!open && next) {
        setUnreadCount(0);
      }
      return next;
    });
  };

  const closeNotificationsDrawer = () => {
    setNotificationsOpen(false);
  };

  const scrollToTicketsList = useCallback(() => {
    if (!listRef.current) {
      return;
    }
    const offset = headerHeightRef.current > 0 ? headerHeightRef.current : 0;
    listRef.current.scrollToOffset({ offset, animated: true });
  }, []);

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

  const renderDashboardHeader = () => (
    <View style={styles.dashboardHeader} onLayout={handleHeaderLayout}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Help Desk</Text>
          <Text style={styles.subtitle}>
            {user ? `Welcome, ${user.name}` : "Tickets overview"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconButton}
            onPress={handleNotificationPress}
          >
            <Text style={styles.iconGlyph}>🔔</Text>
          </Pressable>
          <Pressable style={styles.signOut} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      {user?.role === "admin" && (
        <View style={styles.navMenu}>
          <Text style={styles.navMenuLabel}>Navigation</Text>
          <View style={styles.navMenuRow}>
            <Pressable
              style={styles.navMenuCard}
              onPress={() => navigation.navigate("StatusSummary")}
            >
              <Text style={styles.navMenuTitle}>Organization Summary</Text>
              <Text style={styles.navMenuSubtitle}>
                Deep dive into overall metrics
              </Text>
            </Pressable>
            <Pressable
              style={styles.navMenuCard}
              onPress={scrollToTicketsList}
            >
              <Text style={styles.navMenuTitle}>Tickets List</Text>
              <Text style={styles.navMenuSubtitle}>
                Jump to the active queue
              </Text>
            </Pressable>
          </View>
        </View>
      )}

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
            onPress={() =>
              syncQueuedTickets().then(() => {
                refetchQueued();
              })
            }
          >
            {queuedLoading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.syncText}>Sync now</Text>
            )}
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionHeading}>Tickets</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No tickets found</Text>
      <Text style={styles.emptySubtitle}>
        {canCreate
          ? "Try a different filter or create a new ticket below."
          : "Try a different filter or request access from an admin."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={renderTicket}
        ListHeaderComponent={renderDashboardHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={onRefresh}
            tintColor="#38BDF8"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {notificationsOpen && (
        <View style={styles.drawerOverlay} pointerEvents="box-none">
          <Pressable
            style={styles.drawerBackdrop}
            onPress={closeNotificationsDrawer}
          />
          <View style={styles.notificationsDrawer}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.notificationsTitle}>Notifications</Text>
                <Text style={styles.notificationsMeta}>
                  {unreadCount > 0
                    ? `${unreadCount} new notification${
                        unreadCount > 1 ? "s" : ""
                      }`
                    : "You are all caught up."}
                </Text>
              </View>
              <Pressable onPress={closeNotificationsDrawer}>
                <Text style={styles.closeDrawerText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerContent}
            >
              {recentActivity.length === 0 ? (
                <Text style={styles.notificationsEmpty}>
                  No updates to show yet.
                </Text>
              ) : (
                recentActivity.map((entry) => (
                  <View key={entry.id} style={styles.notificationRow}>
                    <View>
                      <Text style={styles.notificationText}>
                        {entry.actor.name}
                      </Text>
                      <Text style={styles.notificationSub}>
                        {describeActivity(entry)}
                      </Text>
                    </View>
                    <Text style={styles.notificationTime}>
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {canCreate && (
        <Pressable style={styles.primaryCta} onPress={onCreateTicket}>
          <Text style={styles.primaryText}>Create Ticket</Text>
        </Pressable>
      )}

      {activeToast && (
        <Animated.View
          style={[
            styles.toastBanner,
            { opacity: toastOpacity, bottom: canCreate ? 100 : 32 },
          ]}
        >
          <View style={styles.toastCopy}>
            <Text style={styles.toastActor}>{activeToast.actor.name}</Text>
            <Text style={styles.toastMessage}>
              {describeActivity(activeToast)}
            </Text>
          </View>
          <Pressable onPress={() => setActiveToast(null)}>
            <Text style={styles.toastDismiss}>Dismiss</Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 220,
    gap: 12,
  },
  dashboardHeader: {
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navMenu: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 12,
  },
  navMenuLabel: {
    color: "#CBD5F5",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  navMenuRow: {
    flexDirection: "row",
    gap: 12,
  },
  navMenuCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#0B1220",
    gap: 6,
  },
  navMenuTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "600",
  },
  navMenuSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 15,
    color: "#CBD5F5",
  },
  signOut: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
  },
  signOutText: {
    color: "#E2E8F0",
    fontSize: 13,
  },
  iconButton: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  iconGlyph: {
    fontSize: 18,
  },
  iconBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#EF4444",
    paddingHorizontal: 4,
    borderRadius: 999,
  },
  iconBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  cardLabel: {
    fontSize: 12,
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  cardValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  filterRow: {
    gap: 12,
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
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
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
  reportCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 8,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
  },
  reportHint: {
    color: "#94A3B8",
    fontSize: 13,
  },
  reportLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  reportLinkText: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  highlightCard: {
    flexBasis: "47%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
    backgroundColor: "#0B1220",
  },
  highlightLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  highlightValue: {
    marginTop: 4,
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
  },
  sectionHeading: {
    marginTop: 8,
    marginBottom: 4,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
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
    gap: 8,
  },
  assignmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  assignmentName: {
    color: "#E2E8F0",
    fontSize: 14,
  },
  assignmentCount: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  assignmentMore: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 12,
  },
  notificationsPanel: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 10,
  },
  notificationsTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
  },
  notificationsEmpty: {
    color: "#94A3B8",
    fontSize: 13,
  },
  notificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  notificationText: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  notificationSub: {
    color: "#94A3B8",
    fontSize: 12,
  },
  notificationTime: {
    color: "#94A3B8",
    fontSize: 12,
  },
  drawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
  },
  notificationsDrawer: {
    marginTop: 40,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    maxHeight: "70%",
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  notificationsMeta: {
    color: "#94A3B8",
    fontSize: 13,
  },
  closeDrawerText: {
    color: "#38BDF8",
    fontWeight: "600",
  },
  drawerScroll: {
    flexGrow: 0,
  },
  drawerContent: {
    gap: 12,
    paddingBottom: 12,
  },
  ticketCard: {
    marginTop: 12,
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
    marginTop: 10,
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
  emptyState: {
    marginTop: 40,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
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
  toastBanner: {
    position: "absolute",
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#22D3EE",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  toastCopy: {
    flex: 1,
  },
  toastActor: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  toastMessage: {
    color: "#CBD5F5",
    fontSize: 13,
    marginTop: 2,
  },
  toastDismiss: {
    color: "#38BDF8",
    fontWeight: "600",
  },
});
