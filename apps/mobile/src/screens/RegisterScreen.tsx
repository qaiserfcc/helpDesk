import React, { useState } from "react";
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
import { demoAccounts } from "@/constants/demoAccounts";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const session = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      await applySession(session);
    } catch (err) {
      console.warn("Registration failed", err);
      setError("We couldn't create your account");
      Alert.alert(
        "Sign up failed",
        "Please review your details and try again.",
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.title}>Create your Help Desk account</Text>
          <Text style={styles.subtitle}>Access the workspace instantly.</Text>

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
              placeholderTextColor="#475569"
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
              placeholder="At least 8 characters"
              placeholderTextColor="#475569"
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
            <Text style={styles.primaryText}>
              {submitting ? "Creating account…" : "Create account"}
            </Text>
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
    backgroundColor: "#020617",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  presetSection: {
    marginTop: 18,
  },
  presetHeading: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  presetButton: {
    flexBasis: "30%",
    flexGrow: 1,
    marginRight: 8,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0B1120",
  },
  presetLabel: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  presetHint: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
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
  roleRow: {
    marginTop: 8,
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
  secondaryCta: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryText: {
    color: "#94A3B8",
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});
