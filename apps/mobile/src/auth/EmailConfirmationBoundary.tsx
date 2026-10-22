import * as SplashScreen from "expo-splash-screen";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ScreenShell, SecondaryButton } from "../a2ui";
import { colors, typography } from "../theme";
import { isConfirmationUrl, verifyEmailConfirmation } from "./emailConfirmation";

const copy = {
  vi: { title: "Xác nhận email", checking: "Đang kiểm tra liên kết…", done: "Email đã được xác nhận. Quay lại ứng dụng để đăng nhập bằng tài khoản của bạn.", link: "Liên kết không hợp lệ hoặc đã hết hạn. Quay lại ứng dụng để yêu cầu email xác nhận mới.", config: "Bản thử này chưa kết nối dịch vụ xác thực.", back: "Quay lại ứng dụng" },
  en: { title: "Confirm email", checking: "Checking your link…", done: "Email confirmed. Return to the app to sign in with your account.", link: "This link is invalid or expired. Return to the app to request a new confirmation email.", config: "This preview is not connected to authentication.", back: "Return to app" }
};

export function EmailConfirmationBoundary({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [active, setActive] = useState(false);
  const [locale, setLocale] = useState<"vi" | "en">("vi");
  const [status, setStatus] = useState<"checking" | "done" | "link" | "config">("checking");
  const generation = useRef(0);
  const t = copy[locale];
  useEffect(() => { if (active) void SplashScreen.hideAsync().catch(() => undefined); }, [active]);
  useEffect(() => {
    let mounted = true;
    const accept = async (url: string | null) => {
      if (!mounted || !url || !isConfirmationUrl(url)) return;
      const current = ++generation.current;
      setActive(true); setStatus("checking");
      // Remove secrets even for malformed or expired callbacks.
      if (Platform.OS === "web") window.history.replaceState(null, "", window.location.pathname);
      try {
        await verifyEmailConfirmation(url);
        if (mounted && current === generation.current) setStatus("done");
      } catch (error) {
        if (mounted && current === generation.current) setStatus(error instanceof Error && error.message === "config" ? "config" : "link");
      }
    };
    const subscription = Linking.addEventListener("url", event => { void accept(event.url); });
    const initialGeneration = generation.current;
    const initial = Platform.OS === "web" ? Promise.resolve(window.location.href) : Linking.getInitialURL();
    void initial.then(url => { if (generation.current === initialGeneration) return accept(url); })
      .catch(() => { if (mounted) { setActive(true); setStatus("link"); } })
      .finally(() => { if (mounted) setInitialized(true); });
    return () => { mounted = false; ++generation.current; subscription.remove(); };
  }, []);
  if (initialized && !active) return <>{children}</>;
  return <SafeAreaProvider><SafeAreaView style={styles.fill}><ScreenShell>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Text accessibilityRole="header" style={styles.title}>{t.title}</Text>
        <SecondaryButton label={locale === "vi" ? "English" : "Tiếng Việt"} onPress={() => setLocale(locale === "vi" ? "en" : "vi")} />
        <Text accessibilityLiveRegion="polite" style={styles.text}>{t[status]}</Text>
        {initialized && <SecondaryButton label={t.back} onPress={() => { ++generation.current; setActive(false); }} />}
      </View>
    </ScrollView>
  </ScreenShell></SafeAreaView></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.charcoal },
  content: { flexGrow: 1, padding: 20, justifyContent: "center" },
  form: { width: "100%", maxWidth: 680, alignSelf: "center", gap: 16 },
  title: { color: colors.ivory, fontSize: 28, fontFamily: typography.headlineFontFamily },
  text: { color: colors.ivory, fontSize: 16, fontFamily: typography.bodyFontFamily }
});
