import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { playSubscriptionsUrl } from "./PaywallPanel";

// Shown on the Delete account screen (billing lot 3). Deleting the Nilaza account removes the
// purchase record we keep, but it cannot cancel a Google Play subscription: only the person can.
export const deleteAccountBillingCopy = {
  vi: {
    premium:
      "Bạn đang có gói Premium. Xóa tài khoản không tự hủy gói đăng ký trên Google Play, và Google Play vẫn có thể tiếp tục thu tiền. Hãy hủy gói trước: Google Play → Thanh toán và gói đăng ký → Gói đăng ký.",
    neutral:
      "Nếu bạn có gói Premium, xóa tài khoản không tự hủy gói đăng ký trên Google Play. Hãy hủy trong Google Play → Thanh toán và gói đăng ký → Gói đăng ký.",
    link: "Mở gói đăng ký trên Google Play",
  },
  en: {
    premium:
      "You have Premium. Deleting your account does not cancel your Google Play subscription, and Google Play may keep charging you. Cancel it first: Google Play → Payments & subscriptions → Subscriptions.",
    neutral:
      "If you have Premium, deleting your account does not cancel your Google Play subscription. Cancel it in Google Play → Payments & subscriptions → Subscriptions.",
    link: "Open subscriptions in Google Play",
  },
};

export function DeleteAccountBillingNotice({ language, premiumActive, openUrl = (url) => Linking.openURL(url) }: {
  language: Language;
  /** The account currently has Premium (stronger warning). */
  premiumActive: boolean;
  openUrl?: (url: string) => Promise<unknown>;
}) {
  const t = language === "vi" ? deleteAccountBillingCopy.vi : deleteAccountBillingCopy.en;
  return (
    <View testID={premiumActive ? "delete-billing-notice-premium" : "delete-billing-notice"} style={[s.root, premiumActive && s.rootStrong]}>
      <View style={s.row}>
        <Ionicons name="card-outline" size={18} color={premiumActive ? colors.gold : colors.moon} />
        <Text style={s.body}>{premiumActive ? t.premium : t.neutral}</Text>
      </View>
      <Pressable
        testID="delete-billing-notice-link"
        accessibilityRole="link"
        accessibilityLabel={t.link}
        hitSlop={8}
        onPress={() => { void openUrl(playSubscriptionsUrl).catch(() => undefined); }}
        style={s.link}
      >
        <Text style={s.linkText}>{t.link}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 8, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.2)", backgroundColor: "#1F1C1E" },
  rootStrong: { borderColor: "rgba(201, 164, 92, 0.6)" },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  body: { flex: 1, color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  link: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { color: colors.moon, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, textDecorationLine: "underline" },
});
