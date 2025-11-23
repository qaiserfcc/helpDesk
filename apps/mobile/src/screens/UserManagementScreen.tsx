import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { fetchAdminOverviewReport } from "@/services/tickets";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  type UserSummary,
  type UpdateUserPayload,
} from "@/services/users";
import {
  validateUserForm,
  type UserFormValues,
  type UserFormErrors,
} from "@/utils/userFormValidation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { RoleRestrictedView } from "@/components/RoleRestrictedView";

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "UserManagement"
>;

type RoleFilterValue = "all" | "admin" | "agent" | "user";

const roleFilters: Array<{ label: string; value: RoleFilterValue }> = [
  { label: "All roles", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Agents", value: "agent" },
  { label: "Users", value: "user" },
];

const roleLabels = {
  admin: "Admin",
  agent: "Agent",
  user: "User",
} as const;

const makeEmptyForm = (): UserFormValues => ({
  name: "",
  email: "",
  role: "agent",
  password: "",
});

export function UserManagementScreen() {
  const navigation = useNavigation<Navigation>();
  const { isAuthorized } = useRoleGuard(["admin"]);
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("all");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<UserFormValues>(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: overview,
    isLoading: overviewLoading,
    isRefetching: overviewRefetching,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["reports", "admin", "user-management"],
    queryFn: fetchAdminOverviewReport,
    enabled: isAuthorized,
  });

  const {
    data: users,
    isLoading: usersLoading,
    isRefetching: usersRefetching,
    refetch: refetchUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["admin", "users", roleFilter],
    queryFn: () => fetchUsers(roleFilter === "all" ? {} : { role: roleFilter }),
    enabled: isAuthorized,
  });

  const assignments = overview?.assignmentLoad ?? [];
  const memberList = users ?? [];
  const refreshing = overviewRefetching || usersRefetching;
  const userSectionSubtitle =
    roleFilter === "all"
      ? `${memberList.length} member${memberList.length === 1 ? "" : "s"} in workspace`
      : `${memberList.length} ${roleLabels[roleFilter as "admin" | "agent" | "user"]} account${
          memberList.length === 1 ? "" : "s"
        }`;

  const handleRefresh = () => {
    refetchOverview();
    refetchUsers();
  };

  const resetFormState = () => {
    setFormValues(makeEmptyForm());
    setFormErrors({});
    setActiveUserId(null);
  };

  const closeForm = () => {
    resetFormState();
    setFormVisible(false);
  };

  const openCreateForm = () => {
    resetFormState();
    setFormMode("create");
    setFormVisible(true);
  };

  const openEditForm = (entry: UserSummary) => {
    setFormMode("edit");
    setActiveUserId(entry.id);
    setFormErrors({});
    setFormValues({
      name: entry.name,
      email: entry.email,
      role: entry.role,
      password: "",
    });
    setFormVisible(true);
  };

  const handleMutationError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unable to save member.";
    setFormErrors((prev) => ({ ...prev, general: message }));
  };

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (created) => {
      invalidateUsers();
      closeForm();
      Alert.alert("User created", `${created.name} is ready to collaborate.`);
    },
    onError: handleMutationError,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateUserPayload;
    }) => updateUser(userId, payload),
    onSuccess: (updated) => {
      invalidateUsers();
      closeForm();
      Alert.alert("Changes saved", `${updated.name} was updated.`);
    },
    onError: handleMutationError,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onMutate: (userId) => {
      setPendingDeleteId(userId);
    },
    onSuccess: (removed) => {
      invalidateUsers();
      Alert.alert(
        "User removed",
        `${removed.name || removed.email} no longer has workspace access.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to remove member.";
      Alert.alert("Remove failed", message);
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  const handleSubmitForm = () => {
    const validation = validateUserForm(formValues, {
      requirePassword: formMode === "create",
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});

    const normalized = {
      name: formValues.name.trim(),
      email: formValues.email.trim().toLowerCase(),
      role: formValues.role,
      password: formValues.password.trim(),
    };

    if (formMode === "create") {
      createUserMutation.mutate(normalized);
      return;
    }

    if (!activeUserId) {
      return;
    }

    const updatePayload: UpdateUserPayload = {
      name: normalized.name,
      email: normalized.email,
      role: normalized.role,
    };
    if (normalized.password) {
      updatePayload.password = normalized.password;
    }

    updateUserMutation.mutate({ userId: activeUserId, payload: updatePayload });
  };

  const confirmRemove = (entry: UserSummary) => {
    Alert.alert(
      "Remove user",
      `Remove ${entry.name || entry.email} from the workspace?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteUserMutation.mutate(entry.id),
        },
      ],
    );
  };

  const saving = createUserMutation.isPending || updateUserMutation.isPending;
  const usersInitialLoading = usersLoading && !users;
  const overviewInitialLoading = overviewLoading && !overview;
  const usersErrorMessage =
    usersError instanceof Error
      ? usersError.message
      : "Unable to load directory.";

  if (!isAuthorized) {
    return (
      <RoleRestrictedView
        title="Admins only"
        message="You need admin access to manage organization members."
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
            onRefresh={handleRefresh}
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
            <Text style={styles.title}>User management</Text>
            <Text style={styles.subtitle}>
              Review agent workloads and assignment coverage
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Active agents</Text>
          <Text style={styles.sectionSubtitle}>
            {assignments.length} team member
            {assignments.length === 1 ? "" : "s"}
          </Text>

          {overviewInitialLoading ? (
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
                    <Text style={styles.assignmentCount}>
                      {assignment.count}
                    </Text>
                    <Text style={styles.assignmentLabel}>Tickets</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.sectionCard, styles.directoryCard]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Workspace directory</Text>
              <Text style={styles.sectionSubtitle}>{userSectionSubtitle}</Text>
            </View>
            <Pressable style={styles.primaryCta} onPress={openCreateForm}>
              <Text style={styles.primaryCtaText}>Add member</Text>
            </Pressable>
          </View>

          <View style={styles.filterRow}>
            {roleFilters.map((filter) => {
              const active = roleFilter === filter.value;
              return (
                <Pressable
                  key={filter.value}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setRoleFilter(filter.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {usersInitialLoading ? (
            <ActivityIndicator color="#38BDF8" />
          ) : usersError ? (
            <Text style={styles.sectionHint}>{usersErrorMessage}</Text>
          ) : memberList.length === 0 ? (
            <Text style={styles.sectionHint}>
              No members match this filter.
            </Text>
          ) : (
            <View style={styles.userList}>
              {memberList.map((entry) => (
                <View key={entry.id} style={styles.userRow}>
                  <View style={styles.userMeta}>
                    <Text style={styles.assignmentName}>{entry.name}</Text>
                    <Text style={styles.assignmentMeta}>{entry.email}</Text>
                  </View>
                  <View style={styles.userRight}>
                    <View
                      style={[
                        styles.roleBadge,
                        entry.role === "admin" && styles.roleBadgeAdmin,
                        entry.role === "agent" && styles.roleBadgeAgent,
                        entry.role === "user" && styles.roleBadgeUser,
                      ]}
                    >
                      <Text style={styles.roleBadgeText}>
                        {roleLabels[entry.role]}
                      </Text>
                    </View>
                    <View style={styles.userActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => openEditForm(entry)}
                      >
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.actionButton,
                          styles.actionButtonDanger,
                          pendingDeleteId === entry.id && styles.disabled,
                        ]}
                        disabled={pendingDeleteId === entry.id}
                        onPress={() => confirmRemove(entry)}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            styles.actionButtonDangerText,
                          ]}
                        >
                          {pendingDeleteId === entry.id
                            ? "Removing..."
                            : "Remove"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={formVisible}
        animationType="fade"
        transparent
        onRequestClose={closeForm}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {formMode === "create"
                    ? "Add workspace member"
                    : "Edit workspace member"}
                </Text>
                <Pressable style={styles.modalClose} onPress={closeForm}>
                  <Text style={styles.modalCloseGlyph}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.modalSubtitle}>
                Invite teammates or adjust their access level. Password updates
                apply immediately.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Casey Admin"
                  placeholderTextColor="#475569"
                  autoCapitalize="words"
                  value={formValues.name}
                  onChangeText={(text) =>
                    setFormValues((prev) => ({ ...prev, name: text }))
                  }
                />
                {formErrors.name ? (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="casey@example.com"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={formValues.email}
                  onChangeText={(text) =>
                    setFormValues((prev) => ({ ...prev, email: text }))
                  }
                />
                {formErrors.email ? (
                  <Text style={styles.errorText}>{formErrors.email}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {formMode === "create"
                    ? "Temporary password"
                    : "Reset password"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  value={formValues.password}
                  onChangeText={(text) =>
                    setFormValues((prev) => ({ ...prev, password: text }))
                  }
                />
                {formErrors.password ? (
                  <Text style={styles.errorText}>{formErrors.password}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Role</Text>
                <View style={styles.roleRow}>
                  {roleFilters
                    .filter((filter) => filter.value !== "all")
                    .map((filter) => {
                      const roleValue = filter.value as
                        | "admin"
                        | "agent"
                        | "user";
                      const selected = formValues.role === roleValue;
                      return (
                        <Pressable
                          key={`role-${roleValue}`}
                          style={[
                            styles.roleCard,
                            selected && styles.roleCardActive,
                          ]}
                          onPress={() =>
                            setFormValues((prev) => ({
                              ...prev,
                              role: roleValue,
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.roleLabel,
                              selected && styles.roleLabelActive,
                            ]}
                          >
                            {filter.label.replace(/s$/, "")}
                          </Text>
                          <Text style={styles.roleDescription}>
                            {roleValue === "admin"
                              ? "Full access"
                              : roleValue === "agent"
                                ? "Can work assigned tickets"
                                : "Submitters only"}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              </View>

              {formErrors.general ? (
                <Text style={styles.errorText}>{formErrors.general}</Text>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryCta} onPress={closeForm}>
                  <Text style={styles.secondaryCtaText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryCta, saving && styles.disabled]}
                  onPress={handleSubmitForm}
                  disabled={saving}
                >
                  <Text style={styles.primaryCtaText}>
                    {saving
                      ? "Saving..."
                      : formMode === "create"
                        ? "Create user"
                        : "Save changes"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 16,
  },
  directoryCard: {
    marginTop: 20,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 12,
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
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
  userList: {
    marginTop: 4,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  userMeta: {
    flex: 1,
  },
  userRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#111827",
  },
  roleBadgeAdmin: {
    borderColor: "#fb7185",
    backgroundColor: "rgba(251, 113, 133, 0.15)",
  },
  roleBadgeAgent: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  roleBadgeUser: {
    borderColor: "#a78bfa",
    backgroundColor: "rgba(167, 139, 250, 0.12)",
  },
  roleBadgeText: {
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 12,
  },
  userActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: "#E2E8F0",
    fontWeight: "600",
    fontSize: 12,
  },
  actionButtonDanger: {
    borderColor: "#7f1d1d",
  },
  actionButtonDangerText: {
    color: "#fca5a5",
  },
  primaryCta: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#22D3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaText: {
    color: "#0B1220",
    fontWeight: "700",
  },
  secondaryCta: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  secondaryCtaText: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  fieldGroup: {
    marginTop: 16,
  },
  label: {
    color: "#94A3B8",
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
  },
  roleRow: {
    marginTop: 4,
    gap: 12,
  },
  roleCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    marginTop: 12,
    backgroundColor: "#111827",
  },
  roleCardActive: {
    borderColor: "#22D3EE",
    backgroundColor: "#0F172A",
  },
  roleLabel: {
    color: "#CBD5F5",
    fontSize: 15,
    fontWeight: "600",
  },
  roleLabelActive: {
    color: "#22D3EE",
  },
  roleDescription: {
    marginTop: 6,
    color: "#94A3B8",
    fontSize: 12,
  },
  errorText: {
    marginTop: 6,
    color: "#F87171",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.9)",
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: "#94A3B8",
    marginTop: 4,
  },
  modalClose: {
    padding: 6,
  },
  modalCloseGlyph: {
    color: "#94A3B8",
    fontSize: 18,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
  },
  disabled: {
    opacity: 0.6,
  },
});
