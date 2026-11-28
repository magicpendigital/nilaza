import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { TwoSystems, type TwoSystemsProps } from "../TwoSystems";
import { twoSystemsContentReviewed } from "../twoSystemsModel";

// The first render loads the icon set and content files; on a cold Windows run that alone can pass 5 s.
jest.setTimeout(20000);

// Placeholder blocks: Sun Pisces (water) × life path 11/2 → water.2; Moon Gemini (air) × soul urge 9 ("Minh") → air.9.
const chart = {
  id: "r1",
  createdAt: "2026-11-20T00:00:00Z",
  placeName: "Hà Nội",
  input: { date: "2000-03-15" },
  chart: {
    placements: [{ body: "sun", sign: "pisces" }, { body: "moon", sign: "gemini" }],
    angles: [],
    sampledRanges: [],
    houses: [],
    time: { birthTimeKnown: true, precision: "exact" }
  }
} as any;

function renderScreen(overrides: Partial<TwoSystemsProps> = {}) {
  const props: TwoSystemsProps = {
    language: "vi",
    signedIn: true,
    premium: false,
    savedCharts: { status: "ready", charts: [chart] },
    birthDate: "2000-03-15",
    loadSavedName: jest.fn(async () => "Minh"),
    onEditBirth: jest.fn(),
    onMakeChart: jest.fn(),
    onOpenNumerology: jest.fn(),
    onOpenPremium: jest.fn(),
    onSignIn: jest.fn(),
    onWriteJournal: jest.fn(),
    ...overrides
  };
  return { props, screen: render(<TwoSystems {...props} />) };
}

test("Free: pair chips and the meeting point; the rest dimmed with a Premium label that opens the paywall", async () => {
  const { props, screen } = renderScreen();
  await waitFor(() => expect(screen.getByLabelText("Mặt Trăng Song Tử, nguyên tố Khí")).toBeTruthy());
  expect(screen.getByText("Hai hệ cùng nhìn bạn")).toBeTruthy();
  expect(screen.getByLabelText("Mặt Trời Song Ngư, nguyên tố Nước")).toBeTruthy();
  expect(screen.getByLabelText("Số chủ đạo 11/2")).toBeTruthy();
  expect(screen.getByLabelText("Số linh hồn 9")).toBeTruthy();
  expect(screen.getAllByText("Điểm gặp")).toHaveLength(2);
  expect(screen.getByText(/Cả hai cùng nghiêng về lắng nghe/)).toBeTruthy();
  // 11 reads with the block of 2 plus the master note.
  expect(screen.getByTestId("two-systems-sun-master")).toBeTruthy();
  // Premium parts: labels only, dimmed, never the text, no countdown, no journal button.
  expect(screen.queryByText(/Nước có thể giữ cảm xúc/)).toBeNull();
  expect(screen.queryByText(/lắng nghe chính mình/)).toBeNull();
  expect(screen.queryByTestId("two-systems-sun-journal")).toBeNull();
  expect(screen.queryByText(/còn \d|ngày nữa|countdown/i)).toBeNull();
  const locked = screen.getByTestId("two-systems-sun-locked");
  expect(locked.props.accessibilityLabel).toBe("Premium: Chỗ khác giọng, Câu hỏi cho bạn");
  fireEvent.press(locked);
  expect(props.onOpenPremium).toHaveBeenCalledTimes(1);
  // Nothing about an external expert.
  expect(screen.queryByText(/chuyên gia|expert/i)).toBeNull();
});

test("Premium: all three parts and a journal button pre-filled with the block question", async () => {
  const { props, screen } = renderScreen({ premium: true });
  await waitFor(() => expect(screen.getByTestId("two-systems-moon-journal")).toBeTruthy());
  expect(screen.getAllByText("Chỗ khác giọng")).toHaveLength(2);
  expect(screen.getByText(/Nước có thể giữ cảm xúc/)).toBeTruthy();
  expect(screen.queryByTestId("two-systems-sun-locked")).toBeNull();
  fireEvent.press(screen.getByTestId("two-systems-sun-journal"));
  expect(props.onWriteJournal).toHaveBeenCalledWith("Gần đây bạn đã lắng nghe chính mình như lắng nghe người khác chưa?");
  fireEvent.press(screen.getByTestId("two-systems-moon-journal"));
  expect(props.onWriteJournal).toHaveBeenLastCalledWith("Cảm xúc nào bạn đang hiểu bằng đầu mà chưa cho phép mình cảm?");
});

test("guest: only the sign-in invitation, no content and no name read", () => {
  const { props, screen } = renderScreen({ signedIn: false });
  expect(screen.getByTestId("two-systems-guest")).toBeTruthy();
  expect(screen.queryByTestId("two-systems-sun")).toBeNull();
  expect(screen.queryByText("Điểm gặp")).toBeNull();
  expect(props.loadSavedName).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText("Đăng nhập"));
  expect(props.onSignIn).toHaveBeenCalledTimes(1);
});

test("missing inputs show the matching invitation with a way to fix it", async () => {
  const { props, screen } = renderScreen({ birthDate: "", loadSavedName: jest.fn(async () => "") });
  await waitFor(() => expect(screen.getByTestId("two-systems-moon-needName")).toBeTruthy());
  expect(screen.getByTestId("two-systems-sun-needBirthDate")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Sửa ngày, giờ, nơi sinh"));
  expect(props.onEditBirth).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByLabelText("Mở Bản đồ số"));
  expect(props.onOpenNumerology).toHaveBeenCalledTimes(1);
});

test("no saved chart: both axes invite to make a chart", () => {
  const { props, screen } = renderScreen({ savedCharts: { status: "ready", charts: [] }, loadSavedName: undefined });
  expect(screen.getByTestId("two-systems-sun-needSun")).toBeTruthy();
  expect(screen.getByTestId("two-systems-moon-needMoon")).toBeTruthy();
  fireEvent.press(screen.getAllByLabelText("Lập lá số")[0]);
  expect(props.onMakeChart).toHaveBeenCalledTimes(1);
});

test("draft note mirrors the review status", async () => {
  const { screen } = renderScreen();
  await waitFor(() => expect(screen.getByLabelText("Số linh hồn 9")).toBeTruthy());
  expect(Boolean(screen.queryByTestId("two-systems-draft-note"))).toBe(!twoSystemsContentReviewed);
});
