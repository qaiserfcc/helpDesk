import { StyleSheet } from "react-native";
import { colors } from "./colors";

// Shared spacing and metrics
export const metrics = {
  spacing: 12,
  radius: 12,
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backGlyph: {
    color: colors.text,
    fontSize: 20,
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionHint: {
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.accent,
  },
  primaryText: {
    color: colors.onAccent,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "600",
  },
  dangerButton: {
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: "center",
  },
  dangerText: {
    color: colors.danger,
    fontWeight: "600",
  },
  mutedText: {
    color: colors.textMuted,
  },
});
