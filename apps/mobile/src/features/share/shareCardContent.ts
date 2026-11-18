import type { ImageSourcePropType } from "react-native";
import type { Language } from "../../types";
import { localizeAstrologySign, type AstrologySignId } from "../astrology/contracts";
import { firstSentence, safeReadingSentence } from "../tarot/shareText";
import { MAX_SHARE_CARDS, SHARE_DISPLAY_ADDRESS, type ShareSurface } from "./shareLink";

export type ShareCardImage = { source: ImageSourcePropType; reversed: boolean };
export type ShareCardRow = { glyph: string; label: string; value: string };

/**
 * Everything printed on a share card. Builders take only the fields below, so the question, notes, mood,
 * birth date, birth time, birth place and names cannot reach the image by construction.
 */
export type ShareCardModel = {
  surface: ShareSurface;
  eyebrow: string;
  title: string;
  images: ShareCardImage[];
  lines: string[];
  rows: ShareCardRow[];
  message: string;
  note: string;
  footer: string;
  /** Public tarot card names that may appear in the share message (at most four). Never the question or notes. */
  cardNames?: string[];
  /** Calculated Sun sign name that may appear in the share message, only when the chart gives exactly one. */
  signName?: string;
};

/** What a screen hands to the share sheet: the card and only the public values the link may carry. */
export type ShareRequest = {
  model: ShareCardModel;
  cardIds?: string[];
  sunSign?: AstrologySignId | null;
  primary?: "image" | "link";
};

const noteText = (language: Language) => (language === "vi" ? "Để tự phản chiếu, không phải dự đoán." : "For self-reflection, not prediction.");
const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

export function todayCardModel(input: { language: Language; cardName: string; meaning: string; image: ImageSourcePropType; reversed?: boolean }): ShareCardModel {
  const vi = input.language === "vi";
  return {
    surface: "today_card",
    eyebrow: vi ? "Lá bài hôm nay" : "Card of the day",
    title: input.cardName,
    images: [{ source: input.image, reversed: Boolean(input.reversed) }],
    lines: [],
    rows: [],
    message: clip(firstSentence(input.meaning) || input.meaning.trim(), 150),
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    cardNames: [input.cardName]
  };
}

export type ShareReadingCard = { position: string; name: string; reversed: boolean; image: ImageSourcePropType };

export function readingModel(input: { language: Language; cards: ShareReadingCard[]; summary: string; question?: string | null }): ShareCardModel {
  const vi = input.language === "vi";
  const cards = input.cards.slice(0, MAX_SHARE_CARDS);
  return {
    surface: "tarot_reading",
    eyebrow: vi ? "Trải bài của mình" : "My reading",
    title: cards.length === 1 ? cards[0].name : vi ? `${cards.length} lá bài` : `${cards.length} cards`,
    images: cards.map((card) => ({ source: card.image, reversed: card.reversed })),
    lines: cards.map((card) => `${card.position} · ${card.name}${card.reversed ? ` · ${vi ? "Ngược" : "Reversed"}` : ""}`),
    rows: [],
    message: clip(safeReadingSentence(input.summary, input.question), 150),
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    cardNames: cards.map((card) => card.name)
  };
}

export type ShareBig3Input = {
  language: Language;
  sun: AstrologySignId[];
  moon: AstrologySignId[];
  rising?: AstrologySignId;
  timeKnown: boolean;
  headline?: string;
};

/** Sign names come from the calculated chart. An uncertain sign (more than one option) is left off the card. */
export function big3Model(input: ShareBig3Input): ShareCardModel {
  const vi = input.language === "vi";
  const lang = vi ? "vi" : "en";
  const rows: ShareCardRow[] = [];
  if (input.sun.length === 1) rows.push({ glyph: "☉", label: vi ? "Mặt Trời" : "Sun", value: localizeAstrologySign(input.sun[0], lang) });
  if (input.moon.length === 1 && input.timeKnown) rows.push({ glyph: "☽", label: vi ? "Mặt Trăng" : "Moon", value: localizeAstrologySign(input.moon[0], lang) });
  if (input.rising && input.timeKnown) rows.push({ glyph: "↑", label: vi ? "Cung mọc" : "Rising", value: localizeAstrologySign(input.rising, lang) });
  return {
    surface: "astro_big3",
    eyebrow: vi ? "Bản đồ sao của mình" : "My star chart",
    title: input.headline ? clip(input.headline, 90) : vi ? "Bầu trời của mình" : "My sky",
    images: [],
    lines: [],
    rows,
    message: "",
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    ...(input.sun.length === 1 ? { signName: localizeAstrologySign(input.sun[0], lang) } : {})
  };
}

/** The Sun sign to send with an invite or Big 3 link, or null when the chart does not give exactly one. */
export function singleSunSign(sun: AstrologySignId[]): AstrologySignId | null {
  return sun.length === 1 ? sun[0] : null;
}
