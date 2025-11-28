import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { LoadingScreen } from "@/screens/LoadingScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { RegisterScreen } from "@/screens/RegisterScreen";
import { TicketDetailScreen } from "@/screens/TicketDetailScreen";
import { TicketFormScreen } from "@/screens/TicketFormScreen";
import { StatusSummaryScreen } from "@/screens/StatusSummaryScreen";
import { UserReportScreen } from "@/screens/UserReportScreen";
import { AgentWorkloadScreen } from "@/screens/AgentWorkloadScreen";
import { UserManagementScreen } from "@/screens/UserManagementScreen";
import { ReportsTableScreen } from "@/screens/ReportsTableScreen";
import { AllocationDashboardScreen } from "@/screens/AllocationDashboardScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { CacheInspectorScreen } from "@/screens/CacheInspectorScreen";
import { useAuthStore } from "@/store/useAuthStore";
import { colors } from "@/theme/colors";
import { navigationRef } from "./navigationRef";

export type RootStackParamList = {
  Loading: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  StatusSummary: undefined;
  AllocationDashboard: undefined;
  UserManagement: undefined;
  ReportsTable: undefined;
  UserReport: undefined;
  AgentWorkload: undefined;
  Settings: undefined;
  CacheInspector: undefined;
  TicketDetail: { ticketId: string };
  TicketForm: { ticketId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
  },
};

export function AppNavigator() {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!initialized ? (
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : !session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen
              name="StatusSummary"
              component={StatusSummaryScreen}
            />
            <Stack.Screen
              name="AllocationDashboard"
              component={AllocationDashboardScreen}
            />
            <Stack.Screen
              name="UserManagement"
              component={UserManagementScreen}
            />
            <Stack.Screen name="ReportsTable" component={ReportsTableScreen} />
            <Stack.Screen name="UserReport" component={UserReportScreen} />
            <Stack.Screen
              name="AgentWorkload"
              component={AgentWorkloadScreen}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen
              name="CacheInspector"
              component={CacheInspectorScreen}
            />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="TicketForm" component={TicketFormScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
