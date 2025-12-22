import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";

export function AttributeManagementScreen() {
  return (
    <SafeAreaView style={[commonStyles.safeArea, styles.safeArea]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Attribute management</Text>
        <Text style={styles.subtitle}>
          Attribute editing from mobile is on the roadmap. Manage ticket
          attributes on the web for now; tickets created here will respect the
          latest attribute definitions.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Need to edit attributes?</Text>
          <Text style={styles.cardItem}>
            • Visit the web dashboard to add or update attributes
          </Text>
          <Text style={styles.cardItem}>
            • Changes sync automatically to the mobile app
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
