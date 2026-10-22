import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../theme";
import type { GenerationActivity, Language } from "../types";

/** A shell-level shortcut for a private generation that is still in progress. */
export function GenerationActivityBubble({
  activity,
  language,
  onOpen
}: {
  activity: GenerationActivity | undefined;
  language: Language;
  onOpen: () => void;
}) {
  const animationRuntime = (Animated ?? {}) as typeof Animated & { Value?: new (value: number) => any; View?: typeof View };
  const canAnimate = typeof animationRuntime.Value === "function"
    && Boolean(animationRuntime.View)
    && typeof (Easing as typeof Easing & { inOut?: unknown }).inOut === "function";
  const pulseRef = useRef<any>(null);
  if (!pulseRef.current && canAnimate) pulseRef.current = new animationRuntime.Value!(0.35);
  const pulse = pulseRef.current;

  useEffect(() => {
    if (!activity || activity.status !== "working" || !canAnimate || !pulse) return undefined;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    ]));
    animation.start();
    return () => animation.stop();
  }, [activity?.id, activity?.status, canAnimate, pulse]);

  if (!activity || !["working", "ready"].includes(activity.status)) return null;
  const ready = activity.status === "ready";
  const title = activity.title[language] ?? activity.title.vi ?? activity.title.en ?? "Nilaza";
  const detail = ready
    ? (language === "vi" ? "Phản hồi đã sẵn sàng — chạm để mở" : "Response is ready — tap to open")
    : activity.detail[language] ?? activity.detail.vi ?? activity.detail.en ?? "";

  return (
    <Pressable
      accessibilityHint={language === "vi" ? "Mở lại nội dung đang được chuẩn bị" : "Return to the content being prepared"}
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityLiveRegion="polite"
      accessibilityRole="button"
      onPress={onOpen}
      style={styles.bubble}
    >
      <View style={styles.iconWrap}>
        {!ready ? (() => {
          const Pulse = canAnimate ? animationRuntime.View! : View;
          return <Pulse style={[styles.pulse, canAnimate && pulse ? { opacity: pulse, transform: [{ scale: pulse.interpolate({ inputRange: [0.35, 1], outputRange: [0.82, 1.25] }) }] } : null]} />;
        })() : null}
        <Ionicons name={ready ? "checkmark-circle-outline" : "sparkles-outline"} size={18} color={colors.gold} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        <Text numberOfLines={1} style={styles.detail}>{detail}</Text>
      </View>
      <Ionicons name="arrow-forward-outline" size={17} color={colors.gold} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderColor: "rgba(201, 164, 92, 0.62)",
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 330,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12
  },
  copy: { flex: 1, minWidth: 0 },
  detail: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 11, lineHeight: 15 },
  iconWrap: { alignItems: "center", height: 32, justifyContent: "center", position: "relative", width: 32 },
  pulse: { backgroundColor: "rgba(201, 164, 92, 0.24)", borderRadius: radius.control, height: 30, position: "absolute", width: 30 },
  title: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, lineHeight: 18 }
});
