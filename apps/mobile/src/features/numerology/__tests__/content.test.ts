import blocks from "../../../../../../packages/content/data/numerology-blocks.json";
import { arrowLines, numberFrom } from "../calc";
import { allNumerologyText, arrowLabel, arrowText, digitLine, numberBlock, numerologyContentReviewed } from "../content";

// Words the proposal (section 4) bans from numerology content, Vietnamese and English.
const bannedVi = /(?<![\p{L}])(tiền|giàu|nghèo|lương|đầu tư|hôn nhân|ly hôn|chia tay|mang thai|con cái|sức khỏe|bệnh|tuổi thọ|nghiệp|kiếp trước|số xấu|số tốt|hợp|khắc|định mệnh|sẽ)(?![\p{L}])/iu;
const bannedEn = /\b(money|rich|poor|salary|invest\w*|marriage|divorce|break-?up|pregnan\w*|children|health|illness|disease|lifespan|karma\w*|past life|destiny|fate|lucky|unlucky|compatible|incompatible|will)\b/i;

test("no banned word appears in any text of the store", () => {
  const texts = allNumerologyText();
  expect(texts.length).toBeGreaterThan(100);
  for (const text of texts) {
    expect(text).not.toMatch(bannedVi);
    expect(text).not.toMatch(bannedEn);
  }
});

test("every number 1-9 has a full block in both languages, and the voice leans rather than commands", () => {
  for (let n = 1; n <= 9; n += 1) {
    for (const language of ["vi", "en"] as const) {
      const block = numberBlock(numberFrom(n), language);
      for (const key of ["title", "leans", "light", "trap", "question"] as const) expect(block[key].length).toBeGreaterThan(8);
      expect(block.question.endsWith("?")).toBe(true);
    }
  }
  expect(JSON.stringify(blocks.numbers)).toMatch(/nghiêng về/);
});

test("11 and 22 reuse the block of 2 and 4 and add a note on the shade", () => {
  expect(numberBlock(numberFrom(11), "vi").title).toBe(numberBlock(numberFrom(2), "vi").title);
  expect(numberBlock(numberFrom(11), "vi").masterNote).toContain("11/2");
  expect(numberBlock(numberFrom(22), "en").masterNote).toContain("22/4");
  expect(numberBlock(numberFrom(7), "vi").masterNote).toBeUndefined();
});

test("digits and all eight arrows have text; Vietnamese keeps its accents", () => {
  for (let d = 1; d <= 9; d += 1) expect(digitLine(d, "vi")).toContain(`Số ${d}`);
  for (const id of arrowLines) {
    expect(arrowLabel(id, "vi").length).toBeGreaterThan(2);
    expect(arrowText(id, "en")).toContain("present");
    expect(arrowText(id, "vi")).toMatch(/có mặt/);
  }
  expect(blocks.arrows["1-2-3"].label.vi).toBe("Kế hoạch");
});

test("the store is a draft until a named human reviewer approves it", () => {
  expect(blocks.review.status).toBe("draft");
  expect(blocks.review.reviewer).toBeNull();
  expect(numerologyContentReviewed).toBe(false);
});
