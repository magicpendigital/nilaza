import type { Language } from "../../types";
import { astrologySignIds, type AstrologySignId } from "../astrology/contracts";

// Public origin of the Nilaza website. Share links open a public page here; they never open the app.
export const SHARE_ORIGIN = "https://nilaza.magicpendigital.com";

export type ShareSurface = "today_card" | "tarot_reading" | "astro_big3" | "astro_invite";
export type ShareMedium = "card" | "invite";

const idAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const cardIdPattern = /^[a-z0-9][a-z0-9-]{1,40}$/;
const maxCards = 3;

/** Random id for one share. It is not derived from the account, device or content, so it counts shares without identifying anyone. */
export function newShareId(random: () => number = Math.random): string {
  let id = "";
  for (let index = 0; index < 8; index += 1) id += idAlphabet[Math.min(idAlphabet.length - 1, Math.floor(random() * idAlphabet.length))];
  return id;
}

export type ShareLinkInput = {
  language: Language;
  surface: ShareSurface;
  id: string;
  /** Public tarot card ids shown on the card (at most three). */
  cardIds?: string[];
  /** The sender's Sun sign, only when the chart gives a single sign. */
  sunSign?: AstrologySignId | null;
};

/**
 * Tracked link for one share. Only public card ids, one sign name, the surface and a random id leave the device.
 * The website forwards the utm_* values to the existing waitlist function, so signups from shares are countable.
 */
export function buildShareUrl(input: ShareLinkInput): string {
  const locale = input.language === "vi" ? "vi" : "en";
  const isAstro = input.surface === "astro_big3" || input.surface === "astro_invite";
  const params = new URLSearchParams();
  if (isAstro) {
    if (input.sunSign && (astrologySignIds as readonly string[]).includes(input.sunSign)) params.set("s", input.sunSign);
  } else {
    const cards = (input.cardIds ?? []).filter((id) => cardIdPattern.test(id)).slice(0, maxCards);
    if (cards.length) params.set("c", cards.join(","));
  }
  params.set("utm_source", "share");
  params.set("utm_medium", input.surface === "astro_invite" ? "invite" : "card");
  params.set("utm_campaign", input.surface);
  params.set("utm_content", /^[a-z0-9]{6,12}$/.test(input.id) ? input.id : newShareId());
  return `${SHARE_ORIGIN}/${locale}/${isAstro ? "compare" : "share"}?${params.toString()}`;
}

/** Plain readable address printed on the card image; it carries no tracking. */
export const SHARE_DISPLAY_ADDRESS = "nilaza.magicpendigital.com";

/** Text sent with the tracked link. It never includes the question, notes, mood, birth data or names. */
export function shareLinkMessage(language: Language, surface: ShareSurface, url: string): string {
  const vi = language === "vi";
  const lead = surface === "astro_invite"
    ? vi ? "Mình mời bạn so bản đồ sao của hai đứa trên Nilaza nhé." : "I would love to compare our star charts on Nilaza."
    : surface === "astro_big3"
      ? vi ? "Đây là bản đồ sao của mình trên Nilaza. Bạn thử xem của bạn nhé." : "This is my star chart on Nilaza. Try yours."
      : surface === "tarot_reading"
        ? vi ? "Mình vừa rút bài trên Nilaza. Rút thử với mình nhé." : "I just drew cards on Nilaza. Try it with me."
        : vi ? "Lá bài hôm nay của mình trên Nilaza. Rút lá của bạn nhé." : "My card of the day on Nilaza. Draw yours.";
  const note = vi ? "Để tự phản chiếu, không phải dự đoán." : "For self-reflection, not prediction.";
  return `${lead}\n${note}\n${url}`;
}
