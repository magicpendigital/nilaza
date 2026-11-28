import React from "react";
import { render } from "@testing-library/react-native";
import { create } from "qrcode/lib/core/qrcode";
import { buildShareQrUrl } from "../shareLink";
import { fitQuoteSize, ShareCardView } from "../ShareCardView";
import { qrPath, ShareQr } from "../ShareQr";
import { bookQuoteModel, numerologyModel } from "../shareCardContent";

test("encodes the QR address into one path of dark modules with a quiet zone", () => {
  const url = buildShareQrUrl("vi", "numerology_map");
  const code = qrPath(url);
  const { modules } = create(url, { errorCorrectionLevel: "M" });
  expect(code?.size).toBe(modules.size + 4);
  const dark = Array.from(modules.data).filter(Boolean).length;
  expect(code?.d.match(/M/g)).toHaveLength(dark);
  // The longest address (numbers page) stays at version 7, which the 72/80-unit tile prints at about 4.4 px per module.
  expect(modules.size).toBeLessThanOrEqual(45);
});

test("renders the QR tile, hidden from screen readers", () => {
  const screen = render(<ShareQr url={buildShareQrUrl("en", "book_quote")} size={64} />);
  expect(screen.getByTestId("share-card-qr", { includeHiddenElements: true })).toBeTruthy();
});

test("shrinks a long quote instead of letting the frame cut it", () => {
  const short = fitQuoteSize("x".repeat(60), 200, 312);
  const long = fitQuoteSize("x".repeat(355), 200, 312);
  expect(long.fontSize).toBeLessThan(short.fontSize);
  expect(long.fontSize).toBeGreaterThanOrEqual(13);
});

test("draws the quote and number skins in both formats with the lit root cell", () => {
  const quote = bookQuoteModel({ language: "vi", quote: "Cầm cho đầy mãi, chẳng bằng dừng đúng lúc.", source: "Đạo Đức Kinh · Chương 9", question: "Thế nào là đủ với bạn?" });
  const numbers = numerologyModel({ language: "vi", lifePath: "7", birthday: "3", lifePathTitle: "Người tìm hiểu", lifePathRoot: 7 });
  for (const format of ["post", "story"] as const) {
    const q = render(<ShareCardView model={quote} width={360} format={format} qrUrl={buildShareQrUrl("vi", "book_quote")} />);
    expect(q.getByTestId(`share-card-quote-${format}`)).toBeTruthy();
    expect(q.getByText("CÂU HỎI CHO MÌNH")).toBeTruthy();
    expect(q.getByText("Nhận một câu mỗi sáng từ kho tri thức cổ")).toBeTruthy();
    const n = render(<ShareCardView model={numbers} width={360} format={format} />);
    expect(n.getByTestId("share-card-number").props.children).toBe("7");
    const lit = n.getByTestId("share-card-grid-lit", { includeHiddenElements: true });
    expect(lit).toBeTruthy();
    expect(n.queryByTestId("share-card-qr", { includeHiddenElements: true })).toBeNull();
  }
});
