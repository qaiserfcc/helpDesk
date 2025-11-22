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
import { useAuthStore } from "@/store/useAuthStore";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const applySession = useAuthStore((state) => state.applySession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
