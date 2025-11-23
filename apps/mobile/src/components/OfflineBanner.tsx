import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useOfflineStore } from "@/store/useOfflineStore";
import { useAuthStore } from "@/store/useAuthStore";

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
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1E293B",
  },
  text: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
