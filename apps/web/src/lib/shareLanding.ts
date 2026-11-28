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

// Same list as the app (shareEvents.ts) and the share-events server function.
// book_quote added 28/11/2026 (share cards v2, S1a); its own landing variant comes with S1b.
export const shareSurfaces = ["today_card", "tarot_reading", "astro_big3", "astro_invite", "numerology_map", "daily_sky", "book_quote"] as const;
export type ShareSurface = (typeof shareSurfaces)[number];

/** The page layout a share link opens. Big 3 and invite links open /compare and have no variant here. */
export const shareVariants = ["card", "reading", "numbers", "sky", "quote"] as const;
export type ShareVariant = (typeof shareVariants)[number];
export const isShareVariant = (value: unknown): value is ShareVariant => (shareVariants as readonly unknown[]).includes(value);

const variantBySurface: Partial<Record<ShareSurface, ShareVariant>> = { today_card: "card", tarot_reading: "reading", numerology_map: "numbers", daily_sky: "sky", book_quote: "quote" };

/** Link preview title and description (Zalo, Messenger) per variant. Static, so it never repeats what was shared. */
export function shareMeta(locale: "vi" | "en", variant: ShareVariant | "auto"): { title: string; description: string } {
  const vi = locale === "vi";
  switch (variant) {
    case "reading":
      return vi
        ? { title: "Một trải bài từ người bạn trên Nilaza", description: "Xem những lá bạn của bạn vừa trải, rồi tự rút một lá ngay trên trình duyệt. Tarot để tự soi chiếu, không là lời dự đoán." }
        : { title: "A card spread from a friend on Nilaza", description: "See the cards your friend laid out, then draw one yourself right in your browser. Tarot for reflection, not prediction." };
    case "numbers":
      return vi
        ? { title: "Con số chủ đạo của bạn là gì? — Nilaza", description: "Một người bạn vừa xem bản đồ số trên Nilaza. Nhập ngày sinh để xem con số của bạn; ngày sinh chỉ được tính trên trình duyệt, không gửi đi." }
        : { title: "What is your life path number? — Nilaza", description: "A friend just looked at their number map on Nilaza. Enter a birth date to see yours; it is calculated in your browser and never sent." };
    case "sky":
      return vi
        ? { title: "Bầu trời hôm nay từ Nilaza", description: "Mặt Trăng đang ở cung nào và gợi nhịp gì cho ngày của bạn. Một dòng để tự soi chiếu, không là lời dự đoán." }
        : { title: "Today's sky from Nilaza", description: "Which sign the Moon is in and what pace it suggests for your day. A line to reflect on, not a prediction." };
    case "quote":
      return vi
        ? { title: "Một câu cho hôm nay từ Nilaza", description: "Một câu trích từ sách cổ và một câu hỏi để tự ngẫm. Đọc câu hôm nay, rồi xem câu của những cuốn sách khác ngay trên trình duyệt." }
        : { title: "A line for today from Nilaza", description: "One line from an old book and one question to sit with. Read today's line, then see the other books' lines right in your browser." };
    case "card":
    case "auto":
    default:
      return vi
        ? { title: "Một lá bài từ người bạn trên Nilaza", description: "Một người bạn vừa chia sẻ lá bài của họ. Xem lá đó, rồi tự rút một lá ngay trên trình duyệt để chậm lại một nhịp." }
        : { title: "A card from a friend on Nilaza", description: "A friend just shared their card. See it, then draw your own right in your browser and slow down for a moment." };
  }
}

/** Variant for the old /share address, which every surface used before 28/11/2026: read from utm_campaign, card by default. */
export function variantFromSearch(search: string): ShareVariant {
  const campaign = new URLSearchParams(search).get("utm_campaign");
  return (campaign && variantBySurface[campaign as ShareSurface]) || "card";
}

export const skyDecans = ["early", "mid", "late"] as const;
export type SkyDecan = (typeof skyDecans)[number];
export const skyPhases = ["new", "waxing_crescent", "first_quarter", "waxing_gibbous", "full", "waning_gibbous", "last_quarter", "waning_crescent"] as const;
export type SkyPhase = (typeof skyPhases)[number];
/** Phase names as the app shows them (apps/mobile/src/features/home/moonPhase.ts); a test keeps the two in step. */
export const sharePhaseNames: Record<SkyPhase, { vi: string; en: string }> = {
  new: { vi: "Trăng mới", en: "New moon" },
  waxing_crescent: { vi: "Trăng lưỡi liềm đầu", en: "Waxing crescent" },
  first_quarter: { vi: "Trăng thượng huyền", en: "First quarter" },
  waxing_gibbous: { vi: "Trăng gần tròn", en: "Waxing gibbous" },
  full: { vi: "Trăng tròn", en: "Full moon" },
  waning_gibbous: { vi: "Trăng khuyết dần", en: "Waning gibbous" },
  last_quarter: { vi: "Trăng hạ huyền", en: "Last quarter" },
  waning_crescent: { vi: "Trăng lưỡi liềm cuối", en: "Waning crescent" }
};
export type SharedSky = { moonSign: ZodiacId; decan: SkyDecan; phase: SkyPhase; date: { year: number; month: number; day: number } };

/**
 * The public sky of the day from a daily_sky link (?m=&k=&p=&d=). All four must be valid or nothing is used, so a
 * changed address cannot put free text on the page. These values are the same for everyone on that day.
 */
export function parseSharedSky(search: string): SharedSky | null {
  const params = new URLSearchParams(search);
  const moonSign = params.get("m");
  const decan = params.get("k");
  const phase = params.get("p");
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.get("d") ?? "");
  if (!isZodiacId(moonSign) || !(skyDecans as readonly string[]).includes(decan ?? "") || !(skyPhases as readonly string[]).includes(phase ?? "") || !date) return null;
  const [year, month, day] = [Number(date[1]), Number(date[2]), Number(date[3])];
  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return { moonSign, decan: decan as SkyDecan, phase: phase as SkyPhase, date: { year, month, day } };
}

/** A small random index for the visitor's own draw; crypto when the browser has it. */
export function randomIndex(length: number, random: () => number = defaultRandom): number {
  return Math.min(length - 1, Math.floor(random() * length));
}
function defaultRandom(): number {
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array } }).crypto;
  if (cryptoApi?.getRandomValues) return cryptoApi.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  return Math.random();
}

/** card: link sent with a card image; invite: comparison invite; qr: the code printed on the card image. */
export const shareMediums = ["card", "invite", "qr"] as const;
export type ShareMedium = (typeof shareMediums)[number];
export type ShareArrival = { fromShare: boolean; surface: ShareSurface | null; medium: ShareMedium | null };

/** Whether the visit came from a Nilaza share link, using only enumerated utm values. */
export function readShareArrival(search: string): ShareArrival {
  const params = new URLSearchParams(search);
  const fromShare = params.get("utm_source") === "share";
  const surface = params.get("utm_campaign");
  const medium = params.get("utm_medium");
  return {
    fromShare,
    surface: fromShare && (shareSurfaces as readonly string[]).includes(surface ?? "") ? (surface as ShareSurface) : null,
    medium: fromShare && (shareMediums as readonly string[]).includes(medium ?? "") ? (medium as ShareMedium) : null
  };
}

// "Một câu cho hôm nay": the same daily line as the app (apps/mobile/src/features/bookQuote/content.ts), so a QR
// scanned on the day it was shared opens the line on the card. A test keeps the two rotations in step.

/** Local calendar date as YYYY-MM-DD, like the app's bookQuoteDateKey. */
export function quoteDateKey(at: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/** FNV-1a 32-bit, identical to the app's stableHash. */
export function quoteHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function quoteDayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, (month || 1) - 1, day || 1) / 86400000);
}

/** Index of the line a book shows on a date (the app's pickBookQuote). */
export function quoteItemIndex(book: string, dateKey: string, count: number): number {
  return count > 0 ? quoteHash(`${dateKey}|${book}`) % count : -1;
}

/** Index of the book shown first on a date, from the books in app order that have approved lines (the app's homeBookQuoteBook). */
export function quoteBookIndex(dateKey: string, count: number): number {
  return count > 0 ? ((quoteDayNumber(dateKey) % count) + count) % count : -1;
}

/** Books in the app's order (bookQuoteBookOrder), with the app's short tab labels and author lines. */
export const quoteBooks = [
  { id: "dao-duc-kinh", label: { vi: "Đạo Đức Kinh", en: "Tao Te Ching" }, author: { vi: "Lão Tử", en: "Laozi" } },
  { id: "suy-tuong", label: { vi: "Suy tưởng", en: "Meditations" }, author: { vi: "Marcus Aurelius", en: "Marcus Aurelius" } },
  { id: "kinh-phap-cu", label: { vi: "Pháp Cú", en: "Dhammapada" }, author: { vi: "Kinh Pháp Cú", en: "The Dhammapada" } },
  { id: "binh-phap-ton-tu", label: { vi: "Binh pháp", en: "Art of War" }, author: { vi: "Tôn Tử", en: "Sunzi" } },
  { id: "kinh-dich", label: { vi: "Kinh Dịch", en: "I Ching" }, author: { vi: "Kinh Dịch", en: "The I Ching" } }
] as const;
