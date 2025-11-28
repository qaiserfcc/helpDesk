export const colors = {
  // Web-new theme tokens (dark theme)
  gradientStart: "#7C3AED", // purple
  gradientEnd: "#06B6D4", // cyan
  background: "#0a0a0a", // fallback dark background
  foreground: "#ffffff", // primary text
  cardBg: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.08)",
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
