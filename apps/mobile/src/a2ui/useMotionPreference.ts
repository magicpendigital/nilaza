import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Static until the OS preference is known; later events outrank the initial read. */
export function useMotionPreference() {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo?.addEventListener?.("reduceMotionChanged", (value) => {
      changed = true;
      if (active) setReduceMotion(value);
    });
    const preference = AccessibilityInfo?.isReduceMotionEnabled?.();
    if (preference) void preference.then((value) => {
      if (active && !changed) setReduceMotion(value);
    }).catch(() => undefined);
    return () => { active = false; subscription?.remove(); };
  }, []);
  return reduceMotion;
}
