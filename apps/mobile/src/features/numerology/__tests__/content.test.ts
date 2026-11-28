import blocks from "../../../../../../packages/content/data/numerology-blocks.json";
import { arrowLines, numberFrom } from "../calc";
import * as content from "../content";
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

test("the store is approved by a named reviewer (Owner, 25/11/2026)", () => {
  expect(blocks.review.status).toBe("approved");
  expect(blocks.review.reviewer).toBe("Owner");
  expect(blocks.review.reviewedAt).toBe("2026-11-25");
  expect(numerologyContentReviewed).toBe(true);
});

test("Lô 5 keys: personal cycles, pinnacles, challenges, relationship and the private-message card exist in both languages", () => {
  const texts = allNumerologyText();
  for (const language of ["vi", "en"] as const) {
    for (let n = 1; n <= 9; n += 1) {
      const year = content.personalYearBlock(n, language);
      expect(year.title.length).toBeGreaterThan(3);
      expect(year.leans.length).toBeGreaterThan(8);
      expect(year.question.endsWith("?")).toBe(true);
      expect(content.personalMonthLine(n, language).length).toBeGreaterThan(8);
      expect(content.personalDayLine(n, language).length).toBeGreaterThan(8);
      expect(content.relationshipLine(numberFrom(n), language).length).toBeGreaterThan(8);
    }
    for (const value of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22]) expect(content.pinnacleNumberLine(numberFrom(value), language).length).toBeGreaterThan(8);
    for (const stage of [1, 2, 3, 4] as const) expect(content.pinnacleStageLine(stage, language).length).toBeGreaterThan(8);
    for (let c = 0; c <= 8; c += 1) expect(content.challengeLine(c, language).length).toBeGreaterThan(8);
    for (const relation of ["same", "sameParity", "differentParity"] as const) {
      const pair = content.relationshipPair(relation, language);
      expect(pair.common.length).toBeGreaterThan(8);
      expect(pair.tension.length).toBeGreaterThan(8);
    }
    for (const frame of [content.personalYearFrame, content.personalMonthFrame, content.personalDayFrame, content.pinnacleFrame, content.challengeFrame, content.relationshipFrame, content.relationshipPrivacyNote]) {
      expect(frame(language).length).toBeGreaterThan(8);
    }
    const card = content.privateMessageCard(language);
    expect(card.title.length).toBeGreaterThan(3);
    expect(card.soon.length).toBeGreaterThan(3);
    // 2026-11-25: every private-message line exists in both languages and is reached by the banned-word walk.
    for (const [key, value] of Object.entries(card)) {
      expect([key, value.length > 1]).toEqual([key, true]);
      expect(texts).toContain(value);
    }
  }
  expect(content.privateMessageCard("vi").consentBody).toContain("Họ tên và ngày sinh của bạn ở lại trên điện thoại này");
  expect(content.privateMessageCard("vi").soon).toBe("Sắp có");
  // The walk used by the banned-word test reaches the new keys.
  expect(texts).toContain(content.relationshipPair("same", "vi").common);
  expect(texts).toContain(content.challengeLine(0, "en"));
  // No past-life wording for challenges, and Vietnamese keeps its accents.
  expect(content.challengeLine(0, "vi")).toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/);
  expect(texts.join(" ")).not.toMatch(/kiếp trước|past life/i);
});

test("2026-11-26 extra copy: every digit reading, chart line and Hợp số string exists in both languages", () => {
  for (const language of ["vi", "en"] as const) {
    for (let d = 1; d <= 9; d += 1) {
      const absent = content.digitReading(d, 0, language);
      const once = content.digitReading(d, 1, language);
      const many = content.digitReading(d, 3, language);
      expect(absent.title.length).toBeGreaterThan(3);
      expect(absent.body).not.toBe(once.body);
      expect(once.many).toBeUndefined();
      expect(many.many?.length).toBeGreaterThan(8);
      expect(content.relationshipNeed(numberFrom(d), language).length).toBeGreaterThan(8);
    }
    for (const key of ["presentCount", "strongest", "noRepeat", "row", "repeatHint", "emptyHint", "times"] as const) expect(content.chartCopy(key, language).length).toBeGreaterThan(2);
    for (const relation of ["same", "sameParity", "differentParity"] as const) {
      expect(content.relationBadge(relation, language).length).toBeGreaterThan(2);
      expect(content.relationQuestion(relation, language).endsWith("?")).toBe(true);
    }
    const copy = content.relationshipExtra(language);
    for (const value of Object.values(copy)) expect(value.length).toBeGreaterThan(1);
  }
  expect(content.fill(content.chartCopy("presentCount", "vi"), { n: 6 })).toContain("6");
});

test("the 26/11 extra copy is approved by a named reviewer (Owner, 27/11/2026)", () => {
  expect(content.numerologyExtraReviewed).toBe(true);
});
