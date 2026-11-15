import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ChatHub, hubFeaturedIds, relativeDayLabel, type HubGuide } from "../ChatHub";

const extra = ["archetype-the-shadow-mirror", "figure-sun-tzu"];
const guides: HubGuide[] = [...hubFeaturedIds, ...extra].map((id) => ({
  id,
  name: id === "figure-sun-tzu" ? "Tôn Tử" : id,
  tagline: `role of ${id}`,
  thumbnail: { uri: `https://example.com/${id}.png` },
  comingSoon: id === "figure-sun-tzu"
}));
const love = new Set(["archetype-the-love-oracle", "book-communication-mentor"]);

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
  // A Premium guide on a Free account says so instead of its tagline (Owner 16/11: no "Sắp ra mắt").
  expect(screen.getByText("Dành cho Premium")).toBeTruthy();
  expect(screen.queryByText("Sắp ra mắt")).toBeNull();
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
