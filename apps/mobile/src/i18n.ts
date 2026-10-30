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

const localeTags: Record<Language, string> = { vi: "vi-VN", en: "en-US", "zh-Hans": "zh-Hans", ja: "ja-JP", ko: "ko-KR" };

// Format in the app language rather than the device default, which showed
// "10/28/2026, 12:49:37 AM" inside the Vietnamese UI.
export function formatLocalDate(value: string | number | Date, language: Language): string {
  return new Date(value).toLocaleDateString(localeTags[language], { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatLocalDateTime(value: string | number | Date, language: Language): string {
  const date = new Date(value);
  const time = date.toLocaleTimeString(localeTags[language], { hour: "2-digit", minute: "2-digit", hour12: language === "en" });
  return `${formatLocalDate(date, language)} ${time}`;
}

// "Hôm nay" / "Hôm qua" / "3 ngày trước", then a plain date after a week.
export function relativeDayLabel(value: string | number | Date, now: Date, language: Language): string {
  const date = new Date(value);
  const startOf = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  const vi = language === "vi";
  if (days <= 0) return vi ? "Hôm nay" : "Today";
  if (days === 1) return vi ? "Hôm qua" : "Yesterday";
  if (days < 7) return vi ? `${days} ngày trước` : `${days} days ago`;
  return formatLocalDate(date, language);
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
