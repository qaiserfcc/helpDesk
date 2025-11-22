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
import { useAuthStore } from "@/store/useAuthStore";
import { fetchAdminOverviewReport } from "@/services/tickets";

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "UserManagement"
>;

export function UserManagementScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((state) => state.session?.user);

  const {
    data: overview,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["reports", "admin", "user-management"],
    queryFn: fetchAdminOverviewReport,
    enabled: user?.role === "admin",
  });

  const assignments = overview?.assignmentLoad ?? [];
  const refreshing = isLoading || isRefetching;

  if (user?.role !== "admin") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedTitle}>Admins only</Text>
          <Text style={styles.unauthorizedCopy}>
            You need admin access to manage organization members.
          </Text>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
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
            tintColor="#38BDF8"
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.backIcon} onPress={() => navigation.goBack()}>
            <Text style={styles.backGlyph}>←</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>User management</Text>
            <Text style={styles.subtitle}>
              Review agent workloads and assignment coverage
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Active agents</Text>
          <Text style={styles.sectionSubtitle}>
            {assignments.length} team member{assignments.length === 1 ? "" : "s"}
          </Text>

          {isLoading && !overview ? (
            <ActivityIndicator color="#38BDF8" />
          ) : assignments.length === 0 ? (
            <Text style={styles.sectionHint}>No active agents found.</Text>
          ) : (
            <View style={styles.assignmentList}>
              {assignments.map((assignment) => (
                <View key={assignment.agentId} style={styles.assignmentRow}>
                  <View style={styles.assignmentTextGroup}>
                    <Text style={styles.assignmentName}>
                      {assignment.agent?.name ?? "Unknown agent"}
                    </Text>
                    <Text style={styles.assignmentMeta}>
                      {assignment.agent?.email ?? "Not available"}
                    </Text>
                  </View>
                  <View style={styles.assignmentBadge}>
                    <Text style={styles.assignmentCount}>{assignment.count}</Text>
                    <Text style={styles.assignmentLabel}>Tickets</Text>
                  </View>
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
  sectionCard: {
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#94A3B8",
    marginBottom: 12,
  },
  sectionHint: {
    color: "#94A3B8",
  },
  assignmentList: {
    gap: 12,
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  assignmentTextGroup: {
    flex: 1,
    marginRight: 12,
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
    minWidth: 64,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
  },
  assignmentCount: {
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 18,
  },
  assignmentLabel: {
    color: "#94A3B8",
    fontSize: 11,
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
