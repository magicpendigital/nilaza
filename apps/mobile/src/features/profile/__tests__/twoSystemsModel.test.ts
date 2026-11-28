import numerologyBlocks from "../../../../../../packages/content/data/numerology-blocks.json";
import twoSystemsBlocks from "../../../../../../packages/content/data/two-systems-blocks.json";
import { certainSigns } from "../whoAmIModel";
import { elementOfSign, moonAxis, pairBlockId, sunAxis, twoSystemsContentReviewed, twoSystemsView, type TwoSystemsInputs } from "../twoSystemsModel";
import { numberFrom } from "../../numerology/calc";

// Uses the placeholder blocks fire.1, water.2, earth.4 and air.9 (sun and moon); the reviewed content replaces them at merge.
const base: TwoSystemsInputs = { language: "vi", signs: {}, hasChart: true, birthDate: "", savedName: "" };
const inputs = (overrides: Partial<TwoSystemsInputs>): TwoSystemsInputs => ({ ...base, ...overrides });

const chart = (birthTimeKnown: boolean, sun: string[], moon: string[]) => ({
  placements: birthTimeKnown ? [{ body: "sun", sign: sun[0] }, { body: "moon", sign: moon[0] }] : [],
  angles: [],
  sampledRanges: birthTimeKnown ? [] : [{ body: "sun", possibleSigns: sun }, { body: "moon", possibleSigns: moon }],
  houses: [],
  time: { birthTimeKnown, precision: birthTimeKnown ? "exact" : "unknown" }
}) as any;

test("element of each sign comes from the zodiac guides", () => {
  expect(elementOfSign("aries")).toBe("fire");
  expect(elementOfSign("leo")).toBe("fire");
  expect(elementOfSign("taurus")).toBe("earth");
  expect(elementOfSign("virgo")).toBe("earth");
  expect(elementOfSign("gemini")).toBe("air");
  expect(elementOfSign("aquarius")).toBe("air");
  expect(elementOfSign("cancer")).toBe("water");
  expect(elementOfSign("pisces")).toBe("water");
  expect(pairBlockId("water", numberFrom(11))).toBe("water.2");
  expect(pairBlockId("earth", numberFrom(22))).toBe("earth.4");
});

test("an uncertain Sun gives no Sun axis, only the invitation", () => {
  // Sun changed signs on a day with no birth time: not guessed.
  const signs = certainSigns(chart(false, ["pisces", "aries"], ["cancer"]));
  expect(signs.sun).toBeUndefined();
  const axis = sunAxis(inputs({ signs, birthDate: "2000-03-15" }));
  expect(axis).toMatchObject({ status: "missing", reason: "needSun", fix: "editBirth" });
  // No saved chart at all: the button goes to making a chart.
  expect(sunAxis(inputs({ signs: {}, hasChart: false, birthDate: "2000-03-15" }))).toMatchObject({ reason: "needSun", fix: "makeChart" });
});

test("the Sun axis needs a valid birth date first", () => {
  expect(sunAxis(inputs({ signs: { sun: "pisces" }, birthDate: "" }))).toMatchObject({ status: "missing", reason: "needBirthDate", fix: "editBirth" });
  expect(sunAxis(inputs({ signs: { sun: "pisces" }, birthDate: "2001-02-29" }))).toMatchObject({ reason: "needBirthDate" });
});

test("life path 11 uses the block of 2 with the master note and the Number Map nuance", () => {
  const axis = sunAxis(inputs({ signs: { sun: "pisces" }, birthDate: "2000-03-15" }));
  if (axis.status !== "ready") throw new Error("expected a ready axis");
  expect(axis.element).toBe("water");
  expect(axis.number.label).toBe("11/2");
  expect(axis.blockId).toBe("water.2");
  expect(axis.block?.meet).toBe(twoSystemsBlocks.sun["water.2"].meet.vi);
  expect(axis.master?.note).toContain("11");
  expect(axis.master?.note).not.toContain("{number}");
  expect(axis.master?.nuance).toBe(numerologyBlocks.masters["11"].vi);
  expect(axis.chips.map((chip) => chip.label)).toEqual(["Mặt Trời Song Ngư · Nước", "Số chủ đạo 11/2"]);
  expect(axis.chips[0].accessibilityLabel).toBe("Mặt Trời Song Ngư, nguyên tố Nước");
});

test("life path 22 uses the block of 4", () => {
  // 04/09/2007: 4 + 9 + 9 = 22.
  const axis = sunAxis(inputs({ signs: { sun: "virgo" }, birthDate: "2007-09-04" }));
  if (axis.status !== "ready") throw new Error("expected a ready axis");
  expect(axis.number.label).toBe("22/4");
  expect(axis.blockId).toBe("earth.4");
  expect(axis.block).toBeDefined();
  expect(axis.master?.nuance).toBe(numerologyBlocks.masters["22"].vi);
});

test("a plain number has no master note", () => {
  // 04/04/2000: 4 + 4 + 2 = 10 → 1.
  const axis = sunAxis(inputs({ language: "en", signs: { sun: "aries" }, birthDate: "2000-04-04" }));
  if (axis.status !== "ready") throw new Error("expected a ready axis");
  expect(axis.blockId).toBe("fire.1");
  expect(axis.master).toBeUndefined();
  expect(axis.chips.map((chip) => chip.label)).toEqual(["Sun Aries · Fire", "Life path 1"]);
});

test("every element and root 1-9 has a block on both axes, so no pair falls back to chips only", () => {
  for (const element of ["fire", "earth", "air", "water"]) {
    for (let root = 1; root <= 9; root += 1) {
      for (const axis of [twoSystemsBlocks.sun, twoSystemsBlocks.moon] as Record<string, unknown>[]) {
        expect(axis[`${element}.${root}`]).toBeDefined();
      }
    }
  }
  // 05/01/2000: 5 + 1 + 2 = 8.
  const axis = sunAxis(inputs({ signs: { sun: "leo" }, birthDate: "2000-01-05" }));
  if (axis.status !== "ready") throw new Error("expected a ready axis");
  expect(axis.blockId).toBe("fire.8");
  expect(axis.block?.meet).toBe(twoSystemsBlocks.sun["fire.8"].meet.vi);
  expect(axis.chips).toHaveLength(2);
});

test("the Moon axis needs a certain Moon and the saved birth name, never a guess", () => {
  expect(moonAxis(inputs({ signs: { sun: "pisces" }, savedName: "Minh" }))).toMatchObject({ status: "missing", reason: "needMoon" });
  expect(moonAxis(inputs({ signs: { moon: "gemini" }, savedName: "" }))).toMatchObject({ status: "missing", reason: "needName", fix: "openNumerology" });
  expect(moonAxis(inputs({ signs: { moon: "gemini" }, savedName: "123" }))).toMatchObject({ reason: "needName" });
  expect(moonAxis(inputs({ signs: { moon: "gemini" }, savedName: null }))).toMatchObject({ status: "loading" });
  const axis = moonAxis(inputs({ signs: { moon: "gemini" }, savedName: "Minh" }));
  if (axis.status !== "ready") throw new Error("expected a ready axis");
  expect(axis.blockId).toBe("air.9");
  expect(axis.chips.map((chip) => chip.label)).toEqual(["Mặt Trăng Song Tử · Khí", "Số linh hồn 9"]);
});

test("soul urge 11 and 22 use the blocks of 2 and 4", () => {
  // LE HONG: E 5 + O 6 = 11.
  const eleven = moonAxis(inputs({ signs: { moon: "cancer" }, savedName: "Lê Hồng" }));
  if (eleven.status !== "ready") throw new Error("expected a ready axis");
  expect(eleven.number.label).toBe("11/2");
  expect(eleven.blockId).toBe("water.2");
  expect(eleven.master?.nuance).toBe(numerologyBlocks.masters["11"].vi);
  // NGO TON LINH A: 6 + 6 + 9 + 1 = 22.
  const twentyTwo = moonAxis(inputs({ signs: { moon: "taurus" }, savedName: "Ngô Tôn Linh A" }));
  if (twentyTwo.status !== "ready") throw new Error("expected a ready axis");
  expect(twentyTwo.number.label).toBe("22/4");
  expect(twentyTwo.blockId).toBe("earth.4");
});

test("the view is a draft until a named reviewer approves the content", () => {
  expect(twoSystemsView(base).draft).toBe(!twoSystemsContentReviewed);
});
