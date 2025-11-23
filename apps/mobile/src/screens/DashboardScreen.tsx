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
  useNotificationStore,
  type NotificationEntry,
  type NotificationBase,
} from "@/store/useNotificationStore";
import {
  Ticket,
  TicketStatus,
  fetchRecentTicketActivity,
  fetchTicketStatusSummary,
  fetchTickets,
} from "@/services/tickets";
import { listQueuedTickets } from "@/storage/offline-db";
import { syncQueuedTickets } from "@/services/syncService";
import {
  describeTicketActivity,
  formatTicketStatus,
} from "@/utils/ticketActivity";

const statusFilters: Array<{ label: string; value?: TicketStatus }> = [
  { label: "All" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

const formatStatus = formatTicketStatus;

type Navigation = NativeStackNavigationProp<RootStackParamList, "Dashboard">;
type DrawerNavItem = {
  key: string;
  title: string;
  subtitle: string;
  glyph: string;
  onPress: () => void;
};

export function DashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((state) => state.session?.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const listRef = useRef<FlatList<Ticket> | null>(null);
  const headerHeightRef = useRef(0);
  const navDrawerProgress = useRef(new Animated.Value(0)).current;
  const canCreate = user?.role === "user" || user?.role === "admin";
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const seedNotifications = useNotificationStore(
    (state) => state.seedFromHistory,
  );
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const markRead = useNotificationStore((state) => state.markRead);

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

  const { data: recentActivity = [], refetch: refetchActivity } = useQuery({
    queryKey: ["reports", "activity"],
    queryFn: () => fetchRecentTicketActivity(10),
    enabled: Boolean(user),
  });

  const { data: statusSummary, refetch: refetchSummary } = useQuery({
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

    const payload: NotificationBase[] = recentActivity.map((entry) => ({
      id: entry.id,
      ticketId: entry.ticketId,
      actor: entry.actor.name,
      summary: describeTicketActivity(entry),
      createdAt: entry.createdAt,
      type: "activity",
    }));

    seedNotifications(payload);
  }, [recentActivity, seedNotifications]);

  useEffect(() => {
    Animated.timing(navDrawerProgress, {
      toValue: navDrawerOpen ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [navDrawerOpen, navDrawerProgress]);

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
  const summaryTotals = {
    total: statusSummary ? totalTickets : tickets.length,
    open: statusSummary ? openTotal : counters.open,
    inProgress: statusSummary ? inProgressTotal : counters.in_progress,
    resolved: statusSummary ? resolvedTotal : counters.resolved,
  };

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    headerHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const handleNotificationPress = () => {
    setNotificationsOpen((open) => {
      const next = !open;
      if (!open && next) {
        markAllRead();
      }
      return next;
    });
  };

  const closeNotificationsDrawer = () => {
    setNotificationsOpen(false);
  };

  const toggleNavDrawer = () => {
    setNavDrawerOpen((open) => !open);
  };

  const closeNavDrawer = useCallback(() => {
    setNavDrawerOpen(false);
  }, []);

  const createDrawerHandler = useCallback(
    (callback: () => void) => () => {
      closeNavDrawer();
      callback();
    },
    [closeNavDrawer],
  );

  const handleNotificationSelect = (entry: NotificationEntry) => {
    markRead(entry.id);
    setNotificationsOpen(false);
    navigation.navigate("TicketDetail", { ticketId: entry.ticketId });
  };

  const scrollToTicketsList = useCallback(() => {
    if (!listRef.current) {
      return;
    }
    const offset = headerHeightRef.current > 0 ? headerHeightRef.current : 0;
    listRef.current.scrollToOffset({ offset, animated: true });
  }, []);

  const drawerNavItems = useMemo<DrawerNavItem[]>(() => {
    const items: DrawerNavItem[] = [
      {
        key: "dashboard",
        title: "Dashboard overview",
        subtitle: "Scroll to activity",
        glyph: "🏠",
        onPress: createDrawerHandler(scrollToTicketsList),
      },
      {
        key: "user-report",
        title: "My report",
        subtitle: "Personal ticket stats",
        glyph: "🧾",
        onPress: createDrawerHandler(() => navigation.navigate("UserReport")),
      },
      {
        key: "reports-table",
        title: "Reports table",
        subtitle: "Filter + export",
        glyph: "📊",
        onPress: createDrawerHandler(() => navigation.navigate("ReportsTable")),
      },
      {
        key: "cache-inspector",
        title: "Cache inspector",
        subtitle: "Offline payload debug",
        glyph: "🧪",
        onPress: createDrawerHandler(() =>
          navigation.navigate("CacheInspector"),
        ),
      },
    ];

    if (user?.role !== "user") {
      items.push({
        key: "agent-workload",
        title: "Agent workload",
        subtitle: "Assignments heatmap",
        glyph: "📈",
        onPress: createDrawerHandler(() =>
          navigation.navigate("AgentWorkload"),
        ),
      });
    }

    if (user?.role === "admin") {
      items.push(
        {
          key: "status-summary",
          title: "Org snapshot",
          subtitle: "Status & escalations",
          glyph: "🏢",
          onPress: createDrawerHandler(() =>
            navigation.navigate("StatusSummary"),
          ),
        },
        {
          key: "allocation-dashboard",
          title: "Allocation dashboard",
          subtitle: "Live workload",
          glyph: "🎯",
          onPress: createDrawerHandler(() =>
            navigation.navigate("AllocationDashboard"),
          ),
        },
        {
          key: "user-management",
          title: "User management",
          subtitle: "Manage members",
          glyph: "👥",
          onPress: createDrawerHandler(() =>
            navigation.navigate("UserManagement"),
          ),
        },
      );
    }

    return items;
  }, [createDrawerHandler, navigation, scrollToTicketsList, user?.role]);

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
      {item.pendingSync && (
        <Text style={styles.pendingSyncPill}>Pending sync</Text>
      )}
    </Pressable>
  );

  const renderDashboardHeader = () => (
    <View style={styles.dashboardHeader} onLayout={handleHeaderLayout}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Pressable style={styles.menuButton} onPress={toggleNavDrawer}>
            <Text style={styles.menuGlyph}>☰</Text>
          </Pressable>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Command center</Text>
            <Text style={styles.title}>
              {user ? `Hi, ${user.name.split(" ")[0]}` : "Help Desk"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconButton}
              onPress={handleNotificationPress}
            >
              <Text style={styles.iconGlyph}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.iconBadge}>
                  <Text style={styles.iconBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.signOut} onPress={() => signOut()}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Monitor tickets, workload, and signals in one sleek view.
        </Text>
        <View style={styles.heroStatsRow}>
          {[
            { label: "Open", value: summaryTotals.open, hint: "Active queue" },
            {
              label: "In progress",
              value: summaryTotals.inProgress,
              hint: "Being handled",
            },
            {
              label: "Resolved",
              value: summaryTotals.resolved,
              hint: "Closed",
            },
            { label: "Total", value: summaryTotals.total, hint: "Tracked" },
          ].map((stat) => (
            <View key={stat.label} style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>{stat.label}</Text>
              <Text style={styles.heroStatValue}>{stat.value}</Text>
              <Text style={styles.heroStatHint}>{stat.hint}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.controlPanel}>
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
        <View style={styles.syncBanner}>
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

      <View style={styles.snapshotRow}>
        <View style={styles.snapshotCard}>
          <View style={styles.snapshotHeader}>
            <View>
              <Text style={styles.sectionHeading}>Status snapshot</Text>
              <Text style={styles.snapshotMeta}>
                {statusSummary ? "Organization" : "Personal"} view
              </Text>
            </View>
            <Pressable
              style={styles.textLink}
              onPress={() => navigation.navigate("ReportsTable")}
            >
              <Text style={styles.textLinkLabel}>Open reports</Text>
            </Pressable>
          </View>
          <View style={styles.snapshotMetrics}>
            {[
              { label: "Total", value: summaryTotals.total },
              { label: "Open", value: summaryTotals.open },
              { label: "In progress", value: summaryTotals.inProgress },
              { label: "Resolved", value: summaryTotals.resolved },
            ].map((metric) => (
              <View key={metric.label} style={styles.summaryChip}>
                <Text style={styles.summaryChipLabel}>{metric.label}</Text>
                <Text style={styles.summaryChipValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
          {user?.role === "admin" && assignmentPreview.length > 0 && (
            <View style={styles.assignmentList}>
              {assignmentPreview.map((assignment, index) => {
                const agent = assignment.agent;
                if (!agent) {
                  return null;
                }
                return (
                  <View key={agent.id ?? index} style={styles.assignmentRow}>
                    <Text style={styles.assignmentName}>{agent.name}</Text>
                    <Text style={styles.assignmentCount}>
                      {assignment.count}
                    </Text>
                  </View>
                );
              })}
              {totalAssignments > assignmentPreview.length && (
                <Text style={styles.assignmentMore}>
                  +{totalAssignments - assignmentPreview.length} more agents
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.activityPanel}>
          <View style={styles.snapshotHeader}>
            <View>
              <Text style={styles.sectionHeading}>Live activity</Text>
              <Text style={styles.snapshotMeta}>Latest updates</Text>
            </View>
            <Pressable
              style={styles.textLink}
              onPress={handleNotificationPress}
            >
              <Text style={styles.textLinkLabel}>Inbox</Text>
            </Pressable>
          </View>
          {recentActivity.length === 0 ? (
            <Text style={styles.activityEmpty}>
              Real-time updates will appear as tickets evolve.
            </Text>
          ) : (
            recentActivity.slice(0, 3).map((entry) => (
              <View key={entry.id} style={styles.activityItem}>
                <Text style={styles.activityActor}>{entry.actor.name}</Text>
                <Text style={styles.activityCopy}>
                  {describeTicketActivity(entry)}
                </Text>
                <Text style={styles.activityMeta}>
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

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

      {navDrawerOpen && (
        <View style={styles.navDrawerOverlay} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.navDrawerPanel,
              {
                transform: [
                  {
                    translateX: navDrawerProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-280, 0],
                    }),
                  },
                ],
                opacity: navDrawerProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ]}
          >
            <View style={styles.navDrawerHeader}>
              <Pressable
                accessibilityLabel="Close quick sections"
                style={styles.navDrawerBackButton}
                onPress={closeNavDrawer}
              >
                <Text style={styles.navDrawerBackGlyph}>←</Text>
              </Pressable>
              <View style={styles.navDrawerHeaderCopy}>
                <Text style={styles.navDrawerTitle}>Quick sections</Text>
                <Text style={styles.navDrawerSubtitle}>Navigate rapidly</Text>
              </View>
            </View>
            {drawerNavItems.map((item) => (
              <Pressable
                key={item.key}
                style={styles.navDrawerItem}
                onPress={item.onPress}
              >
                <Text style={styles.navDrawerGlyph}>{item.glyph}</Text>
                <View style={styles.navDrawerCopy}>
                  <Text style={styles.navDrawerItemTitle}>{item.title}</Text>
                  <Text style={styles.navDrawerItemSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
          <Pressable
            style={styles.navDrawerBackdrop}
            onPress={closeNavDrawer}
          />
        </View>
      )}

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
              {notifications.length === 0 ? (
                <Text style={styles.notificationsEmpty}>
                  Real-time updates will appear here once new activity comes in.
                </Text>
              ) : (
                notifications.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={[
                      styles.notificationRow,
                      !entry.read && styles.notificationUnread,
                    ]}
                    onPress={() => handleNotificationSelect(entry)}
                  >
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationText}>{entry.actor}</Text>
                      <Text style={styles.notificationSub}>
                        {entry.summary}
                      </Text>
                    </View>
                    <View style={styles.notificationMeta}>
                      {!entry.read && (
                        <View style={styles.notificationUnreadDot} />
                      )}
                      <Text style={styles.notificationTime}>
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </Text>
                    </View>
                  </Pressable>
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
  heroCard: {
    padding: 20,
    borderRadius: 26,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.18)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
  },
  menuGlyph: {
    fontSize: 20,
    color: "#F8FAFC",
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 13,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  heroStatCard: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    padding: 14,
    gap: 6,
  },
  heroStatLabel: {
    color: "#94A3B8",
    fontSize: 12,
    textTransform: "uppercase",
  },
  heroStatValue: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "700",
  },
  heroStatHint: {
    color: "#38BDF8",
    fontSize: 12,
  },
  controlPanel: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(2, 6, 23, 0.8)",
    gap: 16,
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
    flexWrap: "wrap",
    gap: 12,
  },
  navMenuCard: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#0B1220",
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  navMenuGlyph: {
    fontSize: 22,
    marginRight: 8,
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
  reportShortcut: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#0F172A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportShortcutTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
  },
  reportShortcutSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  reportShortcutGlyph: {
    fontSize: 26,
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
  syncBanner: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    backgroundColor: "rgba(8, 47, 73, 0.55)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
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
  snapshotRow: {
    flexDirection: "column",
    gap: 16,
  },
  snapshotCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    padding: 18,
    gap: 14,
  },
  snapshotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  snapshotMeta: {
    color: "#94A3B8",
    fontSize: 12,
  },
  textLink: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    backgroundColor: "rgba(15, 118, 110, 0.15)",
  },
  textLinkLabel: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "600",
  },
  snapshotMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  activityPanel: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    backgroundColor: "rgba(2, 6, 23, 0.75)",
    padding: 18,
    gap: 10,
  },
  activityEmpty: {
    color: "#94A3B8",
    fontSize: 13,
  },
  activityItem: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.12)",
    paddingBottom: 10,
    marginBottom: 10,
    gap: 4,
  },
  activityActor: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  activityCopy: {
    color: "#CBD5F5",
    fontSize: 13,
  },
  activityMeta: {
    color: "#64748B",
    fontSize: 11,
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
  notificationUnread: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  notificationCopy: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  notificationMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  notificationUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
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
  navDrawerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: "row",
  },
  navDrawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.7)",
  },
  navDrawerPanel: {
    width: 280,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 48,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    gap: 12,
  },
  navDrawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  navDrawerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  navDrawerBackGlyph: {
    color: "#F8FAFC",
    fontSize: 18,
  },
  navDrawerHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  navDrawerTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  navDrawerSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
  },
  navDrawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(51, 65, 85, 0.6)",
  },
  navDrawerGlyph: {
    fontSize: 20,
  },
  navDrawerCopy: {
    flex: 1,
  },
  navDrawerItemTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  navDrawerItemSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
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
  pendingSyncPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FBBF24",
    backgroundColor: "#422006",
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "600",
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
