import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { nilazaLegalUrlFor } from "../../runtimeConfig";
import { annualSavingsPercent } from "./annualSavings";
import type { BillingErrorCode, BillingOffer, BillingPlan } from "./billingClient";
import type { PremiumState } from "./usePremium";

const ANDROID_PACKAGE = "app.nilaza.mobile";
/** Google Play subscription page for this app (Manage plan). */
export const playSubscriptionsUrl = `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE}`;

// Benefits in the app's own words, without fixed counts or open-ended AI promises (Owner 15/11).
// Lô 6 (25/11/2026): each line is backed by code today. Astrology AI: ai-astrology-insight/handler.ts needs a paid
// entitlement or the tier switch. Premium decks and guides: App.tsx locks "premium-preview" decks and personas for a
// free displayed tier. "More Tarot draws" was removed: Tarot AI is 1 per day for every account (account-tier-policy.json).
export const paywallBenefits = [
  { vi: "Đọc sâu lá số với Chiêm tinh AI", en: "Deep chart reads with Astrology AI" },
  { vi: "Các bộ bài và người dẫn đường dành cho Premium", en: "Premium decks and guides" },
];

// Planned, not built, and not part of what a purchase gives today. Shown muted under a "Sắp có" label.
export const paywallComingSoon = [
  { vi: "Bản đồ số AI: Lời nhắn riêng, từ các con số đã tính", en: "Numerology AI: a personal note, from your computed numbers" },
  { vi: "Bản đồ số AI: Báo cáo tổng hợp", en: "Numerology AI: a combined report" },
  { vi: "Hai hệ cùng nhìn bạn: chiêm tinh và bản đồ số", en: "Two systems, one view: astrology and numerology together" },
];

const copy = {
  vi: {
    title: "Nilaza Premium",
    intro: "Một gói Premium, trả theo tháng hoặc theo năm.",
    comingSoon: "Sắp có",
    comingSoonNote: "Chưa có trong gói hiện tại.",
    monthly: "Hằng tháng",
    annual: "Hằng năm",
    perMonth: "/ tháng",
    perYear: "/ năm",
    save: (percent: number) => `Tiết kiệm khoảng ${percent}% so với trả theo tháng`,
    buy: (price: string, period: string) => `Đăng ký Premium · ${price} ${period}`,
    renewal: (price: string, period: string) =>
      `Thu ${price} ${period} qua tài khoản Google Play. Gói tự gia hạn cho đến khi bạn hủy. Hủy bất cứ lúc nào: Google Play → Thanh toán và gói đăng ký → Gói đăng ký; bạn vẫn dùng Premium đến hết kỳ đã trả.`,
    restore: "Khôi phục giao dịch mua",
    manage: "Quản lý gói",
    terms: "Điều khoản",
    privacy: "Quyền riêng tư",
    loading: "Đang tải gói từ Google Play…",
    retry: "Thử lại",
    purchasing: "Đang mở Google Play…",
    active: "Bạn đang dùng Premium",
    renewsOn: (date: string) => `Gia hạn vào ${date}.`,
    endsOn: (date: string) => `Premium dùng đến ${date}.`,
    activating: "Đang kích hoạt Premium cho tài khoản. Một số tính năng AI có thể cần thêm ít phút để mở.",
    pending: "Thanh toán đang chờ xử lý. Premium sẽ mở khi Google Play xác nhận.",
    restored: "Đã khôi phục. Premium đang mở cho tài khoản này.",
    nothingToRestore: "Không tìm thấy gói Premium nào để khôi phục trên tài khoản Google Play này.",
    signIn: "Đăng nhập để mua hoặc khôi phục gói Premium. Gói gắn với tài khoản Nilaza của bạn.",
    signInButton: "Đăng nhập",
    unavailable: "Chưa thể mua gói trên thiết bị này. Hãy dùng bản Nilaza cài từ Google Play.",
    errors: {
      unavailable: "Chưa thể mua gói trên thiết bị này. Hãy dùng bản Nilaza cài từ Google Play.",
      sign_in_required: "Hãy đăng nhập lại rồi thử lần nữa.",
      network: "Không có kết nối mạng. Hãy kiểm tra mạng rồi thử lại.",
      store_problem: "Google Play đang gặp sự cố. Hãy thử lại sau ít phút.",
      not_allowed: "Thiết bị hoặc tài khoản Google Play này chưa cho phép mua. Hãy kiểm tra phương thức thanh toán.",
      product_unavailable: "Gói Premium chưa sẵn sàng trên Google Play. Hãy thử lại sau.",
      already_owned: "Tài khoản Google Play này đã có gói Premium. Hãy bấm Khôi phục giao dịch mua.",
      in_progress: "Một giao dịch khác đang chạy. Hãy đợi giây lát.",
      other_account: "Gói này đang gắn với một tài khoản Nilaza khác.",
      unknown: "Chưa hoàn tất được. Bạn chưa bị trừ tiền nếu Google Play chưa xác nhận; hãy thử lại.",
    } satisfies Record<BillingErrorCode, string>,
  },
  en: {
    title: "Nilaza Premium",
    intro: "One Premium plan, paid monthly or yearly.",
    comingSoon: "Coming soon",
    comingSoonNote: "Not part of the plan yet.",
    monthly: "Monthly",
    annual: "Yearly",
    perMonth: "/ month",
    perYear: "/ year",
    save: (percent: number) => `Save about ${percent}% compared with paying monthly`,
    buy: (price: string, period: string) => `Subscribe · ${price} ${period}`,
    renewal: (price: string, period: string) =>
      `${price} ${period}, charged to your Google Play account. Renews automatically until you cancel. Cancel anytime: Google Play → Payments & subscriptions → Subscriptions; Premium stays until the end of the paid period.`,
    restore: "Restore purchases",
    manage: "Manage plan",
    terms: "Terms",
    privacy: "Privacy",
    loading: "Loading plans from Google Play…",
    retry: "Try again",
    purchasing: "Opening Google Play…",
    active: "You have Premium",
    renewsOn: (date: string) => `Renews on ${date}.`,
    endsOn: (date: string) => `Premium until ${date}.`,
    activating: "Activating Premium for your account. Some AI features may take a few minutes to open.",
    pending: "Payment is pending. Premium opens once Google Play confirms it.",
    restored: "Restored. Premium is open for this account.",
    nothingToRestore: "No Premium plan was found to restore on this Google Play account.",
    signIn: "Sign in to buy or restore Premium. The plan is linked to your Nilaza account.",
    signInButton: "Sign in",
    unavailable: "Purchases are not available on this device. Use Nilaza installed from Google Play.",
    errors: {
      unavailable: "Purchases are not available on this device. Use Nilaza installed from Google Play.",
      sign_in_required: "Sign in again, then try once more.",
      network: "No connection. Check your network and try again.",
      store_problem: "Google Play has a problem right now. Try again in a few minutes.",
      not_allowed: "This device or Google Play account cannot make purchases. Check your payment method.",
      product_unavailable: "Premium is not ready on Google Play yet. Try again later.",
      already_owned: "This Google Play account already has Premium. Tap Restore purchases.",
      in_progress: "Another purchase is in progress. Please wait a moment.",
      other_account: "This plan is linked to another Nilaza account.",
      unknown: "That did not finish. You are not charged unless Google Play confirms it; please try again.",
    } satisfies Record<BillingErrorCode, string>,
  },
};

type OfferState = { status: "loading" } | { status: "ready"; offer: BillingOffer } | { status: "error"; code: BillingErrorCode };
type Notice = { tone: "info" | "error"; text: string } | null;

function formatDate(value: string | undefined, language: Language) {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function PaywallPanel({ language, userId, premium, onSignIn, openUrl = (url) => Linking.openURL(url) }: {
  language: Language;
  /** Signed-in Supabase user id; nothing can be bought without it. */
  userId: string | undefined;
  premium: PremiumState;
  onSignIn?: () => void;
  openUrl?: (url: string) => Promise<unknown>;
}) {
  const t = language === "vi" ? copy.vi : copy.en;
  const { client } = premium;
  const [offer, setOffer] = useState<OfferState>({ status: "loading" });
  const [plan, setPlan] = useState<BillingPlan>("annual");
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const showPlans = Boolean(userId) && premium.billingAvailable && !premium.entitled;

  const loadOffer = useCallback(async () => {
    setOffer({ status: "loading" });
    // The store customer must be the signed-in account before plans are shown or bought.
    await client.identify(userId).catch(() => undefined);
    const result = await client.getOffer();
    if (result.status === "ok") {
      setOffer({ status: "ready", offer: result.offer });
      setPlan((current) => (result.offer[current] ? current : result.offer.annual ? "annual" : "monthly"));
    } else {
      setOffer({ status: "error", code: result.code });
    }
  }, [client, userId]);

  useEffect(() => {
    if (showPlans) void loadOffer();
  }, [loadOffer, showPlans]);

  const open = (url: string) => { void openUrl(url).catch(() => undefined); };

  const buy = async () => {
    if (busy || offer.status !== "ready") return;
    setBusy("purchase");
    setNotice(null);
    try {
      const result = await client.purchase(plan, userId);
      if (result.status === "purchased") premium.onStoreUpdate(result.customer);
      else if (result.status === "pending") setNotice({ tone: "info", text: t.pending });
      else if (result.status === "error") setNotice({ tone: "error", text: t.errors[result.code] });
      // A cancelled purchase is not an error: the screen simply stays as it was.
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy("restore");
    setNotice(null);
    try {
      const result = await client.restore(userId);
      if (result.status === "restored") {
        premium.onStoreUpdate(result.customer);
        premium.refresh();
        setNotice({ tone: "info", text: result.customer.premiumActive ? t.restored : t.nothingToRestore });
      } else {
        setNotice({ tone: "error", text: t.errors[result.code] });
      }
    } finally {
      setBusy(null);
    }
  };

  const legal = (
    <View style={s.legalRow}>
      <Pressable accessibilityRole="link" accessibilityLabel={t.terms} hitSlop={8} onPress={() => open(nilazaLegalUrlFor("terms", language))} style={s.link}>
        <Text style={s.linkText}>{t.terms}</Text>
      </Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel={t.privacy} hitSlop={8} onPress={() => open(nilazaLegalUrlFor("privacy", language))} style={s.link}>
        <Text style={s.linkText}>{t.privacy}</Text>
      </Pressable>
    </View>
  );

  const restoreButton = premium.billingAvailable && userId ? (
    <Pressable
      testID="paywall-restore"
      accessibilityRole="button"
      accessibilityLabel={t.restore}
      accessibilityState={{ disabled: Boolean(busy), busy: busy === "restore" }}
      disabled={Boolean(busy)}
      onPress={() => { void restore(); }}
      style={s.secondary}
    >
      {busy === "restore" ? <ActivityIndicator color={colors.ivory} /> : null}
      <Text style={s.secondaryText}>{t.restore}</Text>
    </Pressable>
  ) : null;

  const noticeView = notice ? (
    <Text accessibilityLiveRegion="polite" accessibilityRole={notice.tone === "error" ? "alert" : undefined} style={notice.tone === "error" ? s.error : s.note}>
      {notice.text}
    </Text>
  ) : null;

  if (!userId) {
    return (
      <View testID="paywall-sign-in" style={s.card}>
        <Text style={s.title}>{t.title}</Text>
        <Text style={s.body}>{t.signIn}</Text>
        {onSignIn ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t.signInButton} onPress={onSignIn} style={s.primary}>
            <Text style={s.primaryText}>{t.signInButton}</Text>
          </Pressable>
        ) : null}
        {legal}
      </View>
    );
  }

  if (premium.entitled) {
    const date = formatDate(premium.periodEnd, language);
    const renews = premium.customer ? premium.customer.willRenew : true;
    return (
      <View testID="paywall-active" style={s.card}>
        <View style={s.head}>
          <Ionicons name="sparkles" size={18} color={colors.gold} />
          <Text style={s.title}>{t.active}</Text>
        </View>
        {date ? <Text style={s.body}>{renews ? t.renewsOn(date) : t.endsOn(date)}</Text> : null}
        {premium.activating ? (
          <View testID="paywall-activating" style={s.inline}>
            <ActivityIndicator color={colors.gold} />
            <Text accessibilityLiveRegion="polite" style={s.note}>{t.activating}</Text>
          </View>
        ) : null}
        {premium.billingAvailable ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t.manage} onPress={() => open(premium.customer?.managementUrl || playSubscriptionsUrl)} style={s.primary}>
            <Text style={s.primaryText}>{t.manage}</Text>
          </Pressable>
        ) : null}
        {restoreButton}
        {noticeView}
        {legal}
      </View>
    );
  }

  if (!premium.billingAvailable) {
    return (
      <View testID="paywall-unavailable" style={s.card}>
        <Text style={s.title}>{t.title}</Text>
        <Text style={s.body}>{t.unavailable}</Text>
        {legal}
      </View>
    );
  }

  if (offer.status === "loading") {
    return (
      <View testID="paywall-loading" style={s.card}>
        <Text style={s.title}>{t.title}</Text>
        <View style={s.inline}>
          <ActivityIndicator color={colors.gold} />
          <Text style={s.note}>{t.loading}</Text>
        </View>
      </View>
    );
  }

  if (offer.status === "error") {
    return (
      <View testID="paywall-error" style={s.card}>
        <Text style={s.title}>{t.title}</Text>
        <Text accessibilityRole="alert" style={s.error}>{t.errors[offer.code]}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t.retry} onPress={() => { void loadOffer(); }} style={s.secondary}>
          <Text style={s.secondaryText}>{t.retry}</Text>
        </Pressable>
        {restoreButton}
        {noticeView}
        {legal}
      </View>
    );
  }

  const { monthly, annual } = offer.offer;
  const savings = annualSavingsPercent({
    monthlyPrice: monthly?.price,
    annualPrice: annual?.price,
    monthlyCurrency: monthly?.currencyCode,
    annualCurrency: annual?.currencyCode,
  });
  const selected = offer.offer[plan] ?? annual ?? monthly;
  const period = (choice: BillingPlan) => (choice === "monthly" ? t.perMonth : t.perYear);
  const options = ([annual, monthly].filter(Boolean) as NonNullable<typeof monthly>[]);

  return (
    <View testID="paywall-plans" style={s.card}>
      <Text style={s.title}>{t.title}</Text>
      <Text style={s.body}>{t.intro}</Text>
      {paywallBenefits.map((item) => (
        <View key={item.en} style={s.inline}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.gold} />
          <Text style={s.benefit}>{language === "vi" ? item.vi : item.en}</Text>
        </View>
      ))}
      <View testID="paywall-coming-soon" style={s.soon}>
        <View style={s.soonHead}>
          <Text style={s.soonPill}>{t.comingSoon}</Text>
          <Text style={s.soonNote}>{t.comingSoonNote}</Text>
        </View>
        {paywallComingSoon.map((item) => {
          const label = language === "vi" ? item.vi : item.en;
          return (
            <View key={item.en} accessible accessibilityLabel={`${t.comingSoon}: ${label}`} style={s.inline}>
              <Ionicons name="time-outline" size={16} color={colors.moon} />
              <Text style={s.soonItem}>{label}</Text>
            </View>
          );
        })}
      </View>
      <View accessibilityRole="radiogroup" style={s.options}>
        {options.map((item) => {
          const isSelected = selected?.plan === item.plan;
          const name = item.plan === "monthly" ? t.monthly : t.annual;
          const saving = item.plan === "annual" && savings ? t.save(savings) : undefined;
          return (
            <Pressable
              key={item.plan}
              testID={`paywall-plan-${item.plan}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, checked: isSelected, disabled: Boolean(busy) }}
              accessibilityLabel={[name, `${item.priceString} ${period(item.plan)}`, saving].filter(Boolean).join(", ")}
              disabled={Boolean(busy)}
              onPress={() => setPlan(item.plan)}
              style={[s.option, isSelected && s.optionSelected]}
            >
              <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={20} color={isSelected ? colors.gold : colors.moon} />
              <View style={s.optionCopy}>
                <Text style={s.optionName}>{name}</Text>
                <Text style={s.optionPrice}>{item.priceString} {period(item.plan)}</Text>
                {saving ? <Text style={s.saving}>{saving}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {selected ? <Text style={s.note}>{t.renewal(selected.priceString, period(selected.plan))}</Text> : null}
      {selected ? (
        <Pressable
          testID="paywall-buy"
          accessibilityRole="button"
          accessibilityLabel={t.buy(selected.priceString, period(selected.plan))}
          accessibilityState={{ disabled: Boolean(busy), busy: busy === "purchase" }}
          disabled={Boolean(busy)}
          onPress={() => { void buy(); }}
          style={[s.primary, busy && s.disabled]}
        >
          {busy === "purchase" ? <ActivityIndicator color={colors.charcoal} /> : null}
          <Text style={s.primaryText}>{busy === "purchase" ? t.purchasing : t.buy(selected.priceString, period(selected.plan))}</Text>
        </Pressable>
      ) : null}
      {restoreButton}
      {noticeView}
      {legal}
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 16, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)", gap: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21, lineHeight: 26 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 21 },
  benefit: { flex: 1, color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  soon: { gap: 8, padding: 12, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.12)", opacity: 0.85 },
  soonHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  soonPill: { color: colors.charcoal, backgroundColor: colors.moon, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, lineHeight: 16, paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill, overflow: "hidden" },
  soonNote: { color: "#A8A096", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  soonItem: { flex: 1, color: "#A8A096", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 19 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  options: { gap: 10 },
  option: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.2)" },
  optionSelected: { borderColor: colors.gold, backgroundColor: "rgba(201, 164, 92, 0.08)" },
  optionCopy: { flex: 1, gap: 2 },
  optionName: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  optionPrice: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14 },
  saving: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12.5 },
  primary: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ivory, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5, textAlign: "center" },
  secondary: { minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.2)", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  disabled: { opacity: 0.6 },
  legalRow: { flexDirection: "row", gap: 16, justifyContent: "center" },
  link: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  linkText: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 13, textDecorationLine: "underline" },
  note: { flex: 1, color: "#A8A096", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  error: { color: "#E7B7BE", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 19 },
});
