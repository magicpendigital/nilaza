export const colors = {
  charcoal: "#151416",
  ink: "#2A2525",
  ivory: "#F7F1E6",
  gold: "#C9A45C",
  teal: "#0E5A5A",
  rose: "#C9828D",
  moon: "#A8A3A0",
  surface: "#151416",
  surfaceLowest: "#100E0C",
  surfaceLow: "#1D1B19",
  surfaceContainer: "#211F1D",
  surfaceHigh: "#2C2927",
  surfaceHighest: "#373432",
  onSurface: "#E7E1DE",
  onSurfaceVariant: "#CAC5CA",
  outline: "#938F94",
  outlineVariant: "#48464A",
  glass: "rgba(42, 37, 37, 0.72)",
  panel: "#211F22",
  panelSoft: "#2A2525",
  border: "rgba(247, 241, 230, 0.14)",
  muted: "rgba(247, 241, 230, 0.68)"
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  screen: 24,
  section: 40,
  stackSm: 8,
  stackMd: 16,
  stackLg: 24
};

export const layout = {
  tabletShortSide: 600,
  expandedWidth: 900,
  compactHeight: 700,
  phoneNarrowWidth: 360,
  gutterNarrow: 16,
  gutterCompact: 20,
  gutterMedium: 32,
  gutterExpanded: 40,
  contentCompactMax: 560,
  contentLandscapePhoneMax: 840,
  contentMediumMax: 840,
  contentExpandedMax: 1180,
  focusedContentMax: 720,
  bottomNavigationMinHeight: 72,
  navigationRailWidth: 96,
  minimumTouchTarget: 48
} as const;

export const radius = {
  card: 8,
  control: 8,
  // Buttons, single-line inputs and chips (Owner decision 2026-10-30); cards stay at 8.
  pill: 999
};

export const typography = {
  bodyFontFamily: "HankenGrotesk_400Regular",
  bodyItalicFontFamily: "HankenGrotesk_400Regular_Italic",
  bodyMediumFontFamily: "HankenGrotesk_500Medium",
  bodySemiBoldFontFamily: "HankenGrotesk_600SemiBold",
  headlineFontFamily: "EBGaramond_500Medium",
  headlineRegularFontFamily: "EBGaramond_400Regular",
  display: {
    fontSize: 40,
    fontWeight: "500" as const,
    lineHeight: 48,
    letterSpacing: 0
  },
  headlineLg: {
    fontSize: 32,
    fontWeight: "500" as const,
    lineHeight: 40
  },
  headlineMd: {
    fontSize: 24,
    fontWeight: "500" as const,
    lineHeight: 32
  },
  body: {
    fontSize: 16,
    lineHeight: 24
  },
  labelCaps: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.8
  }
};

export const motion = {
  fast: 180,
  calm: 360,
  ritual: 650
};
