import AsyncStorage from "@react-native-async-storage/async-storage";

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return fallback;

    const parsed = JSON.parse(value) as T;
    const repaired = repairStoredValue(parsed);
    if (repaired.changed) {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(repaired.value));
      } catch {
        // A repaired in-memory value is still better than showing mojibake.
      }
    }

    return repaired.value as T;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // MVP local storage failures should not block the in-session review flow.
  }
}

export async function removeJson(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Keep local review flows resilient when storage cleanup fails.
  }
}

const mojibakeMarkers = [
  "Ã",
  "Â",
  "Ä",
  "Æ",
  "â€",
  "áº",
  "á»",
  "\u0081",
  "\u008d",
  "\u009d"
];

const vietnameseCharacters =
  "ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩị" +
  "óòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ" +
  "ĂÂĐÊÔƠƯÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊ" +
  "ÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ";

const cp1252SpecialBytes: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f
};

function repairStoredValue<T>(value: T): { value: T; changed: boolean } {
  if (typeof value === "string") {
    const repaired = repairMojibakeText(value);
    return { value: repaired.text as T, changed: repaired.changed };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const repairedArray = value.map((item) => {
      const repaired = repairStoredValue(item);
      changed = changed || repaired.changed;
      return repaired.value;
    });
    return { value: repairedArray as T, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const repairedObject: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([entryKey, entryValue]) => {
      const repaired = repairStoredValue(entryValue);
      repairedObject[entryKey] = repaired.value;
      changed = changed || repaired.changed;
    });
    return { value: repairedObject as T, changed };
  }

  return { value, changed: false };
}

function repairMojibakeText(text: string): { text: string; changed: boolean } {
  if (!mojibakeMarkers.some((marker) => text.includes(marker))) {
    return { text, changed: false };
  }

  let best = text;
  for (let index = 0; index < 6; index += 1) {
    const candidate = decodeSloppyCp1252AsUtf8(best);
    if (!candidate || mojibakeScore(candidate) >= mojibakeScore(best)) break;
    best = candidate;
  }

  return { text: best, changed: best !== text };
}

function mojibakeScore(text: string) {
  const markerScore = mojibakeMarkers.reduce((total, marker) => total + countOccurrences(text, marker), 0) * 30;
  const vietnameseScore = Array.from(text).filter((char) => vietnameseCharacters.includes(char)).length;
  return markerScore - vietnameseScore;
}

function decodeSloppyCp1252AsUtf8(text: string) {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.codePointAt(0);
    if (code == null) return undefined;

    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }

    const mapped = cp1252SpecialBytes[code];
    if (mapped == null) return undefined;
    bytes.push(mapped);
  }

  try {
    return decodeURIComponent(bytes.map((byte) => `%${byte.toString(16).padStart(2, "0")}`).join(""));
  } catch {
    return undefined;
  }
}

function countOccurrences(text: string, marker: string) {
  return text.split(marker).length - 1;
}
