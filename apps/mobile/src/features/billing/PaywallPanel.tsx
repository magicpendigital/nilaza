import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle, Path } from "react-native-svg";
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
export const paywallBenefits = [
  { vi: "Đọc sâu lá số với Chiêm tinh AI", en: "Deep chart reads with Astrology AI" },
  { vi: "Các bộ bài và người dẫn đường dành cho Premium", en: "Premium decks and guides" },
  { vi: "Nhiều lượt rút Tarot hơn mỗi ngày", en: "More Tarot draws each day" },
];

const copy = {
  vi: {
    title: "Nilaza Premium",
    eyebrow: "Premium",
    intro: "Một gói Premium, trả theo tháng hoặc theo năm.",
    choosePlan: "Chọn gói",
    billingPeriod: "Chu kỳ thanh toán",
    monthly: "Hằng tháng",
    annual: "Hằng năm",
    perMonth: "/ tháng",
    perYear: "/ năm",
    save: (percent: number) => `Tiết kiệm khoảng ${percent}% so với trả theo tháng`,
    saveShort: (percent: number) => `Tiết kiệm khoảng ${percent}%`,
    buy: (price: string, period: string) => `Đăng ký Premium · ${price} ${period}`,
    renewal: (price: string, period: string) =>
      `Thu ${price} ${period} qua tài khoản Google Play. Gói tự gia hạn cho đến khi bạn hủy. Hủy bất cứ lúc nào: Google Play → Thanh toán và gói đăng ký → Gói đăng ký; bạn vẫn dùng Premium đến hết kỳ đã trả.`,
    restore: "Khôi phục giao dịch mua",
    manage: "Quản lý gói",
    terms: "Điều khoản",
    privacy: "Quyền riêng tư",
    stillFreeTitle: "Vẫn miễn phí",
    stillFreeBody: "Lá bài hôm nay, Big 3 trong lá số và các bài đọc miễn phí vẫn dùng như trước. Premium thêm lớp đọc sâu bằng AI và các bộ bài, người dẫn đường riêng.",
    loading: "Đang tải gói từ Google Play…",
    retry: "Thử lại",
    purchasing: "Đang mở Google Play…",
    active: "Bạn đang dùng Premium",
    badgeActive: "Đang dùng",
    badgeEnding: "Sắp hết hạn",
    badgePending: "Đang chờ",
    badgeRestored: "Đã khôi phục",
    renewsOn: (date: string) => `Gia hạn vào ${date}.`,
    endsOn: (date: string) => `Premium dùng đến ${date}.`,
    noRenew: "Gói sẽ không tự gia hạn.",
    activating: "Đang kích hoạt Premium cho tài khoản. Một số tính năng AI có thể cần thêm ít phút để mở.",
    pending: "Thanh toán đang chờ xử lý. Premium sẽ mở khi Google Play xác nhận.",
    restored: "Đã khôi phục. Premium đang mở cho tài khoản này.",
    nothingToRestore: "Không tìm thấy gói Premium nào để khôi phục trên tài khoản Google Play này.",
    otherGoogleAccount: "Nếu bạn mua bằng tài khoản Google khác, hãy chuyển sang tài khoản đó trên Google Play rồi thử lại.",
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
    eyebrow: "Premium",
    intro: "One Premium plan, paid monthly or yearly.",
    choosePlan: "Choose a plan",
    billingPeriod: "Billing period",
    monthly: "Monthly",
    annual: "Yearly",
    perMonth: "/ month",
    perYear: "/ year",
    save: (percent: number) => `Save about ${percent}% compared with paying monthly`,
    saveShort: (percent: number) => `Save about ${percent}%`,
    buy: (price: string, period: string) => `Subscribe · ${price} ${period}`,
    renewal: (price: string, period: string) =>
      `${price} ${period}, charged to your Google Play account. Renews automatically until you cancel. Cancel anytime: Google Play → Payments & subscriptions → Subscriptions; Premium stays until the end of the paid period.`,
    restore: "Restore purchases",
    manage: "Manage plan",
    terms: "Terms",
    privacy: "Privacy",
    stillFreeTitle: "Still free",
    stillFreeBody: "Today's card, the Big 3 in your chart and the free readings stay as they are. Premium adds deeper AI reads and its own decks and guides.",
    loading: "Loading plans from Google Play…",
    retry: "Try again",
    purchasing: "Opening Google Play…",
    active: "You have Premium",
    badgeActive: "Active",
    badgeEnding: "Ending soon",
    badgePending: "Pending",
    badgeRestored: "Restored",
    renewsOn: (date: string) => `Renews on ${date}.`,
    endsOn: (date: string) => `Premium until ${date}.`,
    noRenew: "It will not renew.",
    activating: "Activating Premium for your account. Some AI features may take a few minutes to open.",
    pending: "Payment is pending. Premium opens once Google Play confirms it.",
    restored: "Restored. Premium is open for this account.",
    nothingToRestore: "No Premium plan was found to restore on this Google Play account.",
    otherGoogleAccount: "If you bought with another Google account, switch to it in Google Play and try again.",
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
type BadgeTone = "good" | "wait";
type Notice = { tone: "info" | "error"; text: string; badge?: { label: string; tone: BadgeTone }; hint?: string } | null;

// Approved Premium design (16/11): shades the shared theme does not name yet.
const tone = {
  panel: "#1F1C1E",
  skeleton: "#2A2628",
  body: "#E9E2D6",
  muted: "#B8B0A4",
  goldLight: "#E2C27F",
  goldBusy: "#7A6640",
  error: "#F0B0B0",
  errorIcon: "#E89A9A",
  hairline: "rgba(247, 241, 230, 0.06)",
  line: "rgba(247, 241, 230, 0.18)",
  goldWash: "rgba(201, 164, 92, 0.09)",
};

function formatDate(value: string | undefined, language: Language) {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Badge({ label, tone: kind }: { label: string; tone: BadgeTone }) {
  return (
    <View style={[s.badge, kind === "good" ? s.badgeGood : s.badgeWait]}>
      <Text style={[s.badgeText, kind === "good" ? s.badgeGoodText : s.badgeWaitText]}>{label}</Text>
    </View>
  );
}

function Star({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill={colors.gold} />
    </Svg>
  );
}

function Constellation() {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.constellation}>
      <Svg width={132} height={112} viewBox="0 0 132 112" fill="none">
        <Path d="M14 94L46 64L74 74L104 36L66 16" stroke={colors.gold} strokeOpacity={0.45} strokeWidth={1} />
        <Circle cx={14} cy={94} r={2.5} fill={colors.gold} fillOpacity={0.6} />
        <Circle cx={46} cy={64} r={2.5} fill={colors.gold} fillOpacity={0.8} />
        <Circle cx={74} cy={74} r={3} fill={colors.gold} />
        <Circle cx={104} cy={36} r={2.5} fill={colors.gold} fillOpacity={0.8} />
        <Circle cx={66} cy={16} r={2} fill={colors.gold} fillOpacity={0.6} />
        <Path d="M120 78l1.6 4.4 4.4 1.6-4.4 1.6L120 90l-1.6-4.4-4.4-1.6 4.4-1.6z" fill={tone.goldLight} />
      </Svg>
    </View>
  );
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
  const openManage = () => open(premium.customer?.managementUrl || playSubscriptionsUrl);

  const buy = async () => {
    if (busy || offer.status !== "ready") return;
    setBusy("purchase");
    setNotice(null);
    try {
      const result = await client.purchase(plan, userId);
      if (result.status === "purchased") premium.onStoreUpdate(result.customer);
      else if (result.status === "pending") setNotice({ tone: "info", text: t.pending, badge: { label: t.badgePending, tone: "wait" } });
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
        setNotice(result.customer.premiumActive
          ? { tone: "info", text: t.restored, badge: { label: t.badgeRestored, tone: "good" } }
          : { tone: "info", text: t.nothingToRestore, hint: t.otherGoogleAccount });
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
      <Text style={s.legalDot} accessibilityElementsHidden importantForAccessibility="no">·</Text>
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

  const manageButton = (
    <Pressable accessibilityRole="button" accessibilityLabel={t.manage} onPress={openManage} style={s.secondary}>
      <Text style={s.secondaryText}>{t.manage}</Text>
    </Pressable>
  );

  const noticeView = notice ? (
    <View style={s.notice} accessibilityLiveRegion="polite">
      {notice.badge ? <Badge label={notice.badge.label} tone={notice.badge.tone} /> : null}
      <Text accessibilityRole={notice.tone === "error" ? "alert" : undefined} style={notice.tone === "error" ? s.error : s.body}>
        {notice.text}
      </Text>
      {notice.hint ? <Text style={s.note}>{notice.hint}</Text> : null}
    </View>
  ) : null;

  if (!userId) {
    return (
      <View testID="paywall-sign-in" style={s.card}>
        <Text style={s.cardTitle}>{t.title}</Text>
        <Text style={s.muted}>{t.signIn}</Text>
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
        <Badge label={renews ? t.badgeActive : t.badgeEnding} tone={renews ? "good" : "wait"} />
        <Text style={s.cardTitle}>{t.active}</Text>
        {date ? <Text style={s.muted}>{renews ? t.renewsOn(date) : `${t.endsOn(date)} ${t.noRenew}`}</Text> : null}
        {premium.activating ? (
          <View testID="paywall-activating" style={s.inline}>
            <ActivityIndicator color={colors.gold} />
            <Text accessibilityLiveRegion="polite" style={[s.note, s.grow]}>{t.activating}</Text>
          </View>
        ) : null}
        {premium.billingAvailable || restoreButton ? (
          <View style={s.pair}>
            {premium.billingAvailable ? <View style={s.pairItem}>{manageButton}</View> : null}
            {restoreButton ? <View style={s.pairItem}>{restoreButton}</View> : null}
          </View>
        ) : null}
        {noticeView}
        {legal}
      </View>
    );
  }

  if (!premium.billingAvailable) {
    return (
      <View testID="paywall-unavailable" style={s.card}>
        <Text style={s.cardTitle}>{t.title}</Text>
        <Text style={s.muted}>{t.unavailable}</Text>
        {legal}
      </View>
    );
  }

  if (offer.status === "loading") {
    return (
      <View testID="paywall-loading" style={s.card}>
        <Text style={s.cardTitle}>{t.title}</Text>
        <View style={[s.skeleton, { height: 64 }]} />
        <View style={[s.skeleton, { height: 64 }]} />
        <View style={[s.skeleton, { height: 48 }]} />
        <View style={s.inline}>
          <ActivityIndicator color={colors.gold} />
          <Text accessibilityLiveRegion="polite" style={[s.note, s.grow]}>{t.loading}</Text>
        </View>
      </View>
    );
  }

  if (offer.status === "error") {
    return (
      <View testID="paywall-error" style={s.card}>
        <Text style={s.cardTitle}>{t.title}</Text>
        <View style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={18} color={tone.errorIcon} style={s.errorIcon} />
          <Text accessibilityRole="alert" style={s.error}>{t.errors[offer.code]}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t.retry} onPress={() => { void loadOffer(); }} style={s.primary}>
          <Text style={s.primaryText}>{t.retry}</Text>
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
    <View testID="paywall-plans" style={s.screen}>
      <View style={s.hero}>
        <Constellation />
        <Text style={s.eyebrow}>{t.eyebrow}</Text>
        <Text accessibilityRole="header" style={s.heroTitle}>{t.title}</Text>
        <Text style={s.heroIntro}>{t.intro}</Text>
      </View>

      <View style={s.benefits}>
        {paywallBenefits.map((item, index) => (
          <View key={item.en} style={[s.benefitRow, index < paywallBenefits.length - 1 && s.benefitDivider]}>
            <Star />
            <Text style={s.benefit}>{language === "vi" ? item.vi : item.en}</Text>
          </View>
        ))}
      </View>

      <Text accessibilityRole="header" style={s.sectionLabel}>{t.choosePlan}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.billingPeriod} style={s.options}>
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
              <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={22} color={isSelected ? colors.gold : colors.moon} />
              <View style={s.optionCopy}>
                <Text style={s.optionName}>{name}</Text>
                <Text style={s.optionPrice}>
                  {item.priceString} <Text style={s.optionPeriod}>{period(item.plan)}</Text>
                </Text>
              </View>
              {item.plan === "annual" && savings ? (
                <View style={s.chip}>
                  <Text style={s.chipText}>{t.saveShort(savings)}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <Pressable
          testID="paywall-buy"
          accessibilityRole="button"
          accessibilityLabel={t.buy(selected.priceString, period(selected.plan))}
          accessibilityState={{ disabled: Boolean(busy), busy: busy === "purchase" }}
          disabled={Boolean(busy)}
          onPress={() => { void buy(); }}
          style={[s.primary, s.buy, busy && s.primaryBusy]}
        >
          {busy === "purchase" ? <ActivityIndicator color={colors.charcoal} /> : null}
          <Text style={s.primaryText}>{busy === "purchase" ? t.purchasing : t.buy(selected.priceString, period(selected.plan))}</Text>
        </Pressable>
      ) : null}
      {selected ? <Text style={s.renewal}>{t.renewal(selected.priceString, period(selected.plan))}</Text> : null}
      {noticeView ? <View style={s.noticeSpaced}>{noticeView}</View> : null}

      <View style={[s.pair, s.pairSpaced]}>
        {restoreButton ? <View style={s.pairItem}>{restoreButton}</View> : null}
        <View style={s.pairItem}>{manageButton}</View>
      </View>

      <View style={s.legalSpaced}>{legal}</View>

      <View style={s.stillFree}>
        <Text style={s.eyebrow}>{t.stillFreeTitle}</Text>
        <Text style={s.body}>{t.stillFreeBody}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Plan choice: full design without an outer card.
  screen: { gap: 0 },
  hero: { position: "relative", paddingTop: 4, minHeight: 112 },
  constellation: { position: "absolute", right: 0, top: -6 },
  eyebrow: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  heroTitle: { marginTop: 8, maxWidth: "70%", color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 40, lineHeight: 42 },
  heroIntro: { marginTop: 12, maxWidth: "85%", color: tone.muted, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22 },
  benefits: { marginTop: 24, borderRadius: radius.card, backgroundColor: tone.panel, overflow: "hidden" },
  benefitRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  benefitDivider: { borderBottomWidth: 1, borderBottomColor: tone.hairline },
  benefit: { flex: 1, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 21 },
  sectionLabel: { marginTop: 28, marginBottom: 10, color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  options: { gap: 10 },
  option: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.border, backgroundColor: tone.panel },
  optionSelected: { borderColor: colors.gold, backgroundColor: tone.goldWash },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionName: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16 },
  optionPrice: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 28 },
  optionPeriod: { color: tone.muted, fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  chip: { alignSelf: "flex-start", maxWidth: 96, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.gold },
  chipText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11.5, lineHeight: 14, textAlign: "center" },
  buy: { marginTop: 18, minHeight: 52 },
  renewal: { marginTop: 12, marginHorizontal: 2, color: tone.muted, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 19 },
  pair: { flexDirection: "row", gap: 10 },
  pairSpaced: { marginTop: 20 },
  pairItem: { flex: 1, minWidth: 0 },
  stillFree: { marginTop: 24, padding: 16, gap: 8, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.1)" },
  // State cards (loading, signed out, active, error, unavailable).
  card: { padding: 18, borderRadius: radius.card, backgroundColor: tone.panel, gap: 12 },
  cardTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 24, lineHeight: 30 },
  skeleton: { borderRadius: radius.card, backgroundColor: tone.skeleton },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeGood: { backgroundColor: "rgba(143, 191, 154, 0.16)" },
  badgeWait: { backgroundColor: "rgba(224, 177, 90, 0.16)" },
  badgeText: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12 },
  badgeGoodText: { color: "#9CCBA7" },
  badgeWaitText: { color: "#E8C27A" },
  notice: { gap: 8 },
  noticeSpaced: { marginTop: 12 },
  body: { color: tone.body, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
  muted: { color: tone.muted, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  primary: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.gold, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10 },
  primaryBusy: { backgroundColor: tone.goldBusy },
  primaryText: { flexShrink: 1, color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15, textAlign: "center" },
  secondary: { minHeight: 46, borderRadius: radius.pill, borderWidth: 1, borderColor: tone.line, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 8 },
  secondaryText: { flexShrink: 1, color: tone.body, fontFamily: typography.bodyFontFamily, fontSize: 14, textAlign: "center" },
  legalSpaced: { marginTop: 14 },
  legalRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  legalDot: { color: tone.muted, fontSize: 13 },
  link: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  linkText: { color: colors.gold, fontFamily: typography.bodyFontFamily, fontSize: 13, textDecorationLine: "underline" },
  grow: { flex: 1 },
  note: { color: tone.muted, fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19 },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  errorIcon: { marginTop: 2 },
  error: { flex: 1, color: tone.error, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
});
