import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { navigate } from "@/navigation/navigationRef";
import {
  useNotificationStore,
  type NotificationEntry,
} from "@/store/useNotificationStore";
import { colors } from "@/theme/colors";

const TOAST_DURATION_MS = 3600;

export function NotificationHost() {
  const toastQueue = useNotificationStore((state) => state.toastQueue);
  const dequeueToast = useNotificationStore((state) => state.dequeueToast);
  const markRead = useNotificationStore((state) => state.markRead);
  const [activeToast, setActiveToast] = useState<NotificationEntry | null>(
    null,
  );
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) {
      return;
    }
    setActiveToast(toastQueue[0]);
    dequeueToast();
  }, [toastQueue, activeToast, dequeueToast]);

  useEffect(() => {
    if (!activeToast) {
      return;
    }

    opacity.setValue(0);
    const fadeIn = Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });

    fadeIn.start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setActiveToast(null);
      });
    }, TOAST_DURATION_MS);

    return () => {
      fadeIn.stop();
      clearTimeout(timer);
    };
  }, [activeToast, opacity]);

  if (!activeToast) {
    return null;
  }

  const handleNavigate = () => {
    markRead(activeToast.id);
    navigate("TicketDetail", { ticketId: activeToast.ticketId });
    setActiveToast(null);
  };

  const handleDismiss = () => {
    markRead(activeToast.id);
    setActiveToast(null);
  };

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View style={[styles.toast, { opacity }]}> 
        <Pressable style={styles.toastCopy} onPress={handleNavigate}>
          <Text style={styles.toastActor}>{activeToast.actor}</Text>
          <Text style={styles.toastSummary}>{activeToast.summary}</Text>
          <Text style={styles.toastTime}>
            {new Date(activeToast.createdAt).toLocaleTimeString()}
          </Text>
        </Pressable>
        <Pressable onPress={handleDismiss} accessibilityRole="button">
          <Text style={styles.toastDismiss}>Dismiss</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 32,
    paddingHorizontal: 20,
  },
  toast: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  toastCopy: {
    flex: 1,
  },
  toastActor: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 2,
  },
  toastSummary: {
    color: colors.text,
    fontSize: 14,
  },
  toastTime: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  toastDismiss: {
    color: colors.accent,
    fontWeight: "600",
  },
});
