import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import type { FeatureAccess } from "./featureAccessConfig";

export const premiumGateCopy = {
  vi: {
    badge: "Premium",
    title: "Tính năng này thuộc gói Premium",
    body: "Những gì bạn đã lưu vẫn còn nguyên và xem được bất cứ lúc nào.",
    action: "Xem Premium",
    noAction: "Bạn có thể mở gói Premium trong phần Tài khoản."
  },
  en: {
    badge: "Premium",
    title: "This feature is part of Premium",
    body: "Everything you saved is still here and you can open it any time.",
    action: "See Premium",
    noAction: "You can open Premium from your Account."
  }
};

/** Small gold "Premium" label for a feature row or card. */
export function PremiumBadge({ language, testID = "premium-badge" }: { language: Language; testID?: string }) {
  const t = language === "vi" ? premiumGateCopy.vi : premiumGateCopy.en;
  return (
    <View testID={testID} style={s.badge} accessibilityLabel={t.badge}>
      <Ionicons name="star" size={11} color={colors.gold} />
      <Text style={s.badgeText}>{t.badge}</Text>
    </View>
  );
}

/**
 * Shows `children` when the feature is open, nothing when it is off (turned off elsewhere), and a short Premium
 * explanation when it is locked. The button opens the existing Premium screen through `onOpenPremium`; without a
 * handler it explains where Premium lives, so a locked feature never lands on an empty screen.
 * Saved results are not behind this gate: screens that list them render outside it.
 */
export function PremiumGate({ access, language, onOpenPremium, children }: {
  access: FeatureAccess;
  language: Language;
  onOpenPremium?: () => void;
  children: ReactNode;
}) {
  if (access.state === "off") return null;
  if (access.state === "open") return <>{children}</>;
  const t = language === "vi" ? premiumGateCopy.vi : premiumGateCopy.en;
  return (
    <View testID={`premium-gate-${access.featureId}`} style={s.root}>
      <PremiumBadge language={language} />
      <Text style={s.title} accessibilityRole="header">{t.title}</Text>
      <Text style={s.body}>{t.body}</Text>
      {onOpenPremium ? (
        <Pressable
          testID="premium-gate-open"
          accessibilityRole="button"
          accessibilityLabel={t.action}
          onPress={onOpenPremium}
          style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
        >
          <Text style={s.buttonText}>{t.action}</Text>
        </Pressable>
      ) : (
        <Text testID="premium-gate-no-action" style={s.body}>{t.noAction}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.gold
  },
  badgeText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 0.3 },
  root: { gap: 10, padding: 16, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.6)", backgroundColor: "#1F1C1E" },
  title: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, lineHeight: 22 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  button: {
    minHeight: layout.minimumTouchTarget, justifyContent: "center", alignItems: "center", alignSelf: "flex-start",
    paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.gold
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: "#1A1718", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 }
});
