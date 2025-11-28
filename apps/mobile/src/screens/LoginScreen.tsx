import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { login } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useOfflineStore } from "@/store/useOfflineStore";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { demoAccounts } from "@/constants/demoAccounts";
import { RootStackParamList } from "@/navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const applySession = useAuthStore((state) => state.applySession);
  const cacheLoginPayload = useAuthStore((state) => state.cacheLoginPayload);
  const resumeOfflineSession = useAuthStore(
    (state) => state.resumeOfflineSession,
  );
  const queueAuthIntent = useAuthStore((state) => state.queueAuthIntent);
  const offlineSession = useAuthStore((state) => state.offlineSession);
  const authQueueLength = useAuthStore((state) => state.authQueueLength);
  const isOffline = useOfflineStore((state) => state.isOffline);
  const [email, setEmail] = useState("admin@helpdesk.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCtaLabel = useMemo(() => {
    if (submitting) {
      return "Signing in…";
    }
    if (isOffline) {
      return "Resume offline";
    }
    return "Sign in";
  }, [isOffline, submitting]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const payload = { email: normalizedEmail, password };

      const handleOfflineFallback = async (forceAttempt = false) => {
        if (!isOffline && !forceAttempt) {
          return false;
        }
        const restored = await resumeOfflineSession(payload);
        if (restored) {
          await queueAuthIntent({ type: "login", payload });
          Alert.alert(
            "Offline mode",
            "You're working offline. We'll verify this sign-in when the network returns.",
          );
          return true;
        }
        return false;
      };

      if (isOffline) {
        const success = await handleOfflineFallback();
        if (!success) {
          throw new Error("OFFLINE_UNAVAILABLE");
        }
        return;
      }

      const session = await login(payload);
      await cacheLoginPayload(payload);
      await applySession(session);
    } catch (err) {
      console.error("Login failed", err);
      const normalizedEmail = email.trim().toLowerCase();
      const payload = { email: normalizedEmail, password };
      const offlineRecovered = await resumeOfflineSession(payload);
      if (offlineRecovered) {
        await queueAuthIntent({ type: "login", payload });
        Alert.alert(
          "Offline mode",
          "Network is unavailable, but we restored your cached session.",
        );
      } else {
        setError(
          isOffline
            ? "Offline sign-in is only available for cached sessions."
            : "Invalid email or password",
        );
        Alert.alert(
          "Login failed",
          isOffline
            ? "We couldn't verify cached credentials for this account."
            : "Please verify your credentials and try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Sign in to Help Desk</Text>
        <Text style={styles.subtitle}>
          Use your workspace credentials to continue.
        </Text>

        {(isOffline || offlineSession) && (
          <View style={styles.offlineHint}>
            <Text style={styles.offlineHintText}>
              {isOffline
                ? "No connection detected. We'll restore cached access if available."
                : "Signed in with cached session."}
            </Text>
            {authQueueLength > 0 ? (
              <Text style={styles.offlineHintMeta}>
                {authQueueLength === 1
                  ? "1 auth action awaiting sync"
                  : `${authQueueLength} auth actions awaiting sync`}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.presetSection}>
          <Text style={styles.presetHeading}>Quick fill demo accounts</Text>
          <View style={styles.presetRow}>
            {demoAccounts.map((account) => (
              <Pressable
                key={`login-${account.label}`}
                style={styles.presetButton}
                onPress={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                <Text style={styles.presetLabel}>{account.label}</Text>
                <Text style={styles.presetHint}>{account.email}</Text>
              </Pressable>
            ))}
          </View>
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
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryCta, submitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryText}>{submitCtaLabel}</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryCta}
          onPress={() => navigation.replace("Register")}
        >
          <Text style={styles.secondaryText}>Need an account? Create one</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.container,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  form: {
    ...commonStyles.card,
    padding: 24,
    borderRadius: 24,
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
