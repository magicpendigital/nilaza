import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NavMode } from "../responsive";
import { colors, layout, radius, spacing, typography } from "../theme";
import { useMotionPreference } from "./useMotionPreference";

export type NavigationItem<T extends string> = {
  id: T;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

export type NavigationChrome = "expanded" | "compact" | "hidden";

export function AdaptiveNavigation<T extends string>({ items, selected, mode, onSelect, chrome = "expanded" }: {
  items: NavigationItem<T>[];
  selected: string;
  mode: NavMode;
  onSelect: (id: T) => void;
  chrome?: NavigationChrome;
}) {
  const insets = useSafeAreaInsets();
  const rail = mode === "rail";
  const reduceMotion = useMotionPreference();
  const labelVisibility = useRef(new Animated.Value(1)).current;
  const barHeight = useRef(new Animated.Value(72 + Math.max(insets.bottom, spacing.xs))).current;

  useEffect(() => {
    if (rail) return;
    const duration = reduceMotion ? 0 : 180;
    const labelAnimation = Animated.timing(labelVisibility, { toValue: chrome === "expanded" ? 1 : 0, duration, useNativeDriver: false });
    const heightAnimation = Animated.timing(barHeight, {
      toValue: chrome === "hidden" ? 0 : (chrome === "compact" ? 56 + Math.max(insets.bottom, spacing.xs) : 72 + Math.max(insets.bottom, spacing.xs)),
      duration,
      useNativeDriver: false
    });
    labelAnimation.start();
    heightAnimation.start();
    return () => { labelAnimation.stop(); heightAnimation.stop(); };
  }, [barHeight, chrome, insets.bottom, labelVisibility, rail, reduceMotion]);

  const actions = items.map(item => (
    <Pressable
      key={item.id}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: item.id === selected }}
      onPress={() => onSelect(item.id)}
      style={[styles.item, rail && styles.railItem, item.id === selected && styles.selected]}
    >
      <Ionicons name={item.icon} size={22} color={item.id === selected ? colors.gold : colors.moon} />
      {rail ? (
        <Text style={[styles.label, item.id === selected && styles.selectedLabel]}>{item.label}</Text>
      ) : (
        <Animated.View style={[styles.labelWrap, { height: labelVisibility.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }), opacity: labelVisibility }]}>
          <Text numberOfLines={1} style={[styles.label, item.id === selected && styles.selectedLabel]}>{item.label}</Text>
        </Animated.View>
      )}
    </Pressable>
  ));
  return rail ? (
    <ScrollView accessibilityRole="tablist" style={styles.rail} contentContainerStyle={styles.railContent}>
      {actions}
    </ScrollView>
  ) : (
    <Animated.View accessibilityRole="tablist" style={[styles.bottom, { height: barHeight, paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      {actions}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottom: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", overflow: "hidden", paddingTop: spacing.xs, width: "100%" },
  rail: { backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, width: layout.navigationRailWidth, flexGrow: 0, flexShrink: 0 },
  railContent: { gap: spacing.sm, padding: spacing.xs },
  item: { flex: 1, minWidth: layout.minimumTouchTarget, minHeight: layout.minimumTouchTarget, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xs, paddingHorizontal: 2, borderRadius: radius.control },
  railItem: { flex: 0, minHeight: 72 },
  selected: { backgroundColor: "rgba(201, 164, 92, 0.08)" },
  label: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, color: colors.moon, textAlign: "center", flexShrink: 1 },
  labelWrap: { alignItems: "center", justifyContent: "flex-end", overflow: "hidden", width: "100%" },
  selectedLabel: { color: colors.gold }
});
