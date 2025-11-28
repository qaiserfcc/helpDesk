import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listTicketCacheScopes, readTicketCache } from "@/storage/offline-db";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { useAuthStore } from "@/store/useAuthStore";

type CacheEntry = {
  scope: string;
  payload: unknown;
};

export function CacheInspectorScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const scopes = await listTicketCacheScopes(userId);
      const next: CacheEntry[] = [];
      for (const scope of scopes) {
        const payload = await readTicketCache({ ownerId: userId, scope });
        next.push({ scope, payload });
      }
      setEntries(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load cached ticket payloads.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries]),
  );

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const renderBody = () => {
    if (!userId) {
      return (
        <Text style={styles.infoText}>
          Sign in to inspect cached ticket payloads.
        </Text>
      );
    }

    if (loading && !entries.length) {
      return <ActivityIndicator color={colors.accentMuted} />;
    }

    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    if (!entries.length) {
      return (
        <Text style={styles.infoText}>
          No cached entries yet. Trigger any ticket list/detail fetch and
          refresh.
        </Text>
      );
    }

    return entries.map((entry) => {
      const json = entry.payload
        ? JSON.stringify(entry.payload, null, 2)
        : "<empty>";
      return (
        <View key={entry.scope} style={styles.card}>
          <Text style={styles.scopeLabel}>{entry.scope}</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{json}</Text>
          </View>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadEntries} />
        }
      >
        <Text style={styles.title}>Ticket Cache Inspector</Text>
        <Text style={styles.subtitle}>
          Lists every cached scope stored on-device so QA can verify warming.
        </Text>
        <View style={styles.entries}>{renderBody()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    ...commonStyles.safeArea,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  entries: {
    gap: 16,
  },
  infoText: {
    color: colors.muted,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    ...commonStyles.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  scopeLabel: {
    color: colors.accentMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  codeBlock: {
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 12,
  },
  codeText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "Courier",
    }),
  },
});
