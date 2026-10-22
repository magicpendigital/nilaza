import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type Tone = "ivory" | "charcoal";
type Variant = "symbol" | "horizontal" | "stacked";
const assets = {
  ivory: {
    symbol: require("../../assets/runtime/brand/open-reflection-v1/logo/symbol-ivory.png"),
    horizontal: require("../../assets/runtime/brand/open-reflection-v1/logo/horizontal-compact-ivory.png"),
    stacked: require("../../assets/runtime/brand/open-reflection-v1/logo/stacked-ivory.png"),
    left: require("../../assets/runtime/brand/open-reflection-v1/motion/left-curve-ivory.png"),
    dot: require("../../assets/runtime/brand/open-reflection-v1/motion/center-light-ivory.png"),
    right: require("../../assets/runtime/brand/open-reflection-v1/motion/right-curve-ivory.png")
  },
  charcoal: {
    symbol: require("../../assets/runtime/brand/open-reflection-v1/logo/symbol-charcoal.png"),
    horizontal: require("../../assets/runtime/brand/open-reflection-v1/logo/horizontal-compact-charcoal.png"),
    stacked: require("../../assets/runtime/brand/open-reflection-v1/logo/stacked-charcoal.png"),
    left: require("../../assets/runtime/brand/open-reflection-v1/motion/left-curve-charcoal.png"),
    dot: require("../../assets/runtime/brand/open-reflection-v1/motion/center-light-charcoal.png"),
    right: require("../../assets/runtime/brand/open-reflection-v1/motion/right-curve-charcoal.png")
  }
};

/** Source geometry is pinned in the brand manifest; never retype the wordmark. */
export function Brand({ variant = "symbol", tone = "ivory", width = 48, decorative = false, style }: {
  variant?: Variant; tone?: Tone; width?: number; decorative?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const source = assets[tone][variant];
  const aspectRatio = { symbol: 1000 / 1200, horizontal: 894 / 330, stacked: 800 / 740 }[variant];
  return <View style={[{ width, aspectRatio }, style]} accessible={!decorative} accessibilityRole="image" accessibilityLabel={decorative ? undefined : "Nilaza"} importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}>
    <Image source={source} resizeMode="contain" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} accessibilityIgnoresInvertColors accessible={false} />
  </View>;
}

/** Welcome only. Three identical canvases settle into the approved static symbol. */
export function BrandReveal({ width = 72, tone = "ivory", animate = true }: { width?: number; tone?: Tone; animate?: boolean }) {
  const dot = useRef(new Animated.Value(1)).current;
  const curves = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true, started = false;
    let animation: Animated.CompositeAnimation | undefined;
    const finalFrame = () => { if (!active || !started) return; animation?.stop(); dot.setValue(1); curves.setValue(1); };
    const applyPreference = (reduce: boolean) => {
      if (!active) return;
      if (reduce || !animate || started) { finalFrame(); return; }
      started = true;
      dot.setValue(0); curves.setValue(0);
      animation = Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(curves, { toValue: 1, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]);
      animation.start();
    };
    // Static is the safe fallback when the OS preference cannot be read.
    void AccessibilityInfo.isReduceMotionEnabled().then(applyPreference).catch(finalFrame);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", applyPreference);
    return () => { active = false; animation?.stop(); subscription.remove(); };
  }, [animate, curves, dot]);
  return <View accessible accessibilityRole="image" accessibilityLabel="Nilaza" style={{ width, aspectRatio: 1000 / 1200 }}>
    <Animated.Image accessible={false} source={assets[tone].dot} resizeMode="contain" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%", opacity: dot }]} />
    {(["left", "right"] as const).map((part, i) => <Animated.Image key={part} accessible={false} source={assets[tone][part]} resizeMode="contain" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%", opacity: curves, transform: [{ translateX: curves.interpolate({ inputRange: [0, 1], outputRange: [(i ? -1 : 1) * width * .032, 0] }) }, { translateY: curves.interpolate({ inputRange: [0, 1], outputRange: [width * .012, 0] }) }] }]} />)}
  </View>;
}
