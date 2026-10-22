import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseAuthConfigured, supabaseAnonKey, supabaseUrl } from "../runtimeConfig";

export function confirmationRedirectUrl() {
  return Platform.OS === "web" && typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}?confirmation=1`
    : "nilaza://auth/confirm";
}

export function isConfirmationUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "nilaza:") return url.hostname === "auth" && url.pathname === "/confirm";
    if (Platform.OS !== "web" || typeof window === "undefined") return false;
    return url.origin === window.location.origin && url.pathname === window.location.pathname
      && url.searchParams.get("confirmation") === "1" && !url.searchParams.has("recovery");
  } catch { return false; }
}

export async function verifyEmailConfirmation(value: string) {
  if (!isSupabaseAuthConfigured || !supabaseUrl || !supabaseAnonKey) throw new Error("config");
  if (!isConfirmationUrl(value)) throw new Error("link");
  const params = new URLSearchParams(new URL(value).hash.slice(1));
  const token = params.get("access_token");
  if (params.get("type") !== "signup" || params.has("error") || !token) throw new Error("link");
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
      storageKey: "nilaza.mobile.confirmation.ephemeral" },
    global: { fetch: async (input, init) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try { return await fetch(input, { ...init, signal: controller.signal }); }
      finally { clearTimeout(timer); }
    } }
  });
  // Check the issuer directly. Never adopt the link's session into the app,
  // which may already belong to another account on this device.
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email_confirmed_at) throw new Error("link");
}
