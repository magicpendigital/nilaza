// Bản đồ số, lớp 1-2 (Lô 3). Pure calculation: no React, no storage, no network.
// Rules: docs/proposals/ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23.vi.md section 3, with the Owner's choices of 24/11/2026:
// D1 masters are 11 and 22 only (33 reduces to 6); D2 keep 11/22 inside the day, month and year parts of the life path;
// D3 the letter Y is a vowel only in a word that has no A, E, I, O or U.

export type NumerologyNumber = {
  /** The shown value: 1-9, 11 or 22. */
  value: number;
  /** The single digit it reduces to (11 → 2, 22 → 4). */
  root: number;
  master: boolean;
  /** "6", "11/2" or "22/4". */
  label: string;
};

const masters = [11, 22];
const digitSum = (n: number) => String(n).split("").reduce((sum, d) => sum + Number(d), 0);

/** Reduces to 1-9, stopping at 11 and 22 when `keepMasters` is set. */
export function reduceNumber(n: number, keepMasters = true): number {
  let value = Math.abs(Math.trunc(n));
  while (value > 9 && !(keepMasters && masters.includes(value))) value = digitSum(value);
  return value;
}

export function numberFrom(value: number): NumerologyNumber {
  const master = masters.includes(value);
  const root = master ? digitSum(value) : value;
  return { value, root, master, label: master ? `${value}/${root}` : String(value) };
}

const reduced = (n: number) => numberFrom(reduceNumber(n));

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const monthDays = (month: number, year: number) => (month === 2 ? (isLeap(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31);

export type BirthParts = { year: number; month: number; day: number };

/** Parses YYYY-MM-DD and rejects dates that do not exist (29/02/1900, 29/02/2001, 31/04, day 0). */
export function parseBirthDate(value: string): BirthParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthDays(month, year)) return null;
  return { year, month, day };
}

/** Life path: reduce day, month and year separately (keeping 11/22), add them, reduce again. */
export function lifePathNumber({ year, month, day }: BirthParts): NumerologyNumber {
  return reduced(reduceNumber(day) + reduceNumber(month) + reduceNumber(year));
}

/** Birthday number: the day of the month. 11, 22 and 29 (→ 11/2) carry the master label. */
export function birthdayNumber({ day }: BirthParts): NumerologyNumber {
  return reduced(day);
}

// A=1 … I=9, J=1 … R=9, S=1 … Z=8 (Y=7, W=5).
const letterValue = (letter: string) => ((letter.charCodeAt(0) - 65) % 9) + 1;

/**
 * Upper-case Latin letters only, words separated by one space. The d-stroke is replaced before accents are
 * removed because Unicode decomposition cannot split it. Hyphens become spaces so "Nguyễn-Thị" is two words.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFC")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-‐‑–—]/g, " ")
    .replace(/[^A-Za-z\s]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

const plainVowels = new Set(["A", "E", "I", "O", "U"]);

/** True when the letter at `index` of `word` counts as a vowel (D3 for Y). */
function isVowelAt(word: string, index: number): boolean {
  const letter = word[index];
  if (plainVowels.has(letter)) return true;
  if (letter !== "Y") return false;
  return ![...word].some((other) => plainVowels.has(other));
}

export type NameNumbers = {
  normalized: string;
  /** Sum of the letters before reduction, kept so a person can check the arithmetic. */
  totals: { all: number; vowels: number; consonants: number };
  expression: NumerologyNumber;
  soulUrge: NumerologyNumber;
  personality: NumerologyNumber;
};

/** Expression (all letters), soul urge (vowels) and personality (consonants) from the whole name. Null for a name with no letters. */
export function nameNumbers(name: string): NameNumbers | null {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  const totals = { all: 0, vowels: 0, consonants: 0 };
  for (const word of normalized.split(" ")) {
    for (let index = 0; index < word.length; index += 1) {
      const value = letterValue(word[index]);
      totals.all += value;
      if (isVowelAt(word, index)) totals.vowels += value;
      else totals.consonants += value;
    }
  }
  return { normalized, totals, expression: reduced(totals.all), soulUrge: reduced(totals.vowels), personality: reduced(totals.consonants) };
}

export const gridDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** Rows of the 3x3 chart: top 3-6-9, middle 2-5-8, bottom 1-4-7 (columns of the layout below). */
export const gridLayout: readonly (readonly number[])[] = [[3, 6, 9], [2, 5, 8], [1, 4, 7]];

/** The eight lines of the grid. Names are working labels, not a standard (see arrowLabels in content). */
export const arrowLines = ["1-2-3", "4-5-6", "7-8-9", "1-4-7", "2-5-8", "3-6-9", "1-5-9", "3-5-7"] as const;
export type ArrowId = (typeof arrowLines)[number];

export type BirthGrid = {
  /** How many times each digit 1-9 appears in DDMMYYYY. Zeros are ignored; the life path is not added. */
  counts: Record<number, number>;
  full: ArrowId[];
  empty: ArrowId[];
};

export function birthGrid({ year, month, day }: BirthParts): BirthGrid {
  const text = `${String(day).padStart(2, "0")}${String(month).padStart(2, "0")}${String(year).padStart(4, "0")}`;
  const counts: Record<number, number> = {};
  for (const char of text) {
    const digit = Number(char);
    if (digit > 0) counts[digit] = (counts[digit] ?? 0) + 1;
  }
  const lines = arrowLines.map((id) => ({ id, digits: id.split("-").map(Number) }));
  return {
    counts,
    full: lines.filter((line) => line.digits.every((d) => counts[d])).map((line) => line.id),
    empty: lines.filter((line) => line.digits.every((d) => !counts[d])).map((line) => line.id)
  };
}

export type NumerologyMap = {
  birth: BirthParts;
  lifePath: NumerologyNumber;
  birthday: NumerologyNumber;
  /** Null when no name was given, so the screen hides these instead of showing made-up numbers. */
  name: NameNumbers | null;
  grid: BirthGrid;
};

/** The whole layer 1-2 map, or null when the date does not exist. */
export function buildNumerologyMap(birthDate: string, name = ""): NumerologyMap | null {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  return { birth, lifePath: lifePathNumber(birth), birthday: birthdayNumber(birth), name: nameNumbers(name), grid: birthGrid(birth) };
}
