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
import { useAuthStore } from "@/store/useAuthStore";
import { navigationRef } from "./navigationRef";

export type RootStackParamList = {
  Loading: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  StatusSummary: undefined;
  TicketDetail: { ticketId: string };
  TicketForm: { ticketId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#0B1120",
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
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="TicketForm" component={TicketFormScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
