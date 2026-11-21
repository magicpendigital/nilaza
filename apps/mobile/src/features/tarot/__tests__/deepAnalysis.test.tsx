import { fireEvent, render } from "@testing-library/react-native";
import { TarotDeepAnalysis } from "../TarotDeepAnalysis";
import { tarotResultSource, tarotSourceLabel } from "../readingPresentation";

// Tarot v2 pack 0 (Owner 2026-11-16): the free reading is Nilaza's own; the AI button only asks.
describe("deep analysis button", () => {
  it("only asks for the analysis when pressed and shows no Nil number", () => {
    const onPress = jest.fn();
    const screen = render(<TarotDeepAnalysis language="vi" busy={false} busyLabel="Đang diễn giải..." onPress={onPress} />);
    expect(screen.queryByText(/\bNil\b/)).toBeNull();
    expect(screen.getByText(/Chỉ tính lượt khi bài đọc được trả về/)).toBeTruthy();
    expect(screen.getByText(/Đọc chính câu hỏi bạn vừa viết/)).toBeTruthy();
    expect(screen.queryByText(/giống nhau với ai/)).toBeNull();
    fireEvent.press(screen.getByText("Đọc chuyên sâu cho câu hỏi này"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is disabled and says so while the AI is working, and speaks English", () => {
    const onPress = jest.fn();
    const busy = render(<TarotDeepAnalysis language="vi" busy busyLabel="Đang diễn giải..." onPress={onPress} />);
    fireEvent.press(busy.getByText("Đang diễn giải..."));
    expect(onPress).not.toHaveBeenCalled();
    const en = render(<TarotDeepAnalysis language="en" busy={false} busyLabel="Working..." onPress={onPress} />);
    expect(en.getByText("Deep reading for this question")).toBeTruthy();
  });
});

describe("reading source line", () => {
  it("calls a server draw without an answer Nilaza's reference reading, not an AI failure", () => {
    expect(tarotResultSource("fallback")).toBe("reference");
    const vi = tarotSourceLabel({ source: "reference", hasDrawId: true, cardCount: 3, language: "vi" });
    expect(vi).toContain("Bài đọc Nilaza");
    expect(vi).toContain("ý nghĩa truyền thống");
    expect(vi).not.toContain("chưa có phân tích AI");
    expect(vi).not.toContain("AI chưa hoàn tất");
    expect(tarotSourceLabel({ source: "reference", hasDrawId: false, cardCount: 3, language: "vi" })).toContain("AI chưa hoàn tất");
    expect(tarotSourceLabel({ source: "ai", hasDrawId: true, cardCount: 3, language: "vi" })).toContain("3 lá");
    expect(tarotSourceLabel({ source: "blocked", hasDrawId: true, cardCount: 1, language: "en" })).toBe("Safety response");
  });
});
