import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./AppNavigator";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as (...args: unknown[]) => void)(name, params);
  }
}
