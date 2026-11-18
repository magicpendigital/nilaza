// Logic for the public pages that share links open (/share and /compare). Everything here is pure and runs in the
// browser: a visitor's birth date is used to find a Sun sign and is never sent anywhere.

export type ZodiacId = "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";
export type ElementId = "fire" | "earth" | "air" | "water";

// Same order as the app's astrologySignIds, so the element follows from the index.
export const zodiac: { id: ZodiacId; vi: string; en: string; element: ElementId; glyph: string }[] = [
  { id: "aries", vi: "Bạch Dương", en: "Aries", element: "fire", glyph: "♈" },
  { id: "taurus", vi: "Kim Ngưu", en: "Taurus", element: "earth", glyph: "♉" },
  { id: "gemini", vi: "Song Tử", en: "Gemini", element: "air", glyph: "♊" },
  { id: "cancer", vi: "Cự Giải", en: "Cancer", element: "water", glyph: "♋" },
  { id: "leo", vi: "Sư Tử", en: "Leo", element: "fire", glyph: "♌" },
  { id: "virgo", vi: "Xử Nữ", en: "Virgo", element: "earth", glyph: "♍" },
  { id: "libra", vi: "Thiên Bình", en: "Libra", element: "air", glyph: "♎" },
  { id: "scorpio", vi: "Bọ Cạp", en: "Scorpio", element: "water", glyph: "♏" },
  { id: "sagittarius", vi: "Nhân Mã", en: "Sagittarius", element: "fire", glyph: "♐" },
  { id: "capricorn", vi: "Ma Kết", en: "Capricorn", element: "earth", glyph: "♑" },
  { id: "aquarius", vi: "Bảo Bình", en: "Aquarius", element: "air", glyph: "♒" },
  { id: "pisces", vi: "Song Ngư", en: "Pisces", element: "water", glyph: "♓" }
];

export const isZodiacId = (value: unknown): value is ZodiacId => zodiac.some((sign) => sign.id === value);

// First day of each sign in the common tropical calendar, as [month, day]. Dates near a boundary can differ by
// year and birth time, which the page tells the visitor.
const starts: [number, number, ZodiacId][] = [
  [1, 1, "capricorn"], [1, 20, "aquarius"], [2, 19, "pisces"], [3, 21, "aries"], [4, 20, "taurus"], [5, 21, "gemini"],
  [6, 21, "cancer"], [7, 23, "leo"], [8, 23, "virgo"], [9, 23, "libra"], [10, 23, "scorpio"], [11, 22, "sagittarius"], [12, 22, "capricorn"]
];

/** Sun sign for a month (1-12) and day (1-31), or null when the date does not exist. */
export function sunSignOf(month: number, day: number): ZodiacId | null {
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day > daysInMonth) return null;
  let found: ZodiacId = "capricorn";
  for (const [startMonth, startDay, id] of starts) if (month > startMonth || (month === startMonth && day >= startDay)) found = id;
  return found;
}

/** Sun sign from an <input type="date"> value (YYYY-MM-DD). Only month and day are read; the year is ignored. */
export function sunSignFromDateInput(value: string): ZodiacId | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return sunSignOf(Number(match[2]), Number(match[3]));
}

const elementOrder: ElementId[] = ["fire", "earth", "air", "water"];

/** Key of the Owner-approved element pair text, e.g. "fire-air" for Leo and Gemini in either order. */
export function elementPairKey(a: ZodiacId, b: ZodiacId): string {
  const first = zodiac.find((sign) => sign.id === a)!.element;
  const second = zodiac.find((sign) => sign.id === b)!.element;
  return [first, second].sort((x, y) => elementOrder.indexOf(x) - elementOrder.indexOf(y)).join("-");
}

const cardIdPattern = /^[a-z0-9][a-z0-9-]{1,40}$/;

/** Card ids from the ?c= parameter that are well formed and present in the published list; at most four (the largest spread). Older links carry one to three. */
export function parseCardIds(param: string | null, known: ReadonlySet<string>): string[] {
  if (!param) return [];
  const result: string[] = [];
  for (const id of param.split(",")) {
    if (cardIdPattern.test(id) && known.has(id) && !result.includes(id)) result.push(id);
    if (result.length === 4) break;
  }
  return result;
}

export const shareSurfaces = ["today_card", "tarot_reading", "astro_big3", "astro_invite"] as const;
export type ShareSurface = (typeof shareSurfaces)[number];

export type ShareArrival = { fromShare: boolean; surface: ShareSurface | null; medium: "card" | "invite" | null };

/** Whether the visit came from a Nilaza share link, using only enumerated utm values. */
export function readShareArrival(search: string): ShareArrival {
  const params = new URLSearchParams(search);
  const fromShare = params.get("utm_source") === "share";
  const surface = params.get("utm_campaign");
  const medium = params.get("utm_medium");
  return {
    fromShare,
    surface: fromShare && (shareSurfaces as readonly string[]).includes(surface ?? "") ? (surface as ShareSurface) : null,
    medium: fromShare && (medium === "card" || medium === "invite") ? medium : null
  };
}
