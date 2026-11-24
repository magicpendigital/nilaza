import { fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import archetypes from "../../../../../../packages/content/data/personas-archetypes.json";
import { ReaderMismatchSheet } from "../ReaderMismatchSheet";
import { ReaderSuggestPanel, resetReaderSuggestState, useReaderSuggestion, type ReaderOption, type ReaderSuggestReading } from "../ReaderSuggestPanel";
import { suggestTarotReader } from "../readerSuggest";

const SLUGS = ["the-mystic", "inner-child-healer", "the-love-oracle", "the-shadow-mirror", "the-clear-strategist", "the-star-weaver"];
const personas = (archetypes as Array<{ slug: string; themes: string[]; name: { vi: string; en: string } }>).filter((p) => SLUGS.includes(p.slug));
const guides = personas.map((p) => ({ slug: p.slug, themes: p.themes, name: p.name }));
const readers: ReaderOption[] = personas.map((p) => ({ slug: p.slug, name: p.name.vi, role: `role ${p.slug}`, image: { uri: `${p.slug}.png` } }));
const nameOf = (slug: string) => readers.find((r) => r.slug === slug)!.name;

const careerReading: ReaderSuggestReading = {
  id: "r-career",
  drawId: "draw-1",
  topic: "career",
  question: "Sếp mới hay soi, mình có nên xin chuyển nhóm?",
  deckId: "moon-garden",
  cards: [{ cardId: "minor-swords-two", orientation: "upright", positionKey: "card", suit: "swords", arcana: "minor", name: { vi: "Hai Kiếm", en: "Two of Swords" } }]
};

describe("ReaderSuggestPanel", () => {
  const suggestion = suggestTarotReader({ ...careerReading, guides, language: "vi" });

  it("shows the topic chip, the best fit with reasons and two alternatives", () => {
    const screen = render(<ReaderSuggestPanel language="vi" suggestion={suggestion} readers={readers} selectedSlug={suggestion.primary} onSelect={jest.fn()} onAsk={jest.fn()} />);
    expect(screen.getByText("HỢP NHẤT VỚI CÂU HỎI NÀY")).toBeTruthy();
    expect(screen.getByText(nameOf("the-clear-strategist"))).toBeTruthy();
    expect(screen.getByText(/Khớp chủ đề câu hỏi/)).toBeTruthy();
    expect(screen.getByText("HOẶC NHÌN THEO GÓC KHÁC")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Không đúng? Xem tất cả người dẫn" })).toBeTruthy();
    expect(screen.getByText(/nhân vật AI/)).toBeTruthy();
  });

  it("asks with the reader, with or without an opener", () => {
    const onAsk = jest.fn();
    const screen = render(<ReaderSuggestPanel language="vi" suggestion={suggestion} readers={readers} selectedSlug={suggestion.primary} onSelect={jest.fn()} onAsk={onAsk} />);
    fireEvent.press(screen.getByText(`Hỏi tiếp với ${nameOf("the-clear-strategist")}`));
    expect(onAsk).toHaveBeenLastCalledWith("the-clear-strategist");
    fireEvent.press(screen.getByText(suggestion.openers[0]));
    expect(onAsk).toHaveBeenLastCalledWith("the-clear-strategist", suggestion.openers[0]);
  });

  it("picking an alternative or the full list calls onSelect; a non-suggested pick can go back", () => {
    const onSelect = jest.fn();
    const alt = suggestion.alternatives[0].slug;
    const screen = render(<ReaderSuggestPanel language="vi" suggestion={suggestion} readers={readers} selectedSlug={alt} onSelect={onSelect} onAsk={jest.fn()} />);
    expect(screen.getByText("NGƯỜI DẪN BẠN CHỌN")).toBeTruthy();
    fireEvent.press(screen.getByText(`Quay về gợi ý: ${nameOf(suggestion.primary)}`));
    expect(onSelect).toHaveBeenLastCalledWith(suggestion.primary);
    fireEvent.press(screen.getByText("Xem tất cả người dẫn"));
    fireEvent.press(screen.getAllByText(nameOf("the-mystic")).at(-1)!);
    expect(onSelect).toHaveBeenLastCalledWith("the-mystic");
  });
});

describe("useReaderSuggestion", () => {
  beforeEach(() => resetReaderSuggestState());

  it("auto-selects the rule pick once per spread and logs it shown", () => {
    const onAutoSelect = jest.fn();
    const onShown = jest.fn();
    const props = { reading: careerReading, guides, language: "vi" as const, aiEnabled: true, requestAi: jest.fn(), onAutoSelect, onShown };
    const first = renderHook(() => useReaderSuggestion(props));
    expect(first.result.current.suggestion?.primary).toBe("the-clear-strategist");
    expect(onAutoSelect).toHaveBeenCalledWith("the-clear-strategist");
    expect(onShown).toHaveBeenCalledWith({ slug: "the-clear-strategist", topic: "career", source: "rules" });
    expect(props.requestAi).not.toHaveBeenCalled();
    first.unmount();
    renderHook(() => useReaderSuggestion(props));
    expect(onAutoSelect).toHaveBeenCalledTimes(1);
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  const vague: ReaderSuggestReading = {
    id: "r-vague", drawId: "draw-2", topic: "open", question: "", deckId: "moon-garden",
    cards: [
      { cardId: "minor-wands-three", orientation: "upright", positionKey: "a", suit: "wands", arcana: "minor" },
      { cardId: "minor-cups-four", orientation: "upright", positionKey: "b", suit: "cups", arcana: "minor" },
      { cardId: "minor-swords-four", orientation: "upright", positionKey: "c", suit: "swords", arcana: "minor" }
    ]
  };

  it("low confidence asks the AI tier and swaps when the person has not tapped", async () => {
    const onAutoSelect = jest.fn();
    const requestAi = jest.fn(async () => ({ slug: "the-star-weaver", confidence: 0.8, intent: "dreams", source: "llm" as const, experiment: null }));
    const hook = renderHook(() => useReaderSuggestion({ reading: vague, guides, language: "vi", aiEnabled: true, requestAi, onAutoSelect }));
    expect(requestAi).toHaveBeenCalledWith("draw-2", guides.map((g) => g.slug));
    await waitFor(() => expect(hook.result.current.suggestion?.primary).toBe("the-star-weaver"));
    expect(hook.result.current.source).toBe("ai");
    expect(onAutoSelect).toHaveBeenLastCalledWith("the-star-weaver");
  });

  it("tags the shown event with the campaign of the AI answer, also when the AI agrees with the rules", async () => {
    const exp = { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "B" };
    const onShown = jest.fn();
    const requestAi = jest.fn(async () => ({ slug: "the-star-weaver", confidence: 0.8, intent: "dreams", source: "llm" as const, experiment: exp }));
    renderHook(() => useReaderSuggestion({ reading: { ...vague, id: "r-vague-exp", drawId: "draw-exp" }, guides, language: "vi", aiEnabled: true, requestAi, onAutoSelect: jest.fn(), onShown }));
    await waitFor(() => expect(onShown).toHaveBeenCalledWith({ slug: "the-star-weaver", topic: null, source: "ai", experiment: exp }));
    const same = jest.fn();
    const agree = jest.fn(async (): Promise<never> => ({ slug: "the-mystic", confidence: 0.5, intent: null, source: "llm", experiment: exp }) as never);
    renderHook(() => useReaderSuggestion({ reading: { ...vague, id: "r-vague-exp2", drawId: "draw-exp2" }, guides, language: "vi", aiEnabled: true, requestAi: agree, onAutoSelect: jest.fn(), onShown: same }));
    await waitFor(() => expect(same).toHaveBeenCalledTimes(1));
    expect(same.mock.calls[0][0].experiment).toEqual(exp);
  });

  it("does not swap after the person chose a reader", async () => {
    const onAutoSelect = jest.fn();
    let resolve: (value: unknown) => void = () => undefined;
    const requestAi = jest.fn(() => new Promise((r) => { resolve = r; })) as never;
    const hook = renderHook(() => useReaderSuggestion({ reading: { ...vague, id: "r-vague-2", drawId: "draw-3" }, guides, language: "vi", aiEnabled: true, requestAi, onAutoSelect }));
    hook.result.current.markUserChoice();
    resolve({ slug: "the-star-weaver", confidence: 0.8, intent: null, source: "llm", experiment: null });
    await waitFor(() => expect(onAutoSelect).toHaveBeenCalledTimes(1));
    expect(hook.result.current.source).toBe("rules");
  });

  it("never asks the AI tier when signed out", () => {
    const requestAi = jest.fn();
    renderHook(() => useReaderSuggestion({ reading: { ...vague, id: "r-vague-3" }, guides, language: "vi", aiEnabled: false, requestAi, onAutoSelect: jest.fn() }));
    expect(requestAi).not.toHaveBeenCalled();
  });
});

describe("ReaderMismatchSheet", () => {
  it("names both readers, offers both choices and promises not to block", () => {
    const onKeep = jest.fn();
    const onSwitch = jest.fn();
    const screen = render(<ReaderMismatchSheet visible language="vi" chosenName="A" chosenDomain="công việc" topicPhrase="tình cảm" suggestedName="B" onKeep={onKeep} onSwitch={onSwitch} />);
    expect(screen.getByText(/A thường dẫn chuyện công việc. Câu bạn hỏi là chuyện tình cảm/)).toBeTruthy();
    expect(screen.getByText("Chỉ nhắc một lần mỗi trải bài. Không chặn lựa chọn của bạn.")).toBeTruthy();
    fireEvent.press(screen.getByText("Vẫn hỏi A"));
    fireEvent.press(screen.getByText("Đổi sang B"));
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });
});
