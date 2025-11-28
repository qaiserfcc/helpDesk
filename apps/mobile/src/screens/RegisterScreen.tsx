import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { register } from "@/services/auth";
import { useAuthStore, type UserRole } from "@/store/useAuthStore";
import { useOfflineStore } from "@/store/useOfflineStore";
import { colors } from "@/theme/colors";
import { demoAccounts } from "@/constants/demoAccounts";
import { commonStyles } from "@/theme/commonStyles";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const roleOptions: Array<{
  label: string;
  description: string;
  value: UserRole;
}> = [
  {
    label: "User",
    description: "Submit and track your own tickets",
    value: "user",
  },
  {
    label: "Agent",
    description: "Work assigned tickets",
    value: "agent",
  },
  {
    label: "Admin",
    description: "Configure and manage the workspace",
    value: "admin",
  },
];

export function RegisterScreen({ navigation }: Props) {
  const applySession = useAuthStore((state) => state.applySession);
  const cacheSignupPayload = useAuthStore((state) => state.cacheSignupPayload);
  const cacheLoginPayload = useAuthStore((state) => state.cacheLoginPayload);
  const queueAuthIntent = useAuthStore((state) => state.queueAuthIntent);
  const offlineSession = useAuthStore((state) => state.offlineSession);
  const authQueueLength = useAuthStore((state) => state.authQueueLength);
  const isOffline = useOfflineStore((state) => state.isOffline);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    if (submitting) {
      return "Creating account…";
    }
    if (isOffline) {
      return "Queue offline signup";
    }
    return "Create account";
  }, [isOffline, submitting]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const normalizedPayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      if (isOffline) {
        const optimisticSession = {
          user: {
            id: `offline-${Date.now()}`,
            name: normalizedPayload.name || "Offline user",
            email: normalizedPayload.email,
            role: normalizedPayload.role,
          },
          accessToken: "offline-access-token",
          refreshToken: "offline-refresh-token",
        };
        await cacheSignupPayload(normalizedPayload);
        await cacheLoginPayload({
          email: normalizedPayload.email,
          password: normalizedPayload.password,
        });
        await queueAuthIntent({ type: "register", payload: normalizedPayload });
        await applySession(optimisticSession, { offline: true });
        Alert.alert(
          "Offline sign up",
          "We'll finish creating your account once you're back online.",
        );
        return;
      }

      const session = await register(normalizedPayload);
      await cacheSignupPayload(normalizedPayload);
      await cacheLoginPayload({
        email: normalizedPayload.email,
        password: normalizedPayload.password,
      });
      await applySession(session);
    } catch (err) {
        console.error("Registration failed", err);
        let message = "We couldn't create your account";
        // Provide a more helpful message when the email is already registered.
        if ((err as any)?.response?.status === 409) {
          message = 'An account with that email already exists.';
        }
        setError(message);
        Alert.alert("Sign up failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.title}>Create your Help Desk account</Text>
          <Text style={styles.subtitle}>Access the workspace instantly.</Text>

          {(isOffline || offlineSession) && (
            <View style={styles.offlineHint}>
              <Text style={styles.offlineHintText}>
                {isOffline
                  ? "Offline sign ups are queued and will sync automatically."
                  : "Using cached session while offline."}
              </Text>
              {authQueueLength > 0 && (
                <Text style={styles.offlineHintMeta}>
                  {authQueueLength === 1
                    ? "1 auth action awaiting sync"
                    : `${authQueueLength} auth actions awaiting sync`}
                </Text>
              )}
            </View>
          )}
            <View style={styles.presetSection}>
            <Text style={styles.presetHeading}>Quick fill demo accounts</Text>
            <View style={styles.presetRow}>
              {demoAccounts.map((account) => (
                <Pressable
                  key={`register-${account.label}`}
                  style={styles.presetButton}
                  onPress={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setRole(account.role);
                  }}
                >
                  <Text style={styles.presetLabel}>{account.label}</Text>
                  <Text style={styles.presetHint}>{account.email}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="words"
              placeholder="Ada Lovelace"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {roleOptions.map((option) => {
                const selected = option.value === role;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.roleCard, selected && styles.roleCardActive]}
                    onPress={() => setRole(option.value)}
                  >
                    <Text
                      style={[
                        styles.roleLabel,
                        selected && styles.roleLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.roleDescription}>
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryCta, submitting && styles.disabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.primaryText}>{submitLabel}</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryCta}
            onPress={() => navigation.replace("Login")}
          >
            <Text style={styles.secondaryText}>
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  form: {
    ...commonStyles.card,
    padding: 24,
    borderRadius: 24,
  },
  offlineHint: {
    ...commonStyles.card,
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
  },
  offlineHintText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "600",
  },
  offlineHintMeta: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
  },
  fieldGroup: {
    marginTop: 18,
  },
  presetSection: {
    marginTop: 18,
  },
  presetHeading: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  presetButton: {
    ...commonStyles.card,
    flexBasis: "30%",
    flexGrow: 1,
    marginRight: 8,
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  presetLabel: {
    color: colors.foreground,
    fontWeight: "600",
  },
  presetHint: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  label: {
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.border,
    color: colors.foreground,
  },
  errorText: {
    marginTop: 12,
    color: colors.danger,
  },
  roleRow: {
    marginTop: 8,
  },
  roleCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 12,
    backgroundColor: colors.background,
  },
  roleCardActive: {
    ...commonStyles.card,
    borderColor: colors.accent,
  },
  roleLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
  },
  roleLabelActive: {
    color: colors.accent,
  },
  roleDescription: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 12,
  },
  primaryCta: {
    ...commonStyles.primaryBtn,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryText: {
    ...commonStyles.primaryText,
    color: colors.foreground,
    fontWeight: "700",
  },
  secondaryCta: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});
