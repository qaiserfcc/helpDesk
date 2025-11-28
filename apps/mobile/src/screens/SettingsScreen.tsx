import React from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/useAuthStore";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { useOfflineStore } from "@/store/useOfflineStore";

export function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Settings">>();
  const forgetOfflineSnapshot = useAuthStore(
    (state) => state.forgetOfflineSnapshot,
  );
  const offlineSession = useAuthStore((state) => state.offlineSession);
  const isOffline = useOfflineStore((state) => state.isOffline);
  const authQueueLength = useAuthStore((state) => state.authQueueLength);

  const handleClearOffline = async () => {
    await forgetOfflineSnapshot();
    Alert.alert(
      "Offline access cleared",
      "You'll need to sign in online again before biometric unlock is available offline.",
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backGlyph}>←</Text>
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>Workspace preferences</Text>
            <Text style={styles.title}>Settings</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline access</Text>
          <Text style={styles.sectionBody}>
            {offlineSession
              ? "You're currently using a cached session."
              : "Offline unlock is available after a successful online sign in."}
          </Text>
          <Text style={styles.sectionMeta}>
            {isOffline ? "Network unavailable" : "Network reachable"}
            {authQueueLength > 0
              ? ` • ${authQueueLength} auth action(s) pending sync`
              : ""}
          </Text>
          <Pressable style={styles.dangerButton} onPress={handleClearOffline}>
            <Text style={styles.dangerLabel}>Clear offline unlock data</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need something else?</Text>
          <Text style={styles.sectionBody}>
            Clearing offline unlock only removes biometric resume data. Use sign
            out on the dashboard to fully end your session.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.container,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    ...commonStyles.card,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: {
    fontSize: 20,
    color: colors.text,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: "700",
  },
  section: {
    ...commonStyles.sectionCard,
    padding: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  sectionBody: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 20,
  },
  sectionMeta: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 13,
  },
  dangerButton: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: "center",
  },
  dangerLabel: {
    color: colors.danger,
    fontWeight: "600",
  },
});
