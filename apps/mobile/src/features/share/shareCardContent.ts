import type { ImageSourcePropType } from "react-native";
import type { Language } from "../../types";
import { localizeAstrologySign, type AstrologySignId } from "../astrology/contracts";
import { firstSentence, safeReadingSentence } from "../tarot/shareText";
import { MAX_SHARE_CARDS, SHARE_DISPLAY_ADDRESS, shareInviteLine, type ShareSkyDay, type ShareSurface } from "./shareLink";

export type ShareCardImage = { source: ImageSourcePropType; reversed: boolean };
export type ShareCardRow = { glyph: string; label: string; value: string };

/**
 * Look of the card inside the shared v2 frame (logo, invite line, QR, address, note). Three features have their own skin
 * (share cards v2, S1); the others keep the classic dark layout until S2.
 */
export type ShareSkin = "classic" | "quote" | "numbers" | "tarot";

/** Quote skin: a line from an approved book file, its source and the item's own question. */
export type ShareQuoteBlock = { text: string; source: string; questionLabel: string; question: string };

/** Numbers skin. root (1-9) only lights one cell of a fixed 1-9 grid: the grid is decoration, never the birth-date digits. */
export type ShareNumbersBlock = {
  kindLabel: string;
  value: string;
  root: number;
  notes: { label: string; text: string }[];
  chips: string[];
};

/**
 * Everything printed on a share card. Builders take only the fields below, so the question, notes, mood,
 * birth date, birth time, birth place and names cannot reach the image by construction.
 */
export type ShareCardModel = {
  surface: ShareSurface;
  skin: ShareSkin;
  eyebrow: string;
  title: string;
  /** Small line under the title, e.g. the Vietnamese card name under the English Tarot name. */
  subtitle?: string;
  images: ShareCardImage[];
  lines: string[];
  rows: ShareCardRow[];
  message: string;
  note: string;
  footer: string;
  /** Invitation printed next to the QR, written per feature. */
  invite: string;
  /** Library keywords (Tarot skin), at most three. */
  keywords?: string[];
  quote?: ShareQuoteBlock;
  numbers?: ShareNumbersBlock;
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
  /** Public sky of the day, only for the daily_sky surface. */
  sky?: ShareSkyDay | null;
  primary?: "image" | "link";
};

const noteText = (language: Language) => (language === "vi" ? "Để tự phản chiếu, không phải dự đoán." : "For self-reflection, not prediction.");
const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

export type ShareTodayCardInput = {
  language: Language;
  /** Name used in the share message, as the app shows it inline. */
  cardName: string;
  meaning: string;
  image: ImageSourcePropType;
  reversed?: boolean;
  /** Library English name: the title on the Tarot skin (brand rule: English name first). */
  englishName?: string;
  /** Library Vietnamese name: the small line under the title, Vietnamese only. */
  localName?: string;
  /** Library keywords for the card in the reader's language; at most three are printed. */
  keywords?: string[];
};

export function todayCardModel(input: ShareTodayCardInput): ShareCardModel {
  const vi = input.language === "vi";
  const english = input.englishName?.trim();
  const local = input.localName?.trim();
  const keywords = (input.keywords ?? []).map((word) => clip(word.trim(), 24)).filter(Boolean).slice(0, 3);
  return {
    surface: "today_card",
    skin: "tarot",
    eyebrow: vi ? "Lá bài hôm nay" : "Card of the day",
    title: english || input.cardName,
    ...(vi && english && local && local !== english ? { subtitle: local } : {}),
    images: [{ source: input.image, reversed: Boolean(input.reversed) }],
    lines: [],
    rows: [],
    message: clip(firstSentence(input.meaning) || input.meaning.trim(), 150),
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    invite: shareInviteLine(input.language, "today_card"),
    ...(keywords.length ? { keywords } : {}),
    cardNames: [input.cardName]
  };
}

export type ShareReadingCard = { position: string; name: string; reversed: boolean; image: ImageSourcePropType };

export function readingModel(input: { language: Language; cards: ShareReadingCard[]; summary: string; question?: string | null }): ShareCardModel {
  const vi = input.language === "vi";
  const cards = input.cards.slice(0, MAX_SHARE_CARDS);
  return {
    surface: "tarot_reading",
    skin: "classic",
    eyebrow: vi ? "Trải bài của mình" : "My reading",
    title: cards.length === 1 ? cards[0].name : vi ? `${cards.length} lá bài` : `${cards.length} cards`,
    images: cards.map((card) => ({ source: card.image, reversed: card.reversed })),
    lines: cards.map((card) => `${card.position} · ${card.name}${card.reversed ? ` · ${vi ? "Ngược" : "Reversed"}` : ""}`),
    rows: [],
    message: clip(safeReadingSentence(input.summary, input.question), 150),
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    invite: shareInviteLine(input.language, "tarot_reading"),
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
    skin: "classic",
    eyebrow: vi ? "Bản đồ sao của mình" : "My star chart",
    title: input.headline ? clip(input.headline, 90) : vi ? "Bầu trời của mình" : "My sky",
    images: [],
    lines: [],
    rows,
    message: "",
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    invite: shareInviteLine(input.language, "astro_big3"),
    ...(input.sun.length === 1 ? { signName: localizeAstrologySign(input.sun[0], lang) } : {})
  };
}

export type ShareNumerologyInput = {
  language: Language;
  /** Labels such as "11/2". Numbers only: the birth name and birth date never reach the card. */
  lifePath: string;
  birthday: string;
  expression?: string;
  /** Short title of the life-path block, e.g. "Người lắng nghe". */
  lifePathTitle?: string;
  /** Root digit 1-9 of the life path: lights one cell of the decorative grid. */
  lifePathRoot?: number;
  /** The approved block's "light" line and question (numerology-blocks.json). */
  light?: string;
  question?: string;
};

export function numerologyModel(input: ShareNumerologyInput): ShareCardModel {
  const vi = input.language === "vi";
  const rows: ShareCardRow[] = [
    { glyph: "✦", label: vi ? "Số chủ đạo" : "Life path", value: input.lifePath },
    { glyph: "✧", label: vi ? "Số ngày sinh" : "Birthday", value: input.birthday },
    ...(input.expression ? [{ glyph: "✺", label: vi ? "Số biểu đạt" : "Expression", value: input.expression }] : [])
  ];
  const rootValue = input.lifePathRoot ?? 0;
  const root = Number.isInteger(rootValue) && rootValue >= 1 && rootValue <= 9 ? rootValue : 0;
  const light = input.light?.trim();
  const question = input.question?.trim();
  const notes = [
    ...(light ? [{ label: vi ? "Điểm sáng" : "Light", text: clip(light, 120) }] : []),
    ...(question ? [{ label: vi ? "Câu hỏi" : "Question", text: clip(question, 120) }] : [])
  ];
  return {
    surface: "numerology_map",
    skin: "numbers",
    eyebrow: vi ? "Bản đồ số của mình" : "My number map",
    title: input.lifePathTitle ? clip(input.lifePathTitle, 60) : vi ? "Những con số của mình" : "My numbers",
    images: [],
    lines: [],
    rows,
    message: "",
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    invite: shareInviteLine(input.language, "numerology_map"),
    numbers: {
      kindLabel: vi ? "Số chủ đạo" : "Life path",
      value: input.lifePath,
      root,
      notes,
      chips: [
        `${vi ? "Ngày sinh" : "Birthday"} · ${input.birthday}`,
        ...(input.expression ? [`${vi ? "Biểu đạt" : "Expression"} · ${input.expression}`] : [])
      ]
    }
  };
}

export type ShareDailySkyInput = {
  language: Language;
  /** Sign the Moon is in today: the same for everyone on that day. */
  moonSign: AstrologySignId;
  /** Localized phase name, e.g. "Trăng gần tròn". */
  phaseName: string;
  /** Public sky line for the day (the tone of the Moon's sign and decan); it never reads the person's chart. */
  headline: string;
};

/** Today's sky card. It carries only the public sky of the day, never the chart, birth data or name of the sender. */
export function dailySkyModel(input: ShareDailySkyInput): ShareCardModel {
  const vi = input.language === "vi";
  const sign = localizeAstrologySign(input.moonSign, vi ? "vi" : "en");
  return {
    surface: "daily_sky",
    skin: "classic",
    eyebrow: vi ? "Bầu trời hôm nay" : "Today's sky",
    title: vi ? `Trăng ở ${sign}` : `Moon in ${sign}`,
    images: [],
    lines: [],
    rows: input.phaseName.trim() ? [{ glyph: "☽", label: vi ? "Pha trăng" : "Moon phase", value: clip(input.phaseName.trim(), 40) }] : [],
    message: clip(input.headline.trim(), 150),
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    invite: shareInviteLine(input.language, "daily_sky")
  };
}

export type ShareBookQuoteInput = {
  language: Language;
  /** The quote line from an approved book file, in the reader's language. */
  quote: string;
  /** Book title and reference, e.g. "Đạo Đức Kinh · Chương 9". */
  source: string;
  /** The item's own question from the same file. */
  question: string;
};

/** "Một câu cho hôm nay" card. Only the approved quote, its source and its question: never saved quotes, journal or chat. */
export function bookQuoteModel(input: ShareBookQuoteInput): ShareCardModel {
  const vi = input.language === "vi";
  const source = clip(input.source.trim(), 70);
  const question = input.question.trim();
  return {
    surface: "book_quote",
    skin: "quote",
    eyebrow: vi ? "Một câu cho hôm nay" : "A line for today",
    title: source,
    images: [],
    lines: [],
    rows: [],
    message: "",
    note: noteText(input.language),
    footer: SHARE_DISPLAY_ADDRESS,
    invite: shareInviteLine(input.language, "book_quote"),
    quote: {
      text: clip(input.quote.trim(), 320),
      source,
      questionLabel: vi ? "Câu hỏi cho mình" : "A question for me",
      question: clip(question, 160)
    }
  };
}

/** The Sun sign to send with an invite or Big 3 link, or null when the chart does not give exactly one. */
export function singleSunSign(sun: AstrologySignId[]): AstrologySignId | null {
  return sun.length === 1 ? sun[0] : null;
}
