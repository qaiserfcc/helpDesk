import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";

export function WorkflowManagementScreen() {
  return (
    <SafeAreaView style={[commonStyles.safeArea, styles.safeArea]}> 
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Workflow management</Text>
        <Text style={styles.subtitle}>
          Mobile workflow controls are coming soon. For now, use the web app to
          add or edit workflows, and you will still see their effects here.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you can do today</Text>
          <Text style={styles.cardItem}>
            • Manage workflows from the web dashboard
          </Text>
          <Text style={styles.cardItem}>
            • Continue working with tickets using the latest workflow rules
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardItem: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
