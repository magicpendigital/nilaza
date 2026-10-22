import { LegacyLocalAuthState, LocalAuthState, Profile } from "../types";

export const AUTH_STORAGE_KEY = "nilaza.auth.v2";
export const LEGACY_AUTH_STORAGE_KEY = "nilaza.auth.v1";

export const signedOutAuthState: LocalAuthState = {
  version: 2,
  status: "signed_out"
};

export function createGuestAuthState(now = new Date(), language: Profile["language"] = "vi"): LocalAuthState {
  return {
    version: 2,
    status: "guest",
    guestId: `guest-${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now.toISOString(),
    onboarding: {
      completed: false,
      step: 0,
      language,
      goals: [],
      tone: "gentle"
    }
  };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value.trim().toLowerCase());
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function displayNameFromEmail(value: string): string {
  const localPart = normalizeEmail(value).split("@")[0] ?? "Seeker";
  const words = localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(" ") || "Seeker";
}

export function createEmailAuthState(name: string, email: string): LocalAuthState {
  const normalizedEmail = normalizeEmail(email);
  return {
    version: 2,
    status: "signed_in",
    user: {
      id: `local-${normalizedEmail}`,
      name: name.trim() || displayNameFromEmail(normalizedEmail),
      email: normalizedEmail,
      provider: "email"
    }
  };
}

export function resolveInitialAuthState(
  storedAuth: LocalAuthState | LegacyLocalAuthState | null,
  savedProfile: Profile
): LocalAuthState {
  if (storedAuth?.version === 2) {
    if (storedAuth.status !== "guest" || storedAuth.onboarding) return storedAuth;
    return {
      ...storedAuth,
      onboarding: {
        completed: false,
        step: 0,
        language: savedProfile.language,
        goals: [],
        tone: "gentle"
      }
    };
  }
  if (storedAuth?.version === 1) {
    if (storedAuth.status === "signed_out") return signedOutAuthState;
    return { ...storedAuth, version: 2 };
  }
  if (!savedProfile.onboarded) return signedOutAuthState;

  return {
    version: 2,
    status: "signed_in",
    user: {
      id: "legacy-local",
      name: savedProfile.nickname || "Nilaza Seeker",
      email: "",
      provider: "legacy-local"
    }
  };
}
