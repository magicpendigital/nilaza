import golden from "../../../../../../docs/proposals/data/numerology-golden-2026-11-23.json";
import { arrowLines, buildNumerologyMap, nameNumbers, normalizeName, parseBirthDate, reduceNumber } from "../calc";

// The Owner chose variant masters11_22_only on 24/11/2026 (D1 drops 33).
const cases = golden.variants.masters11_22_only as any[];

test("the golden set is the version the Owner chose", () => {
  expect(golden.status).toContain("masters11_22_only");
  expect(cases).toHaveLength(28);
});

describe.each(cases.map((item) => [item.id, item] as const))("golden case %s", (_id, item) => {
  const map = buildNumerologyMap(item.birth, item.name)!;

  test("life path (D2: keep 11/22 inside the parts)", () => {
    expect(map.lifePath.label).toBe(item.lifePath.keepMastersInParts);
  });

  test("birthday number", () => {
    expect(map.birthday.label).toBe(item.birthdayNumber);
  });

  test("grid counts and arrows", () => {
    expect(map.grid.counts).toEqual(Object.fromEntries(Object.entries(item.gridCounts).map(([k, v]) => [k, v])));
    expect([...map.grid.full].sort()).toEqual([...item.arrowsFull].sort());
    expect([...map.grid.empty].sort()).toEqual([...item.arrowsEmpty].sort());
  });

  test("name numbers", () => {
    if (!item.name?.trim()) {
      expect(map.name).toBeNull();
      return;
    }
    const expected = item.nameNumbers;
    expect(map.name!.normalized).toBe(expected.normalized);
    expect(map.name!.totals).toEqual({ all: expected.total, vowels: expected.vowels, consonants: expected.consonants });
    expect(map.name!.expression.label).toBe(expected.expression);
    expect(map.name!.soulUrge.label).toBe(expected.soulUrge);
    expect(map.name!.personality.label).toBe(expected.personality);
  });
});

test("the personal-cycle sample birth date (G28, mockup) gives 8 / 2 / 6 for Phạm Gia Linh", () => {
  const map = buildNumerologyMap("2000-03-15", "Phạm Gia Linh")!;
  expect([map.name!.expression.label, map.name!.soulUrge.label, map.name!.personality.label]).toEqual(["8", "2", "6"]);
  expect(map.lifePath.label).toBe("11/2");
});

describe("dates that cannot exist", () => {
  test.each(["1900-02-29", "2001-02-29", "2000-04-31", "2000-03-00", "2000-13-01", "2000-3-5", ""])("%s", (value) => {
    expect(parseBirthDate(value)).toBeNull();
    expect(buildNumerologyMap(value, "An")).toBeNull();
  });
  test.each(["2000-02-29", "2004-02-29"])("%s is a real leap day", (value) => {
    expect(buildNumerologyMap(value)).not.toBeNull();
  });
});

describe("name normalisation", () => {
  test("the d-stroke is handled before accents", () => {
    expect(normalizeName("Đỗ Đình Đạt")).toBe("DO DINH DAT");
  });
  test("a hyphen separates words so the Y rule sees two words", () => {
    expect(normalizeName("Nguyễn-Thị")).toBe("NGUYEN THI");
    expect(nameNumbers("Hy-Yen")?.normalized).toBe("HY YEN");
  });
  test("NFD, NFC, old accent placement, case and spacing give one result", () => {
    const base = nameNumbers("Phạm Thị Thúy")!;
    for (const variant of ["Phạm Thị Thúy".normalize("NFD"), "Phạm Thị Thuý", "  PHẠM   THỊ  THÚY ", "pham thi thuy"]) {
      expect(nameNumbers(variant)).toEqual(base);
    }
  });
  test("digits and symbols are dropped; no letters gives no name numbers", () => {
    expect(normalizeName("An 2 ★ Bình")).toBe("AN BINH");
    expect(nameNumbers("1234 ★")).toBeNull();
    expect(nameNumbers("")).toBeNull();
  });
});

describe("rule Y (D3)", () => {
  // Soul urge counts vowels only: with Y a vowel the total changes.
  test("Y alone and Y after a consonant are vowels", () => {
    expect(nameNumbers("Y")!.totals.vowels).toBe(7);
    expect(nameNumbers("Thy")!.totals.vowels).toBe(7);
  });
  test("Y in a word that has another vowel is a consonant", () => {
    expect(nameNumbers("Duyên")!.totals).toEqual({ all: 4 + 3 + 7 + 5 + 5, vowels: 3 + 5, consonants: 4 + 7 + 5 });
    expect(nameNumbers("Quỳnh")!.totals.vowels).toBe(3);
  });
  test("a word's Y is judged inside that word only", () => {
    expect(nameNumbers("Anh Y")!.totals.vowels).toBe(1 + 7);
  });
});

describe("reduction", () => {
  test("33 reduces to 6, 11 and 22 stay (D1)", () => {
    expect(reduceNumber(33)).toBe(6);
    expect(reduceNumber(11)).toBe(11);
    expect(reduceNumber(22)).toBe(22);
    expect(reduceNumber(29)).toBe(11);
    expect(reduceNumber(38)).toBe(11);
    expect(reduceNumber(10)).toBe(1);
  });
  test("number 1 is a valid life path (11% of users)", () => {
    expect(buildNumerologyMap("2000-01-01")!.lifePath.label).toBe("4");
  });
});

test("the grid ignores zeros and never adds the life path", () => {
  const map = buildNumerologyMap("2000-01-01")!;
  expect(map.grid.counts).toEqual({ 1: 2, 2: 1 });
  expect(arrowLines).toHaveLength(8);
});
