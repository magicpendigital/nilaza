import { Language, LocalizedList, LocalizedText } from "./types";

export const fallbackLanguage: Language = "en";
export const defaultLanguage: Language = "vi";

export const languageOptions: Array<{ code: Language; label: string; viLabel: string; nativeLabel: string; enabled: boolean }> = [
  { code: "vi", label: "Vietnamese", viLabel: "Tiếng Việt", nativeLabel: "Tiếng Việt", enabled: true },
  { code: "en", label: "English", viLabel: "Tiếng Anh", nativeLabel: "English", enabled: true },
  { code: "zh-Hans", label: "Chinese", viLabel: "Tiếng Trung", nativeLabel: "简体中文", enabled: false },
  { code: "ja", label: "Japanese", viLabel: "Tiếng Nhật", nativeLabel: "日本語", enabled: false },
  { code: "ko", label: "Korean", viLabel: "Tiếng Hàn", nativeLabel: "한국어", enabled: false }
];

export function normalizeLanguage(language?: string): Language {
  return languageOptions.some((item) => item.code === language) ? (language as Language) : defaultLanguage;
}

function languageFallbacks(language: Language): Language[] {
  return language === fallbackLanguage ? [fallbackLanguage] : [language, fallbackLanguage];
}

export function localizedText(value: LocalizedText | undefined, language: Language, fallback = ""): string {
  if (!value) return fallback;

  for (const code of languageFallbacks(language)) {
    const text = value[code];
    if (typeof text === "string" && text.trim()) return text;
  }

  return fallback;
}

export function localizedList(value: LocalizedList | undefined, language: Language): string[] {
  if (!value) return [];

  for (const code of languageFallbacks(language)) {
    const list = value[code];
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  }

  return [];
}
