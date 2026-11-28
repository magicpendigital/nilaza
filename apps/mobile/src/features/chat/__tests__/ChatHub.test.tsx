import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ChatHub, hubFeaturedIds, relativeDayLabel, resetChatHubMemory, type HubGuide } from "../ChatHub";

const extra = ["archetype-the-shadow-mirror", "figure-sun-tzu"];
const guides: HubGuide[] = [...hubFeaturedIds, ...extra].map((id) => ({
  id,
  name: id === "figure-sun-tzu" ? "Tôn Tử" : id,
  tagline: `role of ${id}`,
  thumbnail: { uri: `https://example.com/${id}.png` },
  comingSoon: id === "figure-sun-tzu"
}));
const love = new Set(["archetype-the-love-oracle", "book-communication-mentor"]);

beforeEach(() => resetChatHubMemory());

function renderHub(overrides: Partial<React.ComponentProps<typeof ChatHub>> = {}) {
  const props: React.ComponentProps<typeof ChatHub> = {
    language: "vi",
    now: new Date("2026-10-31T10:00:00"),
    recent: { title: "The Love Oracle", snippet: "Thử nói điều bạn cần trước", updatedAt: "2026-10-30T20:00:00", icon: "chatbubble-ellipses-outline" },
    councilThumbnails: [],
    guides,
    matches: (id, category, query) => (category === "all" || (category === "love" && love.has(id))) && id.includes(query),
    onOpenRecent: jest.fn(),
    onOracle: jest.fn(),
    onCouncil: jest.fn(),
    onOpenGuide: jest.fn(),
    ...overrides
  };
  return { props, screen: render(<ChatHub {...props} />) };
}

test("the hub follows the design: continue, Oracle, council and eight guides first", () => {
  const { props, screen } = renderHub();
  expect(screen.getByText("Trò chuyện")).toBeTruthy();
  expect(screen.getByText("hôm qua")).toBeTruthy();
  expect(screen.getByText("“Thử nói điều bạn cần trước”")).toBeTruthy();
  fireEvent.press(screen.getByText("Bắt đầu kể"));
  expect(props.onOracle).toHaveBeenCalled();
  fireEvent.press(screen.getByText("Hội đồng 3 góc nhìn"));
  expect(props.onCouncil).toHaveBeenCalled();
  expect(screen.queryByText("Tôn Tử")).toBeNull();
  fireEvent.press(screen.getByText("Xem cả 10"));
  expect(screen.getByText("Tôn Tử")).toBeTruthy();
  // A guide that is not yet available says so instead of its tagline.
  expect(screen.getByText("Sắp ra mắt")).toBeTruthy();
  fireEvent.press(screen.getByText("archetype-the-mystic"));
  expect(props.onOpenGuide).toHaveBeenCalledWith("archetype-the-mystic");
});

test("chips and search filter the grid", () => {
  const { screen } = renderHub();
  fireEvent.press(screen.getByText("Tình cảm"));
  expect(screen.getByText("archetype-the-love-oracle")).toBeTruthy();
  expect(screen.queryByText("archetype-the-mystic")).toBeNull();
  fireEvent.press(screen.getByText("Tất cả"));
  fireEvent.press(screen.getByLabelText("Tìm người dẫn hoặc chủ đề"));
  fireEvent.changeText(screen.getAllByLabelText("Tìm người dẫn hoặc chủ đề")[1], "laozi");
  expect(screen.getByText("figure-laozi")).toBeTruthy();
  expect(screen.queryByText("figure-aristotle")).toBeNull();
  expect(screen.queryByText("Bắt đầu kể")).toBeNull();
});

test("relative day labels", () => {
  const now = new Date("2026-10-31T10:00:00");
  expect(relativeDayLabel("2026-10-31T08:00:00", now, "vi")).toBe("hôm nay");
  expect(relativeDayLabel("2026-10-30T23:00:00", now, "vi")).toBe("hôm qua");
  expect(relativeDayLabel("2026-10-27T09:00:00", now, "vi")).toBe("4 ngày trước");
});

test("the Books chip filters to books and more than one book is featured", () => {
  const books = new Set(hubFeaturedIds.filter((id) => id.startsWith("book-")));
  expect(books.size).toBeGreaterThan(1);
  expect(hubFeaturedIds).toHaveLength(8);
  const { screen } = renderHub({ matches: (id, category) => category === "all" || (category === "books" && id.startsWith("book-")) });
  fireEvent.press(screen.getByText("Sách"));
  expect(screen.getByText("book-communication-mentor")).toBeTruthy();
  expect(screen.getByText("book-calm-living-mentor")).toBeTruthy();
  expect(screen.queryByText("archetype-the-mystic")).toBeNull();
});

test("book cards say they are books without relying on colour, and borrowed art is tinted", () => {
  const bookGuides: HubGuide[] = [
    { id: "book-strategic-thinker", name: "Binh pháp Tôn Tử", tagline: "Nhìn rõ thế cục", thumbnail: { uri: "a.png" }, comingSoon: false, kind: "book" },
    { id: "book-i-ching", name: "Kinh Dịch", tagline: "Nhìn thay đổi như chu kỳ", thumbnail: { uri: "b.png" }, comingSoon: false, kind: "book", artTint: "#7FA6A3" },
    { id: "figure-laozi", name: "Lão Tử", tagline: "Thuận tự nhiên", thumbnail: { uri: "c.png" }, comingSoon: false, kind: "guide" }
  ];
  const { screen } = renderHub({ guides: bookGuides, matches: (id, category) => category !== "books" || id.startsWith("book-") });
  // Any non-"all" chip shows the full filtered grid.
  fireEvent.press(screen.getByText("Triết gia"));
  expect(screen.getByLabelText("Sách: Binh pháp Tôn Tử. Nhìn rõ thế cục")).toBeTruthy();
  expect(screen.getByLabelText("Lão Tử. Thuận tự nhiên")).toBeTruthy();
  expect(screen.getByTestId("hub-book-badge-book-i-ching")).toBeTruthy();
  expect(screen.queryByTestId("hub-book-badge-figure-laozi")).toBeNull();
  expect(screen.getByTestId("hub-art-tint-book-i-ching")).toBeTruthy();
  expect(screen.queryByTestId("hub-art-tint-book-strategic-thinker")).toBeNull();
});

test("the Books chip has its own empty message", () => {
  const { screen } = renderHub({ matches: (id, category) => category === "all" });
  fireEvent.press(screen.getByText("Sách"));
  expect(screen.getByText("Chưa có sách phù hợp. Thử từ khóa khác hoặc xem Tất cả.")).toBeTruthy();
});

test("the chosen filter survives leaving the hub and coming back (device test 28/11)", () => {
  const first = renderHub();
  fireEvent.press(first.screen.getByText("Tình cảm"));
  expect(first.screen.queryByText("archetype-the-mystic")).toBeNull();
  first.screen.unmount();
  const second = renderHub();
  expect(second.screen.getByText("archetype-the-love-oracle")).toBeTruthy();
  expect(second.screen.queryByText("archetype-the-mystic")).toBeNull();
});
