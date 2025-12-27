export const darkColors = {
  // Web-new theme tokens (dark theme)
  gradientStart: "#7C3AED", // purple
  gradientEnd: "#06B6D4", // cyan
  background: "#0a0a0a", // fallback dark background
  foreground: "#ffffff", // primary text
  cardBg: "rgba(255,255,255,0.08)",
  cardBorder: "rgba(255,255,255,0.12)",
  muted: "rgba(255,255,255,0.72)",
  accent: "#07B6DC",
  accentMuted: "#38BDF8",
  focusRing: "rgba(7,182,220,0.24)",
  focusBorder: "rgba(6,182,212,0.95)",
  // semantic tokens
  danger: "#F87171",
  // shadow colors
  shadow: "#000000",
  // report status colors
  statusInProgress: "#1E3A8A",
  statusResolved: "#0F766E",
  statusUser: "#a78bfa",
  statusWarning: "#FBBF24",
  statusWarningBg: "#422006",
  statusWarningText: "#FDE68A",
  // Backwards-compatible token aliases for existing code
  card: "#0F172A",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "#1E293B",
  // text color to use on accent backgrounds (light accent -> use dark text)
  onAccent: "#0B1120",
} as const;

export const lightColors = {
  // Light theme tokens
  gradientStart: "#e0e7ff", // light indigo
  gradientEnd: "#cffafe", // light cyan
  background: "#f8fafc", // light background
  foreground: "#0f172a", // primary text
  cardBg: "rgba(255,255,255,0.9)",
  cardBorder: "rgba(148,163,184,0.3)",
  muted: "rgba(15,23,42,0.7)",
  accent: "#0891b2",
  accentMuted: "#0e7490",
  focusRing: "rgba(8,145,178,0.24)",
  focusBorder: "rgba(8,145,178,0.95)",
  // semantic tokens
  danger: "#DC2626",
  // shadow colors
  shadow: "rgba(0,0,0,0.1)",
  // report status colors
  statusInProgress: "#3B82F6",
  statusResolved: "#10B981",
  statusUser: "#8B5CF6",
  statusWarning: "#F59E0B",
  statusWarningBg: "#FEF3C7",
  statusWarningText: "#92400E",
  // Backwards-compatible token aliases
  card: "#ffffff",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  onAccent: "#ffffff",
} as const;

export const colors = darkColors;
