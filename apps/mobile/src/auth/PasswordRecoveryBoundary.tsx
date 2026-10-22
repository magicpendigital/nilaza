import * as SplashScreen from "expo-splash-screen";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ScreenShell, RitualButton, SecondaryButton } from "../a2ui";
import { colors } from "../theme";
import { createPasswordRecovery, isRecoveryUrl } from "./passwordRecovery";

const copy = {
  vi: { title: "Đặt lại mật khẩu", checking: "Đang kiểm tra liên kết…", link: "Liên kết không hợp lệ hoặc đã hết hạn. Quay lại đăng nhập để yêu cầu liên kết mới.", config: "Bản thử này chưa kết nối dịch vụ xác thực.", password: "Mật khẩu mới (ít nhất 12 ký tự)", confirm: "Nhập lại mật khẩu mới", save: "Lưu mật khẩu mới", working: "Đang lưu…", done: "Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.", length: "Mật khẩu cần ít nhất 12 ký tự.", match: "Hai mật khẩu chưa khớp.", failure: "Chưa thể đổi mật khẩu. Kiểm tra kết nối, dùng mật khẩu khác mật khẩu cũ hoặc yêu cầu liên kết mới.", back: "Quay lại ứng dụng" },
  en: { title: "Reset password", checking: "Checking your link…", link: "This link is invalid or expired. Return to sign in to request a new link.", config: "This preview is not connected to authentication.", password: "New password (at least 12 characters)", confirm: "Confirm new password", save: "Save new password", working: "Saving…", done: "Password changed. You can sign in with your new password.", length: "Use at least 12 characters.", match: "Passwords do not match.", failure: "Unable to change password. Check your connection, choose a different password or request a new link.", back: "Return to app" }
};

export function PasswordRecoveryBoundary({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [active, setActive] = useState(false);
  const [locale, setLocale] = useState<"vi" | "en">("vi");
  const [status, setStatus] = useState<keyof typeof copy.vi | "">("checking");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const recovery = useRef<ReturnType<typeof createPasswordRecovery> | null>(null);
  const generation = useRef(0);
  const submitting = useRef(false);
  const t = copy[locale];
  useEffect(() => { if (active) void SplashScreen.hideAsync().catch(() => undefined); }, [active]);
  useEffect(() => {
    let mounted = true;
    const accept = async (url: string | null) => {
      if (!mounted || !url || !isRecoveryUrl(url)) return;
      const current = ++generation.current;
      setActive(true); setReady(false); setStatus("checking"); setPassword(""); setConfirmation("");
      setBusy(false); submitting.current = false;
      if (Platform.OS === "web") window.history.replaceState(null, "", window.location.pathname);
      try {
        const flow = createPasswordRecovery(); recovery.current = flow;
        await flow.accept(url);
        if (mounted && current === generation.current) { setReady(true); setStatus(""); }
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
    return () => { mounted = false; ++generation.current; recovery.current = null; subscription.remove(); };
  }, []);
  const close = () => {
    if (submitting.current) return;
    ++generation.current; recovery.current = null;
    setPassword(""); setConfirmation(""); setActive(false);
  };
  const submit = async () => {
    if (!ready || submitting.current || !recovery.current) return;
    const current = generation.current;
    submitting.current = true; setBusy(true); setStatus("working");
    try {
      await recovery.current.update(password, confirmation);
      if (current !== generation.current) return;
      setPassword(""); setConfirmation(""); setReady(false); setStatus("done");
    } catch (error) {
      if (current !== generation.current) return;
      const key = error instanceof Error ? error.message : "";
      setStatus(key === "length" || key === "match" || key === "link" ? key : "failure");
    } finally {
      if (current === generation.current) { submitting.current = false; setBusy(false); }
    }
  };
  if (initialized && !active) return <>{children}</>;
  return <SafeAreaProvider><SafeAreaView style={styles.fill}><ScreenShell>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text accessibilityRole="header" style={styles.title}>{t.title}</Text>
          <SecondaryButton label={locale === "vi" ? "English" : "Tiếng Việt"} onPress={() => setLocale(locale === "vi" ? "en" : "vi")} />
          <Text accessibilityLiveRegion="polite" style={styles.text}>{status ? t[status] : ""}</Text>
          {ready && <>
            <Text style={styles.text}>{t.password}</Text>
            <TextInput accessibilityLabel={t.password} style={styles.input} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} editable={!busy} />
            <Text style={styles.text}>{t.confirm}</Text>
            <TextInput accessibilityLabel={t.confirm} style={styles.input} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} value={confirmation} onChangeText={setConfirmation} editable={!busy} />
            <RitualButton label={busy ? t.working : t.save} onPress={() => void submit()} disabled={busy} />
          </>}
          {initialized && !busy && <SecondaryButton label={t.back} onPress={close} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </ScreenShell></SafeAreaView></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.charcoal },
  content: { flexGrow: 1, padding: 20, justifyContent: "center" },
  form: { width: "100%", maxWidth: 680, alignSelf: "center", gap: 16 },
  title: { color: colors.ivory, fontSize: 28 },
  text: { color: colors.ivory, fontSize: 16 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, color: colors.ivory, padding: 12, borderRadius: 8, fontSize: 16 }
});
