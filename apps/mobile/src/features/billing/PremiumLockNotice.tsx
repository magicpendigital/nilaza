import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Owner-approved wording (16/11) for Premium decks and guides on an account without Premium.
export const premiumLockCopy = {
  vi: {
    label: "Dành cho Premium",
    deck: "Bạn xem trước bộ bài thoải mái. Rút bài với bộ này cần gói Premium.",
    guide: "Đọc giới thiệu miễn phí. Trò chuyện với người dẫn này cần gói Premium.",
    viewPlans: "Xem gói Premium",
  },
  en: {
    label: "For Premium",
    deck: "Preview this deck as much as you like. Drawing cards with it needs Premium.",
    guide: "Reading the introduction is free. Chatting with this guide needs Premium.",
    viewPlans: "See Premium plans",
  },
};

export function premiumLockText(language: Language) {
  return language === "vi" ? premiumLockCopy.vi : premiumLockCopy.en;
}

/**
 * Lock notice for a Premium deck or guide. The button appears only when the purchase screen may be
 * shown (pass onOpenPremium only while paywallEnabled); otherwise the label and explanation stand alone.
 */
export function PremiumLockNotice({ language, kind, onOpenPremium, testID }: {
  language: Language;
  kind: "deck" | "guide";
  onOpenPremium?: () => void;
  testID?: string;
}) {
  const t = premiumLockText(language);
  return (
    <View testID={testID ?? "premium-lock-notice"} style={s.box}>
      <View style={s.badge} accessible accessibilityLabel={t.label}>
        <Ionicons name="lock-closed-outline" size={12} color={goldLight} />
        <Text style={s.badgeText}>{t.label}</Text>
      </View>
      <Text accessibilityLiveRegion="polite" style={s.body}>{t[kind]}</Text>
      {onOpenPremium ? (
        <Pressable
          testID="premium-lock-view-plans"
          accessibilityRole="button"
          accessibilityLabel={t.viewPlans}
          onPress={onOpenPremium}
          style={({ pressed }) => [s.button, pressed && s.pressed]}
        >
          <Text style={s.buttonText}>{t.viewPlans}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const goldLight = "#E2C27F";

const s = StyleSheet.create({
  box: { marginVertical: 8, gap: 8, padding: 14, borderRadius: radius.card, backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.32)" },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "rgba(201, 164, 92, 0.16)" },
  badgeText: { color: goldLight, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12 },
  body: { color: colors.onSurfaceVariant, fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21 },
  button: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  pressed: { opacity: 0.85 },
  buttonText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, textAlign: "center" },
});
