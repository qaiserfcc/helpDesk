import React from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/useAuthStore";
import { colors, darkColors, lightColors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { useOfflineStore } from "@/store/useOfflineStore";
import { useThemeStore } from "@/store/useThemeStore";

export function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Settings">>();
  const forgetOfflineSnapshot = useAuthStore(
    (state) => state.forgetOfflineSnapshot,
  );
  const offlineSession = useAuthStore((state) => state.offlineSession);
  const isOffline = useOfflineStore((state) => state.isOffline);
  const authQueueLength = useAuthStore((state) => state.authQueueLength);
  
  // Theme store
  const themeMode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDarkMode = themeMode === "dark";
  
  // Use current theme colors based on theme mode
  const currentColors = isDarkMode ? darkColors : lightColors;

  const handleClearOffline = async () => {
    await forgetOfflineSnapshot();
    Alert.alert(
      "Offline access cleared",
      "You'll need to sign in online again before biometric unlock is available offline.",
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backButton, { backgroundColor: currentColors.cardBg, borderColor: currentColors.cardBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backGlyph, { color: currentColors.text }]}>←</Text>
          </Pressable>
          <View>
            <Text style={[styles.eyebrow, { color: currentColors.textMuted }]}>Workspace preferences</Text>
            <Text style={[styles.title, { color: currentColors.foreground }]}>Settings</Text>
          </View>
        </View>

        {/* Theme Toggle Section */}
        <View style={[styles.section, { backgroundColor: currentColors.cardBg, borderColor: currentColors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Appearance</Text>
          <View style={styles.themeRow}>
            <View style={styles.themeInfo}>
              <Text style={[styles.themeLabel, { color: currentColors.foreground }]}>Dark Mode</Text>
              <Text style={[styles.themeDescription, { color: currentColors.muted }]}>
                {isDarkMode ? "Dark theme with purple-cyan gradients" : "Switch to dark theme"}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: currentColors.border, true: currentColors.accent }}
              thumbColor={isDarkMode ? currentColors.accentMuted : currentColors.foreground}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: currentColors.cardBg, borderColor: currentColors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Offline access</Text>
          <Text style={[styles.sectionBody, { color: currentColors.muted }]}>
            {offlineSession
              ? "You're currently using a cached session."
              : "Offline unlock is available after a successful online sign in."}
          </Text>
          <Text style={[styles.sectionMeta, { color: currentColors.textMuted }]}>
            {isOffline ? "Network unavailable" : "Network reachable"}
            {authQueueLength > 0
              ? ` • ${authQueueLength} auth action(s) pending sync`
              : ""}
          </Text>
          <Pressable 
            style={[styles.dangerButton, { backgroundColor: currentColors.border, borderColor: currentColors.danger }]} 
            onPress={handleClearOffline}
          >
            <Text style={[styles.dangerLabel, { color: currentColors.danger }]}>Clear offline unlock data</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: currentColors.cardBg, borderColor: currentColors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Need something else?</Text>
          <Text style={[styles.sectionBody, { color: currentColors.muted }]}>
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
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  themeInfo: {
    flex: 1,
    marginRight: 16,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
});
