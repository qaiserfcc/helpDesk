import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useOfflineStore } from "@/store/useOfflineStore";
import { useAuthStore } from "@/store/useAuthStore";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";

export function OfflineBanner() {
  const isOffline = useOfflineStore((state) => state.isOffline);
  const authQueueLength = useAuthStore((state) => state.authQueueLength);
  const offlineSession = useAuthStore((state) => state.offlineSession);

  if (!isOffline && !offlineSession) {
    return null;
  }

  const segments: string[] = [];
  if (isOffline) {
    segments.push("Offline mode");
  }
  if (authQueueLength > 0) {
    const label =
      authQueueLength === 1
        ? "1 auth action pending"
        : `${authQueueLength} auth actions pending`;
    segments.push(label);
  }
  if (offlineSession) {
    segments.push("Signed in offline – limited features");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{segments.join(" • ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.card,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
