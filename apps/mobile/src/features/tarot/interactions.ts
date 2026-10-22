import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Haptics are an enhancement: unsupported hardware/settings must never block a reveal.
export async function playTarotRevealHaptic(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Low-power mode, unavailable hardware and platform restrictions are expected.
  }
}
