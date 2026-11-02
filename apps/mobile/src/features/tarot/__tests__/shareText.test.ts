import { readingShareText } from "../shareText";

const cards = [
  { position: "Quá khứ", name: "Six of Swords (Sáu Kiếm)", reversed: false },
  { position: "Hiện tại", name: "Page of Wands (Tiểu Đồng Gậy)", reversed: true }
];

test("shares card lines, one message sentence and the Nilaza line only (analysis TA-11)", () => {
  const text = readingShareText({ cards, summary: "Bạn đang rời một giai đoạn khó. Phần còn lại của bài đọc rất dài.", question: "Mình có nên nghỉ việc không?", language: "vi" });
  expect(text).toBe([
    "Quá khứ · Six of Swords (Sáu Kiếm) · Xuôi",
    "Hiện tại · Page of Wands (Tiểu Đồng Gậy) · Ngược",
    "",
    "Bạn đang rời một giai đoạn khó.",
    "",
    "Nilaza — để tự phản chiếu"
  ].join("\n"));
  expect(text).not.toContain("nghỉ việc");
});

test("a summary sentence that quotes the private question is left out", () => {
  const text = readingShareText({ cards, summary: "Với câu hỏi mình có nên nghỉ việc không, các lá mời bạn chậm lại.", question: "mình có nên nghỉ việc không", language: "vi" });
  expect(text).not.toContain("nghỉ việc");
  expect(text.endsWith("Nilaza — để tự phản chiếu")).toBe(true);
});
