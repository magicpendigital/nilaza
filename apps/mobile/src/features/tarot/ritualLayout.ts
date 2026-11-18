// Sizes and timing for the Tarot draw ritual. Pure helpers, so they can be tested without rendering.

/** Height of a card relative to its width (the artwork is 86 x 148). */
export const CARD_ASPECT = 148 / 86;

/**
 * One drawn card passes through five stages, and the flight animation value `t` runs 0 -> 5 across them.
 * The slow stages (face-down hold, flip, name hold) are what make the draw feel like a ritual: the person has
 * time to keep the question in mind before the card turns over, and to read its name before it moves away.
 */
export const FLIGHT_STAGES = [
  { key: "rise", ms: 800 }, // 0 -> 1: the card leaves the deck and comes to the centre
  { key: "hold", ms: 1500 }, // 1 -> 2: face down; the question and a breathing cue are shown
  { key: "flip", ms: 1500 }, // 2 -> 3: turns over slowly
  { key: "name", ms: 2000 }, // 3 -> 4: face up; the position, name and orientation are shown
  { key: "land", ms: 850 } // 4 -> 5: moves to its place in the spread
] as const;

export const FLIGHT_TOTAL_MS = FLIGHT_STAGES.reduce((sum, stage) => sum + stage.ms, 0);

type SlotSizingInput = {
  /** Width of the area the slots sit in. */
  areaWidth: number;
  /** Height of the visible window, used so one large card cannot push the deck below the fold. */
  viewportHeight: number;
  /** Number of cards in the spread. */
  count: number;
  /** All cards are drawn: the deck is gone, so a single card can grow to fill the space. */
  done: boolean;
};

export type SlotSizing = { width: number; gap: number };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Width of one card slot, derived from the screen instead of a fixed number.
 * - One card: moderate while the deck is still on screen (so the deck stays above the button), large once drawn.
 * - Several cards: share the row, up to a cap so wide screens do not stretch them.
 */
export function slotSizing({ areaWidth, viewportHeight, count, done }: SlotSizingInput): SlotSizing {
  const width = Math.max(areaWidth, 200);
  const cards = Math.max(1, count);
  const gap = cards >= 4 ? 8 : 12;
  if (cards === 1) {
    const heightCap = (viewportHeight * (done ? 0.5 : 0.3)) / CARD_ASPECT;
    const target = clamp(width * (done ? 0.62 : 0.42), done ? 150 : 110, done ? 220 : 160);
    return { width: Math.round(Math.min(target, Math.max(heightCap, 96))), gap };
  }
  const fit = (width - gap * (cards - 1)) / cards;
  const cap = cards === 2 ? 140 : cards === 3 ? 120 : 92;
  return { width: Math.round(Math.min(fit, cap)), gap };
}
