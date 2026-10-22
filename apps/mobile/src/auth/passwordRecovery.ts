import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseAuthConfigured, supabaseAnonKey, supabaseUrl } from "../runtimeConfig";

export function recoveryRedirectUrl() {
  return Platform.OS === "web" && typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}?recovery=1`
    : "nilaza://auth/recovery";
}

export function isRecoveryUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "nilaza:") return url.hostname === "auth" && url.pathname === "/recovery";
    if (Platform.OS !== "web" || typeof window === "undefined") return false;
    return url.origin === window.location.origin && url.pathname === window.location.pathname && url.searchParams.get("recovery") === "1";
  } catch { return false; }
}

export function createPasswordRecovery() {
  if (!isSupabaseAuthConfigured || !supabaseUrl || !supabaseAnonKey) throw new Error("config");
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
      flowType: "implicit", storageKey: "nilaza.mobile.recovery.ephemeral" },
    global: { fetch: async (input, init) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try { return await fetch(input, { ...init, signal: controller.signal }); }
      finally { clearTimeout(timer); }
    } }
  });
  let ready = false, busy = false;
  return {
    async accept(value: string) {
      ready = false;
      if (!isRecoveryUrl(value)) throw new Error("link");
      const params = new URLSearchParams(new URL(value).hash.slice(1));
      const access_token = params.get("access_token"), refresh_token = params.get("refresh_token");
      if (params.get("type") !== "recovery" || params.has("error") || !access_token || !refresh_token) throw new Error("link");
      const { data, error } = await client.auth.setSession({ access_token, refresh_token });
      if (error || !data.session) throw new Error("link");
      const verified = await client.auth.getUser();
      if (verified.error || !verified.data.user) throw new Error("link");
      ready = true;
    },
    async update(password: string, confirmation: string) {
      if (!ready || busy) throw new Error("link");
      if (password.length < 12) throw new Error("length");
      if (password !== confirmation) throw new Error("match");
      busy = true;
      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        ready = false;
        await client.auth.signOut({ scope: "local" }).catch(() => undefined);
      } finally { busy = false; }
    }
  };
}
