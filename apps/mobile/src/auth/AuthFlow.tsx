import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Brand, BrandReveal } from "../a2ui/Brand";
import { brandCopy } from "../brand/copy";
import { getFeatureVisual } from "../visualAssets";
import { languageOptions } from "../i18n";
import { colors, radius, spacing, typography } from "../theme";
import { AuthProvider, AuthView, Language } from "../types";
import { isValidEmail, isValidPassword } from "./localAuth";
import { nilazaLegalUrlFor } from "../runtimeConfig";

declare const require: (path: string) => number;

const welcomeBackground = getFeatureVisual("open-reflection-welcome");


type AuthCopy = {
  welcomePromise: string;
  beginJourney: string;
  returning: string;
  signInHint: string;
  signInTitle: string;
  signInBody: string;
  signUpTitle: string;
  signUpBody: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  createAccount: string;
  continue: string;
  continuing: string;
  creating: string;
  forgotPassword: string;
  forgotPasswordTitle: string;
  forgotPasswordBody: string;
  sendResetLink: string;
  resettingPassword: string;
  or: string;
  orEmail: string;
  newToNilaza: string;
  alreadyHaveProfile: string;
  signIn: string;
  continueWith: string;
  termsLeadContinue: string;
  termsLeadSignUp: string;
  terms: string;
  privacy: string;
  and: string;
  missingName: string;
  invalidEmail: string;
  shortPassword: string;
  resetPasswordEmailRequired: string;
  resetPasswordSent: string;
  comingSoon: string;
  adultConfirm: string;
  adultRequired: string;
  confirmationTitle: string;
  confirmationBody: (email: string) => string;
  resendConfirmation: string;
  resendingConfirmation: string;
  confirmationResent: string;
  confirmationResendError: string;
  continueToSignIn: string;
  back: string;
};

const authCopy: Record<"vi" | "en", AuthCopy> = {
  vi: {
    welcomePromise: "Hành trình qua trí tuệ cổ xưa và những chiêm nghiệm hiện đại của bạn bắt đầu từ đây.",
    beginJourney: "Bắt đầu hành trình",
    returning: "Tôi đã từng ở đây",
    signInHint: "Đăng nhập",
    signInTitle: "Chào mừng trở lại",
    signInBody: "Nhật ký, lá số và các trải bài đã lưu vẫn chờ bạn.",
    signUpTitle: "Tạo hồ sơ của bạn",
    signUpBody: "Bắt đầu hành trình khám phá bản thân.",
    name: "Tên",
    namePlaceholder: "Người lữ hành",
    email: "Email",
    emailPlaceholder: "ban@example.com",
    password: "Mật khẩu",
    createAccount: "Tạo tài khoản",
    continue: "Tiếp tục",
    continuing: "Đang tiếp tục...",
    creating: "Đang tạo hồ sơ...",
    forgotPassword: "Quên mật khẩu?",
    forgotPasswordTitle: "Đặt lại mật khẩu",
    forgotPasswordBody: "Nhập email để Nilaza gửi cho bạn liên kết đặt lại mật khẩu.",
    sendResetLink: "Gửi liên kết đặt lại mật khẩu",
    resettingPassword: "Đang gửi...",
    or: "HOẶC",
    orEmail: "HOẶC EMAIL",
    newToNilaza: "Chưa có tài khoản?",
    alreadyHaveProfile: "Đã có tài khoản?",
    signIn: "Đăng nhập",
    continueWith: "Tiếp tục với",
    termsLeadContinue: "Tiếp tục nghĩa là bạn từ 18 tuổi và đồng ý với",
    termsLeadSignUp: "Khi đăng ký, bạn đồng ý với",
    terms: "Điều khoản",
    privacy: "Chính sách riêng tư",
    and: "và",
    missingName: "Hãy nhập tên bạn muốn Nilaza gọi.",
    invalidEmail: "Hãy nhập một địa chỉ email hợp lệ.",
    shortPassword: "Mật khẩu cần có ít nhất 8 ký tự.",
    resetPasswordEmailRequired: "Nhập email của bạn để Nilaza gửi liên kết đặt lại mật khẩu.",
    resetPasswordSent: "Nếu email này có tài khoản Nilaza, liên kết đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn.",
    comingSoon: "Sắp ra mắt",
    adultConfirm: "Tôi xác nhận mình từ 18 tuổi trở lên.",
    adultRequired: "Nilaza dành cho người từ 18 tuổi trở lên. Hãy xác nhận để tạo tài khoản.",
    confirmationTitle: "Kiểm tra email của bạn",
    confirmationBody: (email) => `Nếu ${email} chưa có tài khoản được xác nhận, bạn sẽ nhận được liên kết xác nhận. Hãy kiểm tra hộp thư và mục Spam. Nếu đã xác nhận tài khoản, hãy đăng nhập hoặc đặt lại mật khẩu bên dưới.`,
    resendConfirmation: "Gửi lại email xác nhận",
    resendingConfirmation: "Đang gửi lại...",
    confirmationResent: "Đã nhận yêu cầu gửi lại. Thư xác nhận chỉ được gửi nếu tài khoản còn chờ xác nhận email.",
    confirmationResendError: "Không thể gửi lại email lúc này. Hãy thử lại sau ít phút.",
    continueToSignIn: "Quay lại đăng nhập",
    back: "Quay lại"
  },
  en: {
    welcomePromise: "Your journey through ancient wisdom and modern reflection begins here.",
    beginJourney: "Begin Your Journey",
    returning: "I Have Been Here Before",
    signInHint: "Sign In",
    signInTitle: "Welcome back",
    signInBody: "Your Journal, charts and saved readings are waiting for you.",
    signUpTitle: "Create Your Profile",
    signUpBody: "Begin your journey of self-discovery.",
    name: "Name",
    namePlaceholder: "Celestial Wanderer",
    email: "Email Address",
    emailPlaceholder: "your@essence.com",
    password: "Password",
    createAccount: "Create Account",
    continue: "Continue",
    continuing: "Continuing...",
    creating: "Creating profile...",
    forgotPassword: "Forgot password?",
    forgotPasswordTitle: "Reset your password",
    forgotPasswordBody: "Enter your email and Nilaza will send you a password reset link.",
    sendResetLink: "Send reset link",
    resettingPassword: "Sending...",
    or: "OR",
    orEmail: "OR EMAIL",
    newToNilaza: "New to Nilaza?",
    alreadyHaveProfile: "Already have an account?",
    signIn: "Sign In",
    continueWith: "Continue with",
    termsLeadContinue: "By continuing, you confirm you are 18 or older and agree to our",
    termsLeadSignUp: "By signing up, you agree to our",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    and: "and",
    missingName: "Enter the name you would like Nilaza to use.",
    invalidEmail: "Enter a valid email address.",
    shortPassword: "Password must be at least 8 characters.",
    resetPasswordEmailRequired: "Enter your email so Nilaza can send a password reset link.",
    resetPasswordSent: "If this email has a Nilaza account, a password reset link will be sent to your inbox.",
    comingSoon: "Coming soon",
    adultConfirm: "I confirm that I am 18 or older.",
    adultRequired: "Nilaza is for people aged 18 and over. Please confirm to create an account.",
    confirmationTitle: "Check your email",
    confirmationBody: (email) => `If ${email} does not already have a confirmed account, you will receive a confirmation link. Check your inbox and spam folder. If you have already confirmed your account, sign in or reset your password below.`,
    resendConfirmation: "Resend confirmation email",
    resendingConfirmation: "Resending...",
    confirmationResent: "Resend request received. A confirmation email is only sent if the account is still awaiting email confirmation.",
    confirmationResendError: "We could not resend the email right now. Please try again in a few minutes.",
    continueToSignIn: "Return to sign in",
    back: "Go back"
  }
};

// No social provider completes sign-in yet. Buttons appear only for providers
// marked as signing in, so a reviewer never meets a control that does nothing.
const providers: Array<{ id: Exclude<AuthProvider, "email" | "legacy-local">; label: string; icon: any; enabled: boolean; signsIn: boolean }> = [
  { id: "apple", label: "Apple", icon: "logo-apple", enabled: true, signsIn: false },
  { id: "google", label: "Google", icon: "logo-google", enabled: true, signsIn: false },
  { id: "facebook", label: "Facebook", icon: "logo-facebook", enabled: false, signsIn: false },
  { id: "x", label: "X", icon: "logo-twitter", enabled: false, signsIn: false }
];
const signInProviders = providers.filter((provider) => provider.signsIn);

export type SignUpOutcome = "pending-email-confirmation" | void;

export type AuthFlowProps = {
  view: AuthView;
  language: Language;
  onViewChange: (view: AuthView) => void;
  onLanguageChange: (language: Language) => void;
  onSignIn: (email: string, password: string) => Promise<void> | void;
  onSignUp: (name: string, email: string, password: string) => Promise<SignUpOutcome> | SignUpOutcome;
  onResendConfirmation?: (email: string) => Promise<void> | void;
  onForgotPassword: (email: string) => Promise<void> | void;
  onContinueAsGuest?: () => void;
  /** Opens the static guest preview (78 cards, 12 signs) without an account. */
  onPreview?: () => void;
};

function useEntrance(view: AuthView) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(14);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 520, useNativeDriver: true })
    ]).start();
  }, [opacity, translateY, view]);

  return { opacity, transform: [{ translateY }] };
}

function LanguageMenu({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  const [open, setOpen] = useState(false);
  const currentLanguage = languageOptions.find((item) => item.code === language) ?? languageOptions[0];
  const comingSoon = language === "vi" ? "Sắp ra mắt" : "Coming soon";

  return (
    <View style={styles.languageMenu}>
      <Pressable
        accessibilityLabel={language === "vi" ? `Ngôn ngữ: ${currentLanguage.viLabel}` : `Language: ${currentLanguage.label}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.languageTrigger, pressed && styles.controlPressed]}
      >
        <LanguageFlag code={currentLanguage.code} />
        <Text numberOfLines={1} style={styles.languageTriggerText}>{currentLanguage.nativeLabel}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={colors.moon} style={styles.languageTriggerChevron} />
      </Pressable>

      {open ? (
        <View accessibilityLabel={language === "vi" ? "Lựa chọn ngôn ngữ" : "Language options"} style={styles.languageDropdown}>
          {languageOptions.map((item) => (
            <Pressable
              key={item.code}
              accessibilityLabel={`${language === "vi" ? item.viLabel : item.label}${item.enabled ? "" : `, ${comingSoon}`}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !item.enabled, selected: language === item.code }}
              disabled={!item.enabled}
              onPress={() => {
                onChange(item.code);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.languageDropdownItem,
                language === item.code && styles.languageDropdownItemActive,
                !item.enabled && styles.languageDropdownItemDisabled,
                pressed && item.enabled && styles.controlPressed
              ]}
            >
              <LanguageFlag code={item.code} disabled={!item.enabled} />
              <View style={styles.languageDropdownLabel}>
                <Text style={[styles.languageNativeText, !item.enabled && styles.languageDisabledText]}>{item.nativeLabel}</Text>
                <Text style={[styles.languageEnglishText, !item.enabled && styles.languageDisabledText]}>{language === "vi" ? item.viLabel : item.label}</Text>
              </View>
              {item.enabled ? (
                language === item.code ? <Ionicons name="checkmark" size={18} color={colors.gold} /> : null
              ) : (
                <Text style={styles.languageSoonText}>{comingSoon}</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function LanguageFlag({ code, disabled = false }: { code: Language; disabled?: boolean }) {
  if (code === "en") {
    return (
      <View style={[styles.languageFlag, disabled && styles.languageFlagDisabled]}>
        <Ionicons name="globe-outline" size={16} color={colors.gold} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.languageFlag,
        code === "vi" && styles.languageFlagVi,
        code === "zh-Hans" && styles.languageFlagZh,
        code === "ja" && styles.languageFlagJa,
        code === "ko" && styles.languageFlagKo,
        disabled && styles.languageFlagDisabled
      ]}
    >
      {code === "vi" ? <Ionicons name="star" size={11} color="#F8D34A" /> : null}
      {code === "zh-Hans" ? <Ionicons name="star" size={9} color="#F8D34A" /> : null}
      {code === "ja" ? <View style={styles.languageFlagDot} /> : null}
      {code === "ko" ? <View style={styles.languageFlagHalfDot} /> : null}
    </View>
  );
}

function SocialButton({ provider, copy, onPress, compact = false }: { provider: typeof providers[number]; copy: AuthCopy; onPress: () => void; compact?: boolean }) {
  const disabled = !provider.enabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.continueWith} ${provider.label}${disabled ? `, ${copy.comingSoon}` : ""}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.socialButton, compact && styles.socialButtonCompact, disabled && styles.socialButtonDisabled, pressed && !disabled && styles.controlPressed]}
    >
      <Ionicons name={provider.icon} size={23} color={disabled ? colors.outline : colors.onSurface} />
      <Text numberOfLines={1} style={[styles.socialButtonText, compact && styles.socialButtonTextCompact, disabled && styles.socialButtonTextDisabled]}>{compact ? provider.label : `${copy.continueWith} ${provider.label}`}</Text>
      {disabled && !compact ? <Text style={styles.socialButtonBadge}>{copy.comingSoon}</Text> : null}
    </Pressable>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function LegalCopy({ copy, signUp, onOpen }: { copy: AuthCopy; signUp: boolean; onOpen: (page: "terms" | "privacy") => void }) {
  return (
    <Text style={styles.legalText}>
      {signUp ? copy.termsLeadSignUp : copy.termsLeadContinue}{" "}
      <Text accessibilityRole="link" onPress={() => onOpen("terms")} style={styles.legalLink}>{copy.terms}</Text>{" "}
      {copy.and}{" "}
      <Text accessibilityRole="link" onPress={() => onOpen("privacy")} style={styles.legalLink}>{copy.privacy}</Text>.
    </Text>
  );
}

export function AuthFlow({
  view,
  language,
  onViewChange,
  onLanguageChange,
  onSignIn,
  onSignUp,
  onResendConfirmation,
  onForgotPassword,
  onContinueAsGuest,
  onPreview
}: AuthFlowProps) {
  const copy = authCopy[language === "vi" ? "vi" : "en"];
  const entranceStyle = useEntrance(view);
  const identity = brandCopy(language);
  const welcomeAnimated = useRef(false);
  const animateWelcome = view === "welcome" && !welcomeAnimated.current;
  useEffect(() => { if (view === "welcome") welcomeAnimated.current = true; }, [view]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState("");
  const [confirmationResent, setConfirmationResent] = useState(false);
  const [confirmationResendSubmitting, setConfirmationResendSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const mountedRef = useRef(true);
  const intentGeneration = useRef(0);
  const operationPhase = useRef<"delay" | "network" | null>(null);
  const signUp = view === "sign-up";
  const forgotPassword = view === "forgot-password";
  const invalidSignupEmail = signUp && !!email.trim() && !isValidEmail(email);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      intentGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    intentGeneration.current += 1;
    operationPhase.current = null;
  }, [view]);
  const currentIntent = (generation: number) => mountedRef.current && intentGeneration.current === generation;

  const changeView = (nextView: AuthView) => {
    // A started auth request can adopt a session. Keep its visible form until
    // it settles; a not-yet-started UI delay can safely be cancelled instead.
    if (operationPhase.current === "network") return;
    intentGeneration.current += 1;
    operationPhase.current = null;
    setError("");
    setPreviewMessage("");
    setPendingConfirmationEmail("");
    setConfirmationResent(false);
    setConfirmationResendSubmitting(false);
    setSubmitting(false);
    setResetSubmitting(false);
    if (nextView === "sign-in" || nextView === "forgot-password") setEmail(email.trim());
    if (nextView === "forgot-password") {
      setPassword("");
      setPasswordVisible(false);
    }
    onViewChange(nextView);
  };

  const showPreview = (message: string) => {
    setError("");
    setPreviewMessage(message);
  };

  const submitSignIn = async () => {
    if (operationPhase.current) return;
    if (!isValidEmail(email)) {
      setError(copy.invalidEmail);
      return;
    }
    if (!isValidPassword(password)) {
      setError(copy.shortPassword);
      return;
    }
    setError("");
    setPreviewMessage("");
    setSubmitting(true);
    const generation = ++intentGeneration.current;
    operationPhase.current = "delay";
    try {
      await new Promise((resolve) => setTimeout(resolve, 360));
      if (!currentIntent(generation)) return;
      operationPhase.current = "network";
      await onSignIn(email.trim(), password);
    } catch (submissionError) {
      if (currentIntent(generation)) setError(submissionError instanceof Error && submissionError.message ? submissionError.message : copy.invalidEmail);
    } finally {
      if (currentIntent(generation)) { operationPhase.current = null; setSubmitting(false); }
    }
  };

  const requestPasswordReset = async () => {
    if (operationPhase.current) return;
    if (!email.trim()) {
      setPreviewMessage("");
      setError(copy.resetPasswordEmailRequired);
      return;
    }
    if (!isValidEmail(email)) {
      setPreviewMessage("");
      setError(copy.invalidEmail);
      return;
    }
    setError("");
    setPreviewMessage("");
    setResetSubmitting(true);
    const generation = ++intentGeneration.current;
    operationPhase.current = "network";
    try {
      await onForgotPassword(email.trim());
      if (currentIntent(generation)) setPreviewMessage(copy.resetPasswordSent);
    } catch (submissionError) {
      if (currentIntent(generation)) setError(submissionError instanceof Error && submissionError.message ? submissionError.message : copy.invalidEmail);
    } finally {
      if (currentIntent(generation)) { operationPhase.current = null; setResetSubmitting(false); }
    }
  };

  const submitSignUp = async () => {
    if (operationPhase.current) return;
    if (!name.trim()) {
      setError(copy.missingName);
      return;
    }
    if (!isValidEmail(email)) {
      setError(copy.invalidEmail);
      return;
    }
    if (!isValidPassword(password)) {
      setError(copy.shortPassword);
      return;
    }
    if (!adultConfirmed) {
      setError(copy.adultRequired);
      return;
    }
    setError("");
    setPreviewMessage("");
    setSubmitting(true);
    const generation = ++intentGeneration.current;
    operationPhase.current = "delay";
    try {
      await new Promise((resolve) => setTimeout(resolve, 420));
      if (!currentIntent(generation)) return;
      operationPhase.current = "network";
      const outcome = await onSignUp(name.trim(), email.trim(), password);
      if (currentIntent(generation) && outcome === "pending-email-confirmation") {
        setPendingConfirmationEmail(email.trim());
        setPassword("");
        setPasswordVisible(false);
        setConfirmationResent(false);
      }
    } catch (submissionError) {
      if (currentIntent(generation)) setError(submissionError instanceof Error && submissionError.message ? submissionError.message : copy.invalidEmail);
    } finally {
      if (currentIntent(generation)) { operationPhase.current = null; setSubmitting(false); }
    }
  };

  const resendConfirmation = async () => {
    if (operationPhase.current) return;
    if (!pendingConfirmationEmail || !onResendConfirmation) return;
    setError("");
    setConfirmationResent(false);
    setConfirmationResendSubmitting(true);
    const generation = ++intentGeneration.current;
    operationPhase.current = "network";
    try {
      await onResendConfirmation(pendingConfirmationEmail);
      if (currentIntent(generation)) setConfirmationResent(true);
    } catch (submissionError) {
      if (currentIntent(generation)) setError(submissionError instanceof Error && submissionError.message ? submissionError.message : copy.confirmationResendError);
    } finally {
      if (currentIntent(generation)) { operationPhase.current = null; setConfirmationResendSubmitting(false); }
    }
  };

  if (view === "welcome") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.welcomeBackground}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={welcomeBackground}
            style={[styles.welcomeBackgroundImage, Platform.OS === "web" && ({ objectPosition: "center center" } as any)]}
            testID="welcome-background"
          />
          <View style={styles.welcomeScrim} />
          <LanguageMenu language={language} onChange={onLanguageChange} />
          <ScrollView contentContainerStyle={styles.welcomeCanvas}>
            <View style={styles.welcomeHero}>
              <BrandReveal width={72} animate={animateWelcome} />
              <Image source={require("../../assets/runtime/brand/open-reflection-v1/logo/wordmark-ivory.png")} resizeMode="contain" style={{ width: 210, height: 52, marginTop: 12 }} accessible={false} />
              <Text style={styles.welcomePromise}>{identity.tagline}</Text>
              <Text style={styles.welcomeIntro}>{identity.intro}</Text>
            </View>
            <View style={styles.welcomeActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onContinueAsGuest ? onContinueAsGuest() : changeView("sign-up")}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.controlPressed]}
              >
                <Text style={styles.primaryButtonText}>{onContinueAsGuest ? copy.beginJourney : identity.createAccount}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => changeView("sign-in")}
                style={({ pressed }) => [styles.welcomeSecondaryButton, pressed && styles.controlPressed]}
              >
                <Text style={styles.welcomeSecondaryText}>{identity.signIn}</Text>
              </Pressable>
              {onPreview ? (
                <Pressable accessibilityRole="button" onPress={onPreview} style={({ pressed }) => [styles.welcomePreviewButton, pressed && styles.controlPressed]}>
                  <Text style={styles.welcomePreviewText}>{language === "vi" ? "Xem thử không cần tài khoản" : "Look around without an account"}</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {!forgotPassword && !pendingConfirmationEmail ? (
        // Same menu as the welcome screen, so people can switch before signing up or in.
        <LanguageMenu language={language} onChange={onLanguageChange} />
      ) : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.formScroll, !signUp && styles.signInScroll]}
        >
          <Animated.View style={[styles.formCanvas, entranceStyle]}>
            {signUp || forgotPassword ? (
              <View style={styles.formTopBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.back}
                  hitSlop={10}
                  onPress={() => changeView(forgotPassword ? "sign-in" : "welcome")}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={28} color={colors.onSurface} />
                </Pressable>
                <Brand width={40} />
                <View style={styles.backButton} />
              </View>
            ) : null}

            {!pendingConfirmationEmail ? (
              <View style={[styles.formHeader, signUp && styles.signUpHeader, forgotPassword && styles.forgotPasswordHeader]}>
                <Text style={[styles.formTitle, signUp && styles.signUpTitle]}>{signUp ? copy.signUpTitle : forgotPassword ? copy.forgotPasswordTitle : copy.signInTitle}</Text>
                <Text style={[styles.formBody, signUp && styles.formBodyItalic]}>{signUp ? copy.signUpBody : forgotPassword ? copy.forgotPasswordBody : copy.signInBody}</Text>
              </View>
            ) : null}

            {signUp ? (
              pendingConfirmationEmail ? (
                <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.confirmationState}>
                  <View style={styles.confirmationIcon}>
                    <Ionicons name="mail-open-outline" size={28} color={colors.gold} />
                  </View>
                  <Text style={styles.confirmationTitle}>{copy.confirmationTitle}</Text>
                  <Text style={styles.confirmationBody}>{copy.confirmationBody(pendingConfirmationEmail)}</Text>
                  {onResendConfirmation ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={confirmationResendSubmitting}
                      onPress={() => void resendConfirmation()}
                      style={({ pressed }) => [styles.confirmationSecondaryButton, (pressed || confirmationResendSubmitting) && styles.controlPressed]}
                    >
                      <Text style={styles.confirmationSecondaryText}>{confirmationResendSubmitting ? copy.resendingConfirmation : copy.resendConfirmation}</Text>
                    </Pressable>
                  ) : null}
                  {confirmationResent ? <Text style={styles.confirmationSuccess}>{copy.confirmationResent}</Text> : null}
                  {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={confirmationResendSubmitting}
                    onPress={() => changeView("sign-in")}
                    style={({ pressed }) => [styles.confirmationPrimaryButton, (pressed || confirmationResendSubmitting) && styles.controlPressed]}
                  >
                    <Text style={styles.confirmationPrimaryText}>{copy.continueToSignIn}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={confirmationResendSubmitting}
                    onPress={() => changeView("forgot-password")}
                    style={({ pressed }) => [styles.confirmationSecondaryButton, (pressed || confirmationResendSubmitting) && styles.controlPressed]}
                  >
                    <Text style={styles.confirmationSecondaryText}>{copy.forgotPassword}</Text>
                  </Pressable>
                </View>
              ) : (
              <View style={styles.fields}>
                <FieldLabel label={copy.name} />
                <TextInput
                  accessibilityLabel={copy.name}
                  autoCapitalize="words"
                  onChangeText={(value) => { setName(value); setError(""); }}
                  placeholder={copy.namePlaceholder}
                  placeholderTextColor="rgba(168,163,160,0.48)"
                  style={[styles.input, styles.signUpInput]}
                  value={name}
                />
                <FieldLabel label={copy.email} />
                <TextInput
                  accessibilityLabel={copy.email}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={(value) => { setEmail(value); setError(""); }}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor="rgba(168,163,160,0.48)"
                  style={[styles.input, styles.signUpInput]}
                  value={email}
                />
                {invalidSignupEmail && error !== copy.invalidEmail ? (
                  <Text accessibilityLiveRegion="polite" style={styles.errorText}>{copy.invalidEmail}</Text>
                ) : null}
                <FieldLabel label={copy.password} />
                <View style={styles.passwordField}>
                  <TextInput
                    accessibilityLabel={copy.password}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    onChangeText={(value) => { setPassword(value); setError(""); }}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(168,163,160,0.48)"
                    secureTextEntry={!passwordVisible}
                    style={[styles.input, styles.signUpInput, styles.passwordInput]}
                    value={password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={passwordVisible ? (language === "vi" ? "Ẩn mật khẩu" : "Hide password") : (language === "vi" ? "Hiện mật khẩu" : "Show password")}
                    hitSlop={10}
                    onPress={() => setPasswordVisible((current) => !current)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.moon} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={copy.adultConfirm}
                  accessibilityState={{ checked: adultConfirmed }}
                  onPress={() => { setAdultConfirmed((current) => !current); setError(""); }}
                  style={({ pressed }) => [styles.adultConfirmRow, pressed && styles.controlPressed]}
                >
                  <Ionicons name={adultConfirmed ? "checkbox" : "square-outline"} size={22} color={adultConfirmed ? colors.gold : colors.moon} />
                  <Text style={styles.adultConfirmText}>{copy.adultConfirm}</Text>
                </Pressable>
                {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={() => void submitSignUp()}
                  style={({ pressed }) => [styles.primaryButton, styles.formPrimaryButton, (pressed || submitting) && styles.controlPressed]}
                >
                  <Text style={styles.primaryButtonText}>{submitting ? copy.creating : copy.createAccount}</Text>
                </Pressable>
                <View style={styles.emailSignInRow}>
                  <Text style={styles.switchAuthText}>{copy.alreadyHaveProfile}</Text>
                  <Pressable accessibilityRole="link" onPress={() => changeView("sign-in")} hitSlop={8} style={styles.emailSignInLink}>
                    <Text style={styles.switchAuthLink}>{copy.signIn}</Text>
                  </Pressable>
                </View>
              </View>
              )
            ) : null}

            {!signUp && !forgotPassword ? (
              <View style={styles.authMethods}>
                {signInProviders.length ? (
                  <>
                    <View style={styles.socialGrid}>
                      {signInProviders.map((provider) => (
                        <SocialButton key={provider.id} provider={provider} compact copy={copy} onPress={() => showPreview(copy.comingSoon)} />
                      ))}
                    </View>
                    <Divider label={copy.orEmail} />
                  </>
                ) : null}
                <FieldLabel label={copy.email} />
                <TextInput
                  accessibilityLabel={copy.email}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={(value) => { setEmail(value); setError(""); }}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(168,163,160,0.55)"
                  style={[styles.input, styles.signInInput]}
                  value={email}
                />
                <FieldLabel label={copy.password} />
                <View style={styles.passwordField}>
                  <TextInput
                    accessibilityLabel={copy.password}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    onChangeText={(value) => { setPassword(value); setError(""); }}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(168,163,160,0.55)"
                    secureTextEntry={!passwordVisible}
                    style={[styles.input, styles.signInInput, styles.passwordInput]}
                    value={password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={passwordVisible ? (language === "vi" ? "Ẩn mật khẩu" : "Hide password") : (language === "vi" ? "Hiện mật khẩu" : "Show password")}
                    hitSlop={10}
                    onPress={() => setPasswordVisible((current) => !current)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.moon} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="link"
                  hitSlop={8}
                  onPress={() => changeView("forgot-password")}
                  style={({ pressed }) => [styles.forgotPasswordLink, pressed && styles.controlPressed]}
                >
                  <Text style={styles.forgotPasswordText}>{copy.forgotPassword}</Text>
                </Pressable>
                {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={() => void submitSignIn()}
                  style={({ pressed }) => [styles.primaryButton, styles.signInPrimary, (pressed || submitting) && styles.controlPressed]}
                >
                  <Text style={styles.signInPrimaryText}>{submitting ? copy.continuing : copy.signIn}</Text>
                </Pressable>
                <View style={styles.switchAuthRow}>
                  <Text style={styles.switchAuthText}>{copy.newToNilaza}</Text>
                  <Pressable accessibilityRole="link" onPress={() => changeView("sign-up")} hitSlop={8}>
                    <Text style={styles.switchAuthLink}>{copy.createAccount}</Text>
                  </Pressable>
                </View>
              </View>
            ) : forgotPassword ? (
              <View style={styles.fields}>
                <FieldLabel label={copy.email} />
                <TextInput
                  accessibilityLabel={copy.email}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={(value) => { setEmail(value); setError(""); setPreviewMessage(""); }}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor="rgba(168,163,160,0.55)"
                  style={[styles.input, styles.signInInput]}
                  value={email}
                />
                {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={resetSubmitting}
                  onPress={() => void requestPasswordReset()}
                  style={({ pressed }) => [styles.primaryButton, styles.signInPrimary, (pressed || resetSubmitting) && styles.controlPressed]}
                >
                  <Text style={styles.signInPrimaryText}>{resetSubmitting ? copy.resettingPassword : copy.sendResetLink}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => changeView("sign-in")}
                  style={({ pressed }) => [styles.forgotBackButton, pressed && styles.controlPressed]}
                >
                  <Text style={styles.forgotBackText}>{copy.continueToSignIn}</Text>
                </Pressable>
              </View>
            ) : pendingConfirmationEmail || !signInProviders.length ? null : (
              <>
                <Divider label={copy.or} />
                <View style={styles.socialGrid}>
                  {signInProviders.map((provider) => (
                    <SocialButton key={provider.id} provider={provider} compact copy={copy} onPress={() => showPreview(copy.comingSoon)} />
                  ))}
                </View>
              </>
            )}

            {previewMessage ? (
              <View accessibilityRole="alert" style={styles.previewPanel}>
                <Ionicons name="information-circle-outline" size={18} color={colors.gold} />
                <Text style={styles.previewText}>{previewMessage}</Text>
              </View>
            ) : null}

            {!pendingConfirmationEmail && !forgotPassword ? (
              <View style={[styles.legalArea, signUp && styles.signUpLegalArea]}>
                <LegalCopy copy={copy} signUp={signUp} onOpen={(page) => { void Linking.openURL(nilazaLegalUrlFor(page, language)).catch(() => undefined); }} />
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

const styles = StyleSheet.create({
  adultConfirmRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 48
  },
  adultConfirmText: {
    color: colors.onSurface,
    flex: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 20
  },
  emailSignInRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  emailSignInLink: {
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm
  },
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
    width: "100%"
  },
  flex: {
    flex: 1
  },
  welcomeBackground: {
    backgroundColor: colors.surfaceLowest,
    flex: 1,
    overflow: "hidden",
    width: "100%"
  },
  welcomeBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    opacity: 0.65,
    width: "100%"
  },
  welcomeScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(21, 20, 22, 0.12)"
  },
  languageMenu: {
    alignSelf: "flex-end",
    marginRight: spacing.screen,
    marginTop: spacing.sm,
    position: "relative",
    width: 176,
    zIndex: 4
  },
  languageTrigger: {
    alignItems: "center",
    backgroundColor: "rgba(29, 27, 25, 0.92)",
    borderColor: colors.outlineVariant,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 11
  },
  languageTriggerText: {
    color: colors.onSurface,
    flex: 1,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12,
    marginLeft: 4,
    marginRight: 8
  },
  languageTriggerChevron: {
    marginLeft: 4
  },
  languageFlag: {
    alignItems: "center",
    backgroundColor: "rgba(16, 14, 12, 0.72)",
    borderColor: "rgba(247, 241, 230, 0.22)",
    borderRadius: 5,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    overflow: "hidden",
    width: 32
  },
  languageFlagVi: {
    backgroundColor: "#C9282D"
  },
  languageFlagZh: {
    alignItems: "flex-start",
    backgroundColor: "#D62828",
    paddingLeft: 6
  },
  languageFlagJa: {
    backgroundColor: "#F7F1E6"
  },
  languageFlagKo: {
    backgroundColor: "#F7F1E6"
  },
  languageFlagDot: {
    backgroundColor: "#C9282D",
    borderRadius: 999,
    height: 12,
    width: 12
  },
  languageFlagHalfDot: {
    backgroundColor: "#C9282D",
    borderColor: "#0E5A5A",
    borderRadius: 999,
    borderTopWidth: 6,
    height: 14,
    width: 14
  },
  languageFlagDisabled: {
    opacity: 0.7
  },
  languageDropdown: {
    backgroundColor: "rgba(29, 27, 25, 0.98)",
    borderColor: colors.outlineVariant,
    borderRadius: radius.control,
    borderWidth: 1,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 46,
    width: 224
  },
  languageDropdownItem: {
    alignItems: "center",
    borderBottomColor: "rgba(72,70,74,0.42)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  languageDropdownItemActive: {
    backgroundColor: "rgba(201,164,92,0.10)"
  },
  languageDropdownItemDisabled: {
    backgroundColor: "rgba(21,20,22,0.32)"
  },
  languageDropdownLabel: {
    flex: 1,
    marginLeft: 10
  },
  languageNativeText: {
    color: colors.onSurface,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  languageEnglishText: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 11,
    marginTop: 2
  },
  languageDisabledText: {
    color: "rgba(168,163,160,0.55)"
  },
  languageSoonText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 9,
    letterSpacing: 0.5,
    marginLeft: 12,
    textTransform: "uppercase"
  },
  welcomeCanvas: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    justifyContent: "space-between",
    paddingBottom: 36,
    paddingHorizontal: spacing.screen
  },
  welcomeHero: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 34,
    paddingTop: 260
  },
  welcomeLogo: {
    height: 72,
    marginBottom: 22,
    width: 72
  },
  wordmark: {
    color: "#E8C176",
    fontFamily: typography.headlineFontFamily,
    fontSize: 43,
    letterSpacing: 7,
    lineHeight: 52
  },
  welcomePromise: {
    color: colors.onSurface,
    fontFamily: typography.headlineFontFamily,
    fontSize: 23,
    lineHeight: 32,
    marginTop: 24,
    maxWidth: 320,
    textAlign: "center"
  },
  welcomeIntro: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24, textAlign: "center", maxWidth: 340, marginTop: 16 },
  welcomeActions: {
    alignSelf: "center",
    maxWidth: 440,
    width: "100%"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderRadius: radius.control,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.surfaceLowest,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14,
    letterSpacing: 2.3,
    textAlign: "center",
    textTransform: "uppercase"
  },
  controlPressed: {
    opacity: 0.68,
    transform: [{ scale: 0.99 }]
  },
  welcomeSecondaryButton: {
    alignItems: "center",
    borderColor: colors.outlineVariant,
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12
  },
  welcomeSecondaryText: {
    color: "#E8C176",
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13,
    letterSpacing: 1.7,
    textAlign: "center",
    textTransform: "uppercase"
  },
  welcomePreviewButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 48
  },
  welcomePreviewText: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    textDecorationLine: "underline"
  },
  signInHint: {
    color: colors.outline,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 6,
    textTransform: "uppercase"
  },
  formScroll: {
    flexGrow: 1,
    paddingBottom: 44,
    paddingHorizontal: spacing.screen
  },
  signInScroll: {
    justifyContent: "center"
  },
  formCanvas: {
    alignSelf: "center",
    maxWidth: 440,
    width: "100%"
  },
  formTopBar: {
    alignItems: "center",
    borderBottomColor: "rgba(72,70,74,0.24)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -spacing.screen,
    minHeight: 64,
    paddingHorizontal: spacing.md
  },
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  topBarLogo: {
    height: 34,
    width: 34
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 42
  },
  signUpHeader: {
    marginBottom: 30,
    paddingTop: 40
  },
  forgotPasswordHeader: {
    marginBottom: 30,
    paddingTop: 34
  },
  formTitle: {
    color: "#E8C176",
    fontFamily: typography.headlineFontFamily,
    fontSize: 46,
    lineHeight: 54,
    textAlign: "center"
  },
  signUpTitle: {
    color: colors.onSurface,
    fontSize: 34,
    lineHeight: 42
  },
  formBody: {
    color: colors.onSurfaceVariant,
    fontFamily: typography.bodyFontFamily,
    fontSize: 17,
    lineHeight: 25,
    marginTop: spacing.md,
    maxWidth: 360,
    textAlign: "center"
  },
  formBodyItalic: {
    fontFamily: typography.bodyItalicFontFamily,
    fontSize: 16
  },
  fields: {
    width: "100%"
  },
  fieldLabel: {
    color: colors.moon,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12,
    letterSpacing: 1.4,
    marginBottom: 9,
    marginLeft: 4,
    marginTop: spacing.md,
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.onSurface,
    fontFamily: typography.bodyFontFamily,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 14
  },
  signUpInput: {
    backgroundColor: colors.ivory,
    borderColor: colors.outline,
    color: colors.surfaceContainer
  },
  passwordField: {
    position: "relative"
  },
  passwordInput: {
    paddingRight: 52,
    width: "100%"
  },
  passwordToggle: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 0,
    width: 46
  },
  errorText: {
    color: "#FFB4AB",
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm
  },
  formPrimaryButton: {
    marginTop: 22
  },
  authMethods: {
    width: "100%"
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between"
  },
  socialStack: {
    gap: spacing.md
  },
  socialStackCompact: {
    gap: 10
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: "rgba(33,31,29,0.72)",
    borderColor: "rgba(72,70,74,0.72)",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: 12
  },
  socialButtonCompact: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 48,
    paddingHorizontal: 10
  },
  socialButtonDisabled: {
    backgroundColor: "rgba(33,31,29,0.38)",
    borderColor: "rgba(72,70,74,0.42)"
  },
  socialButtonText: {
    color: colors.onSurface,
    fontFamily: typography.bodyMediumFontFamily,
    flex: 1,
    fontSize: 16,
    textAlign: "center"
  },
  socialButtonTextCompact: {
    flex: 0,
    fontSize: 14
  },
  socialButtonTextDisabled: {
    color: colors.outline
  },
  socialButtonBadge: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 9,
    letterSpacing: 0.45,
    marginLeft: 8,
    textTransform: "uppercase"
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    marginVertical: 30
  },
  dividerLine: {
    backgroundColor: colors.outlineVariant,
    flex: 1,
    height: 1,
    opacity: 0.65
  },
  dividerText: {
    color: colors.outline,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 11,
    letterSpacing: 1.4
  },
  signInInput: {
    backgroundColor: colors.surfaceHigh,
    minHeight: 58
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: 12
  },
  forgotPasswordText: {
    color: "#E8C176",
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  forgotBackButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 44
  },
  forgotBackText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14
  },
  signInPrimary: {
    marginTop: spacing.md
  },
  signInPrimaryText: {
    color: colors.surfaceLowest,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 17
  },
  previewPanel: {
    alignItems: "flex-start",
    backgroundColor: "rgba(201,164,92,0.08)",
    borderColor: "rgba(201,164,92,0.28)",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md
  },
  confirmationState: {
    alignItems: "center",
    backgroundColor: "rgba(201,164,92,0.08)",
    borderColor: "rgba(201,164,92,0.28)",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.xl,
    width: "100%"
  },
  confirmationIcon: {
    alignItems: "center",
    backgroundColor: "rgba(201,164,92,0.14)",
    borderRadius: 999,
    height: 58,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 58
  },
  confirmationTitle: {
    color: colors.onSurface,
    fontFamily: typography.headlineFontFamily,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center"
  },
  confirmationBody: {
    color: colors.onSurfaceVariant,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  confirmationSecondaryButton: {
    alignItems: "center",
    borderColor: colors.outlineVariant,
    borderRadius: radius.control,
    borderWidth: 1,
    marginTop: spacing.lg,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    width: "100%"
  },
  confirmationSecondaryText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14
  },
  confirmationSuccess: {
    color: "#9FD5C5",
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  confirmationPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.control,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    width: "100%"
  },
  confirmationPrimaryText: {
    color: colors.surfaceLowest,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 15
  },
  previewText: {
    color: colors.onSurfaceVariant,
    flex: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 19
  },
  legalArea: {
    marginTop: 76
  },
  signUpLegalArea: {
    marginTop: 54
  },
  legalText: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center"
  },
  legalLink: {
    color: "#E8C176",
    textDecorationLine: "underline"
  },
  switchAuthText: {
    color: colors.onSurfaceVariant,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 14,
    textAlign: "center"
  },
  switchAuthRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 30
  },
  switchAuthLink: {
    color: "#E8C176",
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14
  }
});
