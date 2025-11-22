import React, { useState } from "react";
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
import { login } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";

export function LoginScreen() {
  const applySession = useAuthStore((state) => state.applySession);
  const [email, setEmail] = useState("admin@helpdesk.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const session = await login({ email: email.trim(), password });
      await applySession(session);
    } catch (err) {
      console.warn("Login failed", err);
      setError("Invalid email or password");
      Alert.alert(
        "Login failed",
        "Please verify your credentials and try again.",
      );
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

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#475569"
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
            placeholderTextColor="#475569"
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
          <Text style={styles.primaryText}>
            {submitting ? "Signing in…" : "Sign in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  form: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#0F172A",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 4,
    color: "#94A3B8",
  },
  fieldGroup: {
    marginTop: 18,
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
  errorText: {
    marginTop: 12,
    color: "#F87171",
  },
  primaryCta: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#22D3EE",
  },
  primaryText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
});
