declare const process: {
  env: {
    NODE_ENV?: string;
    EXPO_PUBLIC_NILAZA_API_URL?: string;
    EXPO_PUBLIC_NILAZA_ADMIN_URL?: string;
    EXPO_PUBLIC_NILAZA_HELP_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_NILAZA_RESPONSIVE_SHELL?: string;
    EXPO_PUBLIC_NILAZA_GUEST_ENTRY?: string;
    EXPO_PUBLIC_NILAZA_ONLINE_REQUIRED?: string;
    EXPO_PUBLIC_AI_TRACE_QA_CAPTURE?: string;
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?: string;
    EXPO_PUBLIC_BILLING_TEST?: string;
  };
};

declare const __DEV__: boolean | undefined;

function enabledByDefault(value: string | undefined) {
  return value?.trim().toLowerCase() !== "false";
}

export const nilazaBackendBaseUrl =
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_NILAZA_API_URL?.trim() || undefined : undefined;

/** Public navigation target only. Auth remains isolated in the Admin session. */
export const nilazaAdminUrl =
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_NILAZA_ADMIN_URL?.trim() || undefined : undefined;

/** Public Help Center target. Use `{locale}` in an override for bilingual routing. */
export function nilazaHelpUrlFor(language: string) {
  const locale = language === "en" ? "en" : "vi";
  const configured = typeof process !== "undefined" ? process.env.EXPO_PUBLIC_NILAZA_HELP_URL?.trim() : undefined;
  return configured ? configured.replace("{locale}", locale) : `https://nilaza.magicpendigital.com/${locale}/help`;
}

/** Public legal pages published by apps/web. */
export function nilazaLegalUrlFor(page: "terms" | "privacy", language: string) {
  const locale = language === "en" ? "en" : "vi";
  return `https://nilaza.magicpendigital.com/${locale}/${page}/`;
}

export const supabaseUrl =
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || undefined : undefined;

export const supabaseAnonKey =
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined : undefined;

export const isSupabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Native preview/store builds must never silently downgrade to the local
// account implementation when an EAS environment is missing. Local UI work
// remains available in development, while hosted builds fail closed with a
// configuration message instead of creating device-only accounts.
const isDevelopmentRuntime = typeof __DEV__ !== "undefined"
  ? __DEV__
  : typeof process !== "undefined" && process.env.NODE_ENV !== "production";

const onlineRequiredOverride = typeof process !== "undefined"
  ? process.env.EXPO_PUBLIC_NILAZA_ONLINE_REQUIRED?.trim().toLowerCase()
  : undefined;

export const onlineModeRequired = !isDevelopmentRuntime || onlineRequiredOverride === "true";

function isHostedHttpsUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export const onlineRuntimeReady = Boolean(
  isHostedHttpsUrl(nilazaBackendBaseUrl) && isHostedHttpsUrl(supabaseUrl) && supabaseAnonKey
);

export const responsiveShellEnabled = enabledByDefault(
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_NILAZA_RESPONSIVE_SHELL : undefined
);

export const guestEntryEnabled = enabledByDefault(
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_NILAZA_GUEST_ENTRY : undefined
);

/** QA-only opt-in. The backend separately enforces staging and owner capability. */
export const astrologyQaTraceCaptureEnabled = typeof process !== "undefined"
  && process.env.EXPO_PUBLIC_AI_TRACE_QA_CAPTURE?.trim().toLowerCase() === "true";

/**
 * Public Android SDK key of the in-app purchase service (a client key, never a secret). Set per EAS
 * environment by the Owner; empty means purchases are unavailable and the app runs normally.
 */
export const billingAndroidPublicKey =
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() || undefined : undefined;

/**
 * Closed-test build flag: shows the Premium purchase screen while Premium is not on sale so license
 * testers can try a purchase. Off by default; it never changes the account tier.
 */
export const billingTestEnabled = typeof process !== "undefined"
  && process.env.EXPO_PUBLIC_BILLING_TEST?.trim().toLowerCase() === "true";
