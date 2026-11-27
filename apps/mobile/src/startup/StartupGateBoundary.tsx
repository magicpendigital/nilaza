import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import appConfig from "../../app.json";
import { getAppBootstrap } from "../backendClient";
import { configureFeatureAccess, type FeatureAccessService } from "../features/access/featureAccessService";
import { detectDeviceLanguage, formatLocalDate } from "../i18n";
import { loadDeviceLanguagePreference } from "../languagePreference";
import {
  isSupabaseAuthConfigured, nilazaBackendBaseUrl, onlineModeRequired, onlineRuntimeReady, supabaseAnonKey, supabaseUrl
} from "../runtimeConfig";
import { loadJson, saveJson } from "../storage";
import { colors, layout, radius } from "../theme";
import type { Language } from "../types";
import {
  BOOTSTRAP_STORAGE_KEY, BOOTSTRAP_TIMEOUT_MS, decideStartupState, isBlockingState, parseAppBootstrap, parseStoredBootstrap,
  shouldRecheck, startupGateActive, storedFromSuccess, type BootstrapFetchResult, type StartupState, type StoredBootstrap
} from "./startupGate";

// Screens and banners of the start-up check (startup-gate-2026-11-28). System font on purpose: the brand fonts load
// later, inside AccountApp.

export const startupGateCopy = {
  vi: {
    offlineTitle: "Mất kết nối",
    offlineBody: "Nilaza cần kết nối mạng để mở. Hãy kiểm tra Wi-Fi hoặc dữ liệu di động rồi thử lại.",
    retry: "Thử lại",
    retrying: "Đang kết nối…",
    updateTitle: "Cần cập nhật",
    updateBody: "Phiên bản Nilaza này đã cũ. Hãy cập nhật trên Google Play để tiếp tục.",
    openPlay: "Cập nhật trên Google Play",
    checkAgain: "Kiểm tra lại",
    offlineBanner: "Đang ngoại tuyến · Nhật ký và nội dung đã tải vẫn dùng được, tính năng AI cần mạng.",
    reminder: (date: string) => `Đã có phiên bản Nilaza mới. Bản đang dùng còn mở được đến ${date}.`,
    reminderAction: "Cập nhật",
    dismiss: "Đóng lời nhắc cập nhật"
  },
  en: {
    offlineTitle: "Connection lost",
    offlineBody: "Nilaza needs a connection to open. Check Wi-Fi or mobile data, then try again.",
    retry: "Try again",
    retrying: "Connecting…",
    updateTitle: "Update needed",
    updateBody: "This version of Nilaza is out of date. Update it on Google Play to continue.",
    openPlay: "Update on Google Play",
    checkAgain: "Check again",
    offlineBanner: "Offline · Your journal and downloaded content still work; AI features need a connection.",
    reminder: (date: string) => `A new version of Nilaza is available. This version keeps working until ${date}.`,
    reminderAction: "Update",
    dismiss: "Dismiss the update reminder"
  }
};

const androidPackage = appConfig.expo.android.package;
export const playStoreUrls = {
  market: `market://details?id=${androidPackage}`,
  web: `https://play.google.com/store/apps/details?id=${androidPackage}`
};

/** Opens the Play listing (Play app first, the web page if that fails). */
export async function openPlayListing(open: (url: string) => Promise<unknown> = (url) => Linking.openURL(url)) {
  try {
    await open(playStoreUrls.market);
  } catch {
    await open(playStoreUrls.web).catch(() => undefined);
  }
}

const defaultEnabled = startupGateActive({ supabaseConfigured: isSupabaseAuthConfigured, onlineModeRequired, onlineRuntimeReady });
const defaultFetch = () => getAppBootstrap({ apiKey: supabaseAnonKey, supabaseUrl, baseUrl: nilazaBackendBaseUrl });

let bootstrapFeatureAccess: FeatureAccessService | null = null;
/**
 * The app-wide Free / Premium service, fed by the same bootstrap read: the start answer is handed over with
 * `accept` (no second request), and later refreshes from useFeatureAccess go through get_app_bootstrap too.
 */
function sharedFeatureAccess(fetchBootstrap: () => Promise<unknown>) {
  bootstrapFeatureAccess ??= configureFeatureAccess(async () => {
    const parsed = parseAppBootstrap(await fetchBootstrap());
    if (!parsed) throw new Error("Unexpected start-up answer");
    return parsed.featureAccess;
  });
  return bootstrapFeatureAccess;
}

async function fetchWithTimeout(fetchBootstrap: () => Promise<unknown>, timeoutMs: number): Promise<BootstrapFetchResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const answer = await Promise.race([
      fetchBootstrap(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), timeoutMs); })
    ]);
    const bootstrap = parseAppBootstrap(answer);
    return bootstrap ? { ok: true, bootstrap } : { ok: false };
  } catch {
    return { ok: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type GateView = { state: StartupState | "checking"; deadline: number | null };

export type StartupGateProps = {
  children: ReactNode;
  /** Defaults to startupGateActive(runtime config); false passes straight through as "online". */
  enabled?: boolean;
  fetchBootstrap?: () => Promise<unknown>;
  appVersion?: string;
  now?: () => number;
  /** Service to hand the Free / Premium payload to; defaults to the app-wide one. */
  featureAccess?: FeatureAccessService;
  /** Fixed language (tests); otherwise the device preference, then the phone language. */
  language?: Language;
  openUrl?: (url: string) => Promise<unknown>;
  timeoutMs?: number;
};

/**
 * Wraps the whole app. Asks the server once at start (splash stays up meanwhile), then:
 * online / update-reminder / offline-grace -> the app (with a banner for the last two);
 * offline-blocked / update-required -> a full screen. Rechecks when the app returns to the foreground after more than
 * 5 minutes; once the app has been shown it stays mounted under any later full screen, so nothing typed is lost.
 */
export function StartupGate({
  children, enabled = defaultEnabled, fetchBootstrap = defaultFetch, appVersion = appConfig.expo.version, now = Date.now,
  featureAccess, language: fixedLanguage, openUrl, timeoutMs = BOOTSTRAP_TIMEOUT_MS
}: StartupGateProps) {
  const [view, setView] = useState<GateView>(() => ({ state: enabled ? "checking" : "online", deadline: null }));
  const [retrying, setRetrying] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [deviceLanguage, setDeviceLanguage] = useState<Language>(() => fixedLanguage ?? detectDeviceLanguage());
  const [appShown, setAppShown] = useState(!enabled);
  const lastCheckAt = useRef<number | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const alive = useRef(true);
  const language = fixedLanguage ?? deviceLanguage;

  const check = useCallback(() => {
    running.current ??= (async () => {
      try {
        let stored: StoredBootstrap | null = null;
        let result: BootstrapFetchResult = { ok: false };
        try {
          [stored, result] = await Promise.all([
            loadJson<unknown>(BOOTSTRAP_STORAGE_KEY, null).then(parseStoredBootstrap).catch(() => null),
            fetchWithTimeout(fetchBootstrap, timeoutMs)
          ]);
        } catch {
          // Anything unexpected counts as a failed fetch: offline rules decide, never a stuck splash.
        }
        const checkedAt = now();
        lastCheckAt.current = checkedAt;
        const decision = decideStartupState({
          now: checkedAt,
          lastSuccessAt: stored?.lastSuccessAt ?? null,
          fetchResult: result,
          appVersion,
          policy: stored?.policy ?? null,
          serverOffsetMs: stored?.serverOffsetMs
        });
        if (result.ok) {
          // Saving the answer must never decide what the user sees: each step may fail on its own.
          try {
            await saveJson<StoredBootstrap>(BOOTSTRAP_STORAGE_KEY, storedFromSuccess(result.bootstrap, checkedAt));
          } catch { /* keep going */ }
          try {
            await (featureAccess ?? sharedFeatureAccess(fetchBootstrap)).accept(result.bootstrap.featureAccess, checkedAt);
          } catch { /* keep going */ }
        }
        if (!alive.current) return;
        setView({ state: decision.state, deadline: decision.updateDeadline });
        if (!isBlockingState(decision.state)) setAppShown(true);
      } finally {
        running.current = null;
        if (alive.current) setRetrying(false);
      }
    })();
    return running.current;
  }, [appVersion, featureAccess, fetchBootstrap, now, timeoutMs]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (fixedLanguage) return;
    void loadDeviceLanguagePreference().then((saved) => { if (saved && alive.current) setDeviceLanguage(saved); });
  }, [fixedLanguage]);

  useEffect(() => {
    if (!enabled) return;
    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && shouldRecheck(now(), lastCheckAt.current)) void check();
    });
    return () => subscription.remove();
  }, [check, enabled, now]);

  const blocking = view.state !== "checking" && isBlockingState(view.state);
  useEffect(() => {
    // The native splash covers the first check; a full screen must not stay hidden behind it.
    // When the app is shown, AccountBoundary keeps its own splash rules.
    if (blocking) void SplashScreen.hideAsync().catch(() => undefined);
  }, [blocking]);

  if (!enabled) return <>{children}</>;
  // First check still running: render nothing so the native splash stays in front.
  if (view.state === "checking" && !appShown) return null;

  const t = language === "vi" ? startupGateCopy.vi : startupGateCopy.en;
  const retry = () => {
    if (retrying) return;
    setRetrying(true);
    void check();
  };
  const openPlay = () => { void openPlayListing(openUrl); };

  const fullScreen = blocking ? (
    <View testID={`startup-gate-${view.state}`} style={[StyleSheet.absoluteFill, s.fullScreen]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      <SafeAreaView style={s.fullScreenInner}>
        <Text accessibilityRole="header" style={s.title}>{view.state === "update-required" ? t.updateTitle : t.offlineTitle}</Text>
        <Text style={s.body}>{view.state === "update-required" ? t.updateBody : t.offlineBody}</Text>
        {view.state === "update-required" ? (
          <Pressable testID="startup-gate-open-play" accessibilityRole="button" accessibilityLabel={t.openPlay} onPress={openPlay}
            style={({ pressed }) => [s.primary, pressed && s.pressed]}>
            <Text style={s.primaryText}>{t.openPlay}</Text>
          </Pressable>
        ) : null}
        <Pressable testID="startup-gate-retry" accessibilityRole="button"
          accessibilityLabel={retrying ? t.retrying : view.state === "update-required" ? t.checkAgain : t.retry}
          accessibilityState={{ busy: retrying, disabled: retrying }} disabled={retrying} onPress={retry}
          style={({ pressed }) => [view.state === "update-required" ? s.secondary : s.primary, pressed && s.pressed]}>
          {retrying ? <ActivityIndicator color={view.state === "update-required" ? colors.ivory : colors.charcoal} /> : null}
          <Text style={view.state === "update-required" ? s.secondaryText : s.primaryText}>
            {retrying ? t.retrying : view.state === "update-required" ? t.checkAgain : t.retry}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  ) : null;

  const banner = !blocking && view.state === "offline-grace" ? (
    <SafeAreaView edges={["top"]} style={s.bannerArea}>
      <View testID="startup-gate-offline-banner" accessibilityRole="text" accessibilityLiveRegion="polite" style={s.offlineBanner}>
        <Text style={s.bannerText}>{t.offlineBanner}</Text>
      </View>
    </SafeAreaView>
  ) : !blocking && view.state === "update-reminder" && !reminderDismissed && view.deadline !== null ? (
    <SafeAreaView edges={["top"]} style={s.bannerArea}>
      <View testID="startup-gate-update-reminder" style={s.reminder}>
        <Text style={[s.bannerText, s.flex]}>{t.reminder(formatLocalDate(view.deadline, language))}</Text>
        <Pressable testID="startup-gate-reminder-play" accessibilityRole="button" accessibilityLabel={t.openPlay} onPress={openPlay}
          style={({ pressed }) => [s.smallButton, pressed && s.pressed]}>
          <Text style={s.smallButtonText}>{t.reminderAction}</Text>
        </Pressable>
        <Pressable testID="startup-gate-reminder-dismiss" accessibilityRole="button" accessibilityLabel={t.dismiss}
          onPress={() => setReminderDismissed(true)} hitSlop={8} style={s.close}>
          <Text style={s.closeText}>×</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  ) : null;

  return (
    <View style={s.flex}>
      {banner}
      {appShown ? (
        <View style={s.flex} importantForAccessibility={blocking ? "no-hide-descendants" : "auto"} accessibilityElementsHidden={blocking}>
          {children}
        </View>
      ) : null}
      {fullScreen}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  fullScreen: { backgroundColor: colors.charcoal },
  fullScreenInner: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  title: { color: colors.ivory, fontSize: 28, lineHeight: 34, fontWeight: "500" },
  body: { color: "#E9E2D6", fontSize: 16, lineHeight: 24 },
  primary: {
    minHeight: layout.minimumTouchTarget, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.gold
  },
  primaryText: { color: colors.charcoal, fontSize: 16, fontWeight: "600" },
  secondary: {
    minHeight: layout.minimumTouchTarget, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 20, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.moon
  },
  secondaryText: { color: colors.ivory, fontSize: 16, fontWeight: "500" },
  pressed: { opacity: 0.85 },
  bannerArea: { backgroundColor: colors.charcoal },
  offlineBanner: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.surfaceHigh },
  reminder: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: colors.surfaceHigh, borderBottomWidth: 1, borderBottomColor: "rgba(201, 164, 92, 0.6)"
  },
  bannerText: { color: colors.ivory, fontSize: 13, lineHeight: 18 },
  smallButton: {
    minHeight: layout.minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.gold
  },
  smallButtonText: { color: colors.charcoal, fontSize: 14, fontWeight: "600" },
  close: { minWidth: layout.minimumTouchTarget, minHeight: layout.minimumTouchTarget, justifyContent: "center", alignItems: "center" },
  closeText: { color: colors.moon, fontSize: 22, lineHeight: 24 }
});
