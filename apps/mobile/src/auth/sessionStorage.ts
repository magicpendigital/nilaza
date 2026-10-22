import type { LocalAuthState } from "../types";

export type SessionDataSensitivity = "preference" | "private";

function safeScopeId(value: string) {
  return encodeURIComponent(value.trim().toLowerCase());
}

export function accountStoragePrefix(userId: string) {
  // encodeURIComponent leaves "." intact; it is our namespace separator.
  // Escaping it prevents clearing a@example.com from also matching a@example.com.test.
  return `nilaza.user.${encodeURIComponent(userId).replace(/\./g, "%2E")}.`;
}

export function sessionStorageKey(
  authState: LocalAuthState,
  key: string,
  sensitivity: SessionDataSensitivity = "private"
): string | null {
  if (authState.status === "signed_in") {
    return `${accountStoragePrefix(authState.user.id)}${key}`;
  }
  if (authState.status === "guest" && sensitivity === "preference") {
    return `nilaza.guest.${safeScopeId(authState.guestId)}.${key}`;
  }
  return null;
}
