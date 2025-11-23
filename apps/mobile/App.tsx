import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationHost } from "@/components/notifications/NotificationHost";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AppProviders } from "./src/providers/AppProviders";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar style="light" />
        <OfflineBanner />
        <AppNavigator />
        <NotificationHost />
      </AppProviders>
    </SafeAreaProvider>
  );
}
