import { Children, ReactNode, useState } from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, layout as layoutTokens, radius, spacing } from "../theme";
import type { AdaptiveLayout } from "../responsive";

export function AdaptiveScaffold({
  children,
  layout,
  navigation,
  showNavigation = true
}: {
  children: ReactNode;
  layout: AdaptiveLayout;
  navigation?: ReactNode;
  showNavigation?: boolean;
}) {
  const rail = showNavigation && layout.navMode === "rail";
  const bottom = showNavigation && layout.navMode === "bottom";

  return (
    <SafeAreaView
      edges={rail || !bottom ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]}
      style={styles.safeArea}
    >
      <View style={[styles.shell, rail && styles.shellWithRail]}>
        {rail ? navigation : null}
        <View
          style={[
            styles.content,
            rail && styles.contentExpanded,
            {
              maxWidth: rail ? layout.contentMaxWidth : undefined
            }
          ]}
        >
          {children}
        </View>
        {bottom ? navigation : null}
      </View>
    </SafeAreaView>
  );
}

export function ResponsiveGrid({
  children,
  minItemWidth = 220,
  maxColumns = 2,
  style
}: {
  children: ReactNode;
  minItemWidth?: number;
  maxColumns?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.min(maxColumns, Math.floor((width + spacing.md) / (minItemWidth + spacing.md))));
  const itemWidth = width > 0 ? Math.max(0, (width - spacing.md * (columns - 1)) / columns) : undefined;
  return (
    <View style={[styles.grid, style]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {Children.toArray(children).map((child, index) => (
        <View key={typeof child === "object" && child && "key" in child ? child.key : index}
          style={{ minWidth: 0, width: itemWidth ?? "100%" }}>{child}</View>
      ))}
    </View>
  );
}

export function StickyActionBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.stickyAction, { paddingBottom: Math.max(spacing.sm, insets.bottom) }, style]}>{children}</View>;
}

export function OverflowChipRail({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  if (wrap) return <View style={styles.wrappedRail}>{children}</View>;
  return (
    <View style={styles.overflowShell}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.scrollRail}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator
      >
        {children}
      </ScrollView>
      <View pointerEvents="none" style={styles.edgeHint} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.charcoal,
    flex: 1,
    minHeight: 0,
    minWidth: 0
  },
  shell: {
    backgroundColor: colors.charcoal,
    flex: 1,
    minHeight: 0,
    width: "100%"
  },
  shellWithRail: {
    alignItems: "stretch",
    flexDirection: "row"
  },
  content: {
    alignSelf: "center",
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: "100%"
  },
  contentExpanded: {
    // In a row, the cross axis is vertical. Centering here lets long screens
    // grow beyond the viewport, so the ScrollView itself has nothing to scroll.
    alignSelf: "stretch",
    marginHorizontal: "auto"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    width: "100%"
  },
  stickyAction: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  overflowShell: {
    minHeight: layoutTokens.minimumTouchTarget,
    position: "relative"
  },
  scrollRail: {
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.xl
  },
  wrappedRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  edgeHint: {
    backgroundColor: "rgba(201, 164, 92, 0.18)",
    borderRadius: radius.control,
    bottom: 4,
    position: "absolute",
    right: 0,
    top: 4,
    width: 3
  }
});
