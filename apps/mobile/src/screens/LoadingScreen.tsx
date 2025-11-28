import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";
import { useAuthStore } from "@/store/useAuthStore";

export function LoadingScreen() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accentMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
