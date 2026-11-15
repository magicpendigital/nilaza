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

/** Public values a share message may mention. They come from the card library or the calculated chart, never from what the person typed. */
export type ShareMessageDetail = { cardNames?: string[]; signName?: string };

const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, 40);

function joinNames(names: string[], vi: boolean): string {
  if (names.length <= 1) return names[0] ?? "";
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(", ")} ${vi ? "và" : "and"} ${last}`;
}

/**
 * Text sent with the tracked link. It speaks as the person sharing, leaves a question open for the reader, and carries no
 * system-style disclaimer. It never includes the question, notes, mood, birth data or names: only a public card name or a
 * calculated Sun sign name may appear, and only when the caller passes one.
 */
export function shareLinkMessage(language: Language, surface: ShareSurface, url: string, detail: ShareMessageDetail = {}): string {
  const vi = language === "vi";
  const names = (detail.cardNames ?? []).map(cleanName).filter(Boolean).slice(0, maxCards);
  const sign = detail.signName ? cleanName(detail.signName) : "";
  let lead: string;
  if (surface === "astro_invite") {
    lead = vi
      ? `${sign ? `Mặt Trời của mình ở ${sign}, còn bạn? ` : ""}Mình tò mò bản đồ sao của hai đứa mình hợp nhau ở điểm nào. Vào so với mình nhé.`
      : `${sign ? `My Sun is in ${sign}. What about yours? ` : ""}I am curious where our star charts line up. Come compare with me.`;
  } else if (surface === "astro_big3") {
    lead = sign
      ? vi
        ? `Mặt Trời của mình ở ${sign}. Bạn đoán xem Mặt Trăng và cung mọc của mình ở đâu? Xem bản đồ sao của bạn đi.`
        : `My Sun is in ${sign}. Guess where my Moon and Rising are? Go see your own chart.`
      : vi
        ? "Mình vừa xem bản đồ sao của mình và có vài điều làm mình bất ngờ. Bạn xem của bạn đi?"
        : "I just looked at my star chart and a few things surprised me. Want to see yours?";
  } else if (surface === "tarot_reading") {
    lead = names.length === 1
      ? vi
        ? `Mình vừa rút lá ${names[0]}, và có một câu trong lời giải làm mình phải dừng lại. Bạn rút thử xem?`
        : `I just drew ${names[0]} and one line in the reading made me stop. Want to draw yours?`
      : names.length > 1
        ? vi
          ? `Mình vừa trải ${joinNames(names, true)}, và có một lá làm mình phải dừng lại. Bạn thử trải xem bạn ra những lá nào?`
          : `I just laid out ${joinNames(names, false)}, and one card made me stop. Try a spread and see which cards you get.`
        : vi
          ? "Mình vừa trải một vòng bài, và có một lá làm mình phải dừng lại. Bạn thử trải xem bạn ra những lá nào?"
          : "I just did a card spread and one card made me stop. Try one and see which cards you get.";
  } else {
    lead = names.length
      ? vi
        ? `Hôm nay mình rút được lá ${names[0]}. Đọc xong mình ngồi nghĩ mất một lúc. Bạn rút thử xem lá của bạn là gì?`
        : `I pulled ${names[0]} today and it made me stop and think. Pull yours and see what it says?`
      : vi
        ? "Hôm nay mình vừa rút một lá bài và ngồi nghĩ mất một lúc. Bạn rút thử xem lá của bạn là gì?"
        : "I pulled a card today and it made me stop and think. Pull yours and see what it says?";
  }
  return `${lead}\n${url}`;
}
