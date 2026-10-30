import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, Session, AuthChangeEvent } from "@supabase/supabase-js";

import { isSupabaseAuthConfigured, supabaseAnonKey, supabaseUrl } from "../runtimeConfig";
import { LocalAuthState } from "../types";
import { displayNameFromEmail } from "./localAuth";
import { recoveryRedirectUrl } from "./passwordRecovery";
import { confirmationRedirectUrl } from "./emailConfirmation";

const supabaseClient = isSupabaseAuthConfigured && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage
      }
    })
  : null;

const AUTH_REQUEST_TIMEOUT_MS = 12000;
let authAttempt = 0;
let adoptingAttempt: number | null = null;
let sessionWrites: Promise<unknown> = Promise.resolve();

function isolatedAuthClient() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase auth is not configured");
  // A timed-out login may still finish inside the SDK. It must only be able to
  // write to its own ephemeral session, never the application's auth store.
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false,
      storageKey: `nilaza.auth.attempt.${authAttempt}` }
  });
}

async function adoptSession(session: Session, attempt: number): Promise<Session> {
  const operation = sessionWrites.catch(() => undefined).then(async () => {
    if (!supabaseClient || attempt !== authAttempt) throw new Error("Sign-in attempt expired");
    adoptingAttempt = attempt;
    try {
      const { data, error } = await supabaseClient.auth.setSession({
        access_token: session.access_token, refresh_token: session.refresh_token
      });
      if (error) throw error;
      if (attempt !== authAttempt || !data.session) throw new Error("Sign-in attempt expired");
      return data.session;
    } finally { adoptingAttempt = null; }
  });
  sessionWrites = operation;
  return operation;
}

export type SupabaseAuthResult = {
  authState?: LocalAuthState;
  pendingEmailConfirmation?: boolean;
};

async function withAuthTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Supabase auth request timed out. Check your local connection and try again.")),
      AUTH_REQUEST_TIMEOUT_MS
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function sessionToAuthState(session: Session, fallbackName?: string): LocalAuthState {
  const email = session.user.email ?? "";
  const metadata = session.user.user_metadata ?? {};
  const name =
    typeof metadata.name === "string" && metadata.name.trim()
      ? metadata.name.trim()
      : typeof metadata.full_name === "string" && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : fallbackName?.trim() || displayNameFromEmail(email);

  return {
    version: 2,
    status: "signed_in",
    user: {
      id: session.user.id,
      name,
      email,
      provider: "email",
      ...(session.user.created_at ? { createdAt: session.user.created_at } : {})
    },
    backendSession: {
      provider: "supabase",
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at
    }
  };
}

export async function getSupabaseSessionAuthState(): Promise<LocalAuthState | null> {
  if (!supabaseClient) return null;
  const { data, error } = await withAuthTimeout(supabaseClient.auth.getSession());
  if (error) throw error;
  if (!data.session) return null;
  return sessionToAuthState(data.session);
}

export async function signInWithSupabaseEmail(email: string, password: string): Promise<SupabaseAuthResult | null> {
  if (!supabaseClient) return null;
  const attempt = ++authAttempt;
  const { data, error } = await withAuthTimeout(isolatedAuthClient().auth.signInWithPassword({ email, password }));
  if (error) throw error;
  if (!data.session) return null;
  return { authState: sessionToAuthState(await adoptSession(data.session, attempt)) };
}

export async function signUpWithSupabaseEmail(name: string, email: string, password: string): Promise<SupabaseAuthResult | null> {
  if (!supabaseClient) return null;
  const attempt = ++authAttempt;
  const { data, error } = await withAuthTimeout(isolatedAuthClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirmationRedirectUrl(),
      data: {
        name: name.trim(),
        // Sign-up is only reachable after the 18+ confirmation in AuthFlow.
        adult_confirmed_at: new Date().toISOString()
      }
    }
  }));
  if (error) throw error;
  if (data.session) return { authState: sessionToAuthState(await adoptSession(data.session, attempt), name) };
  // Preserve Supabase's generic duplicate-account response to avoid revealing
  // whether an address belongs to an existing user.
  return {
    pendingEmailConfirmation: true
  };
}

let nextSignupResendAt = 0;
export async function resendSupabaseSignupConfirmation(email: string): Promise<boolean> {
  if (!supabaseClient) return false;
  if (Date.now() < nextSignupResendAt) throw new Error("Vui lòng chờ một phút trước khi gửi lại. / Please wait one minute before retrying.");
  nextSignupResendAt = Date.now() + 60000;
  const { error } = await withAuthTimeout(isolatedAuthClient().auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: confirmationRedirectUrl() }
  }));
  if (error) throw error;
  return true;
}

let nextPasswordResetAt = 0;
export async function resetSupabasePasswordForEmail(email: string): Promise<boolean> {
  if (!supabaseClient) return false;
  if (Date.now() < nextPasswordResetAt) throw new Error("Vui lòng chờ một phút trước khi gửi lại. / Please wait one minute before retrying.");
  nextPasswordResetAt = Date.now() + 60000;
  const { error } = await withAuthTimeout(isolatedAuthClient().auth.resetPasswordForEmail(email, { redirectTo: recoveryRedirectUrl() }));
  if (error) throw error;
  return true;
}

export async function signOutSupabase(): Promise<void> {
  if (!supabaseClient) return;
  ++authAttempt;
  const operation = sessionWrites.catch(() => undefined).then(async () => {
    const { error } = await supabaseClient.auth.signOut({ scope: "local" });
    if (error) throw error;
  });
  sessionWrites = operation;
  await withAuthTimeout(operation);
}

export function subscribeSupabaseAuth(listener: (auth: LocalAuthState, event: AuthChangeEvent) => void) {
  if (!supabaseClient) return () => undefined;
  const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
    if (adoptingAttempt !== null && adoptingAttempt !== authAttempt) return;
    // No awaited auth calls inside this SDK callback.
    listener(session ? sessionToAuthState(session) : { version: 2, status: "signed_out" }, event);
  });
  return () => data.subscription.unsubscribe();
}
