import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeLanguage } from "./i18n";
import type { Language } from "./types";

// The last language picked on this device, on any screen and in any account.
// Signed-out screens have no account storage, so without this key a choice made
// on the welcome or sign-up screen was lost on restart and a new account fell
// back to the phone language (and pushed it to the account's email locale).
// Holds only a language code; account data stays in account-scoped storage.
export const deviceLanguageKey = "nilaza.device.language";

export async function loadDeviceLanguagePreference(): Promise<Language | null> {
  try {
    const value = await AsyncStorage.getItem(deviceLanguageKey);
    // Unknown values are ignored so the phone-language fallback still applies.
    return value && normalizeLanguage(value) === value ? value as Language : null;
  } catch {
    return null;
  }
}

export async function saveDeviceLanguagePreference(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(deviceLanguageKey, language);
  } catch {
    // Best effort: the account profile still keeps its own language.
  }
}
