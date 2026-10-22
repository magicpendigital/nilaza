import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LegacyLocalAuthState, LocalAuthState } from "../types";
import { isSupabaseAuthConfigured } from "../runtimeConfig";
import { AUTH_STORAGE_KEY, LEGACY_AUTH_STORAGE_KEY, signedOutAuthState } from "./localAuth";
import { AccountScope } from "./accountScope";
import { getSupabaseSessionAuthState, signOutSupabase, subscribeSupabaseAuth } from "./supabaseAuth";

export function restoreLocalSession(value: unknown): LocalAuthState {
  const auth = value as LegacyLocalAuthState | LocalAuthState | null;
  // Guest launch is separate. Never infer identity from a global profile.
  if ((auth?.version === 1 || auth?.version === 2) && auth.status === "signed_in"
    && typeof auth.user?.id === "string" && auth.user.id.length > 0 && !auth.backendSession) {
    return { ...auth, version: 2 };
  }
  return signedOutAuthState;
}

export function useAccountSession() {
  const [authState, setState] = useState<LocalAuthState>(signedOutAuthState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [initialScope] = useState(() => new AccountScope(signedOutAuthState));
  const scopeRef = useRef(initialScope);
  const persistence = useRef<Promise<unknown>>(Promise.resolve());
  const signingOut = useRef(false);
  const logoutPending = useRef(false);
  const authWriteFailed = useRef(false);
  const mounted = useRef(true);

  const commit = (next: LocalAuthState) => {
    if (!mounted.current) return;
    const id = next.status === "signed_in" ? next.user.id : undefined;
    if (scopeRef.current.userId !== id || !scopeRef.current.active) {
      scopeRef.current.close();
      scopeRef.current = new AccountScope(next);
    } else {
      scopeRef.current.update(next);
    }
    setState(next);
    // Supabase SDK is the sole token store. Only preview identities use this key.
    persistence.current = persistence.current.catch(() => undefined).then(async () => {
      if (isSupabaseAuthConfigured) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
      }
      await AsyncStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      authWriteFailed.current = false;
    });
    // Keep the rejected promise for signOut: showing signed-out before this
    // write succeeds would allow the previous local identity to reappear on reload.
    void persistence.current.catch(() => {
      authWriteFailed.current = true;
      if (mounted.current) setError(true);
    });
  };

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let authEventReceived = false;
    setError(false);
    const unsubscribe = subscribeSupabaseAuth((next, event) => {
      if (!active || event === "INITIAL_SESSION" || signingOut.current || logoutPending.current) return;
      authEventReceived = true;
      commit(next);
      // A refresh can finish after bootstrap timed out. Its SDK event is now
      // authoritative, but must not hide a failed durable auth-store write.
      if (!authWriteFailed.current) setError(false);
      setReady(true);
    });
    void (async () => {
      try {
        let next: LocalAuthState;
        if (isSupabaseAuthConfigured) {
          // A missing/expired SDK session must not resurrect a duplicate cached JWT.
          next = await getSupabaseSessionAuthState() ?? signedOutAuthState;
        } else {
          const current = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
          const legacy = current === null ? await AsyncStorage.getItem(LEGACY_AUTH_STORAGE_KEY) : null;
          next = restoreLocalSession(JSON.parse(current ?? legacy ?? "null"));
        }
        if (!active || authEventReceived) return;
        commit(next);
        setReady(true);
      } catch {
        if (active && !authEventReceived) setError(true);
      }
    })();
    return () => { active = false; unsubscribe(); };
  }, [attempt]);

  useEffect(() => () => {
    mounted.current = false;
    scopeRef.current.close();
  }, []);

  const signOut = async () => {
    signingOut.current = true;
    logoutPending.current = true;
    scopeRef.current.close(); // Invalidate synchronously, before any await.
    setReady(false);
    try {
      await signOutSupabase();
      commit(signedOutAuthState);
      await persistence.current;
      logoutPending.current = false;
      setError(false);
      setReady(true);
    } catch {
      // No old account UI on failure. Retry must finish clearing the SDK session.
      setError(true);
    } finally {
      signingOut.current = false;
    }
  };

  return {
    authState, scope: scopeRef.current, ready, error, signOut,
    setAuthState: commit,
    retry: () => {
      setError(false);
      if (logoutPending.current) void signOut();
      else if (authWriteFailed.current) commit(authState);
      else setAttempt(value => value + 1);
    }
  };
}
