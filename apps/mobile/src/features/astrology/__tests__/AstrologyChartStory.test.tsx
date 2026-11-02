import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import {
  calculateChart,
  type BirthInput,
} from "../../../../../../packages/astrology-core/calculator.mjs";
import { AstrologyChartStory } from "../AstrologyChartStory";
import { buildAstrologyChartSelectionModel } from "../chartSelection";
import { toAstrologyChartPresentation } from "../contracts";

const canonicalFixtureInput: BirthInput = {
  revision: 1,
  date: "1998-06-17",
  time: "05:41",
  precision: "exact",
  place: {
    id: "internal-synthetic-chart-story-test",
    source: "test_fixture",
    confirmed: true,
    latitude: 21.023456,
    longitude: 105.876543,
    timezone: "Asia/Ho_Chi_Minh",
  },
};

const canonicalFixture = calculateChart(canonicalFixtureInput);
const chart = toAstrologyChartPresentation(canonicalFixture);
const selectionModel = buildAstrologyChartSelectionModel(canonicalFixture);

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderStory(
  overrides: Partial<React.ComponentProps<typeof AstrologyChartStory>> = {},
) {
  const screen = render(
    <AstrologyChartStory
      chart={chart}
      houses={canonicalFixture.houses}
      language="vi"
      onBack={jest.fn()}
      selectionModel={selectionModel}
      {...overrides}
    />,
  );
  await act(async () => {});
  return screen;
}

function openStory(screen: Awaited<ReturnType<typeof renderStory>>) {
  fireEvent.press(screen.getByRole("button", { name: /Mở câu chuyện:/ }));
}

describe("AstrologyChartStory", () => {
  it("starts with the personal wheel visible and offers a clear path into the story", async () => {
    const screen = await renderStory();

    expect(screen.queryByRole("tab", { name: "Câu chuyện" })).toBeNull();
    expect(screen.getByText("Mở lớn")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Mở bản đồ toàn màn hình" }),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Vòng 12 cung; chạm trực tiếp một biểu tượng để chọn"),
    ).toBeTruthy();

    openStory(screen);
    expect(
      screen.getByRole("tab", { name: "Câu chuyện" }).props.accessibilityState
        .selected,
    ).toBe(true);
    expect(screen.getAllByText(/^Mặt Trời trong /).length).toBeGreaterThan(0);
  });

  it("opens on the locked AI guide with explicit grounding and a free path", async () => {
    const screen = await renderStory({ initialTab: "guide" });
    openStory(screen);

    await waitFor(() =>
      expect(
        screen.getByText("NGƯỜI DẪN ĐƯỜNG AI · PREMIUM"),
      ).toBeTruthy(),
    );
    expect(
      screen.getByText("Nối các điểm trong bản đồ của bạn"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Dữ kiện đã tính · AI không tự tạo · chưa chứng nhận độc lập",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Tiếp tục đọc bản đồ miễn phí",
      }),
    ).toBeTruthy();
  });

  it("lets the owner inspect the Premium guide UI while clearly keeping AI offline", async () => {
    const screen = await renderStory({
      aiStatus: "ready",
      initialTab: "guide",
      ownerPremiumPreview: true,
    });
    openStory(screen);

    expect(
      screen.getByText(
        "Bản xem thử Owner: bạn có thể kiểm tra giao diện Premium, nhưng câu hỏi chưa được gửi tới AI; không có giao dịch hay lượt dùng nào phát sinh.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Chỉ gửi dữ kiện chiêm tinh đã tính và câu hỏi hiện tại sau khi bạn đồng ý. Không gửi ngày giờ nơi sinh, Nhật ký hay lịch sử trò chuyện.",
      ),
    ).toBeTruthy();

    const questionInput = screen.getByLabelText("Bạn muốn hiểu điều gì về mình?");
    expect(questionInput.props.maxLength).toBe(500);
    fireEvent.changeText(questionInput, "Tôi muốn hiểu điều gì đang tạo áp lực?");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Gửi câu hỏi cho Người dẫn đường AI",
      }),
    );
    expect(
      screen.getByText(
        "Bản xem thử Owner: bạn có thể kiểm tra giao diện Premium, nhưng câu hỏi chưa được gửi tới AI; không có giao dịch hay lượt dùng nào phát sinh.",
      ),
    ).toBeTruthy();
  });

  it("keeps evidence selection synchronized when the user continues into the free story", async () => {
    const screen = await renderStory({ initialTab: "guide" });

    openStory(screen);
    fireEvent.press(screen.getByLabelText(/^Mặt Trăng,/));
    fireEvent.press(
      screen.getByRole("button", {
        name: "Tiếp tục đọc bản đồ miễn phí",
      }),
    );

    expect(
      screen.getByRole("tab", { name: "Câu chuyện" }).props
        .accessibilityState.selected,
    ).toBe(true);
    expect(screen.getAllByText(/^Mặt Trăng trong /).length).toBeGreaterThan(0);
  });

  it("updates the visible story when the user taps a sign on the wheel", async () => {
    const screen = await renderStory();

    fireEvent.press(screen.getByTestId("sign-hit-capricorn"));

    expect(screen.getByText("Cung 10 trong 12 · Mối liên hệ")).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Câu chuyện" }).props.accessibilityState
        .selected,
    ).toBe(true);
  });

  it("offers a screen-reader path through sheet levels", async () => {
    const screen = await renderStory();

    fireEvent(
      screen.getByLabelText("Mở nội dung"),
      "accessibilityTap",
    );
    expect(screen.getByLabelText("Mở nội dung toàn màn hình")).toBeTruthy();
    fireEvent(
      screen.getByLabelText("Mở nội dung toàn màn hình"),
      "accessibilityTap",
    );
    expect(screen.getByLabelText("Thu gọn về bản đồ")).toBeTruthy();
    fireEvent(screen.getByLabelText("Thu gọn về bản đồ"), "accessibilityTap");
    expect(screen.getByLabelText("Mở nội dung toàn màn hình")).toBeTruthy();
  });

  it("passes the pending question into the Premium unlock boundary", async () => {
    const onRequestAiUnlock = jest.fn();
    const screen = await renderStory({
      initialTab: "guide",
      onRequestAiUnlock,
    });
    openStory(screen);

    fireEvent.changeText(
      screen.getByLabelText("Bạn muốn hiểu điều gì về mình?"),
      "Vì sao tôi thường tự gây áp lực?",
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "Gửi câu hỏi cho Người dẫn đường AI",
      }),
    );

    expect(onRequestAiUnlock).toHaveBeenCalledWith(
      "Vì sao tôi thường tự gây áp lực?",
      ["placement.sun"],
    );
  });

  it("keeps the unlock action honest while the live AI boundary is absent", async () => {
    const screen = await renderStory({ initialTab: "guide" });
    openStory(screen);

    fireEvent.press(
      screen.getByRole("button", { name: "Xem trạng thái phát triển AI" }),
    );

    expect(
      screen.getByText(/Không có thanh toán hay trừ lượt; câu hỏi chưa được gửi tới AI/),
    ).toBeTruthy();
    expect(screen.getByLabelText("Thu gọn về bản đồ")).toBeTruthy();
  });

  it("saves from Data and states the default AI privacy boundary", async () => {
    const onSaveChart = jest.fn();
    const screen = await renderStory({ onSaveChart });

    openStory(screen);
    fireEvent.press(screen.getByRole("tab", { name: "Dữ liệu" }));
    expect(screen.getByText("Ranh giới riêng tư của AI")).toBeTruthy();
    expect(
      screen.getByLabelText(/Chú giải đường nối: màu và kiểu nét/),
    ).toBeTruthy();
    expect(screen.getByText("Đồng vị")).toBeTruthy();
    expect(screen.getByText("Đối đỉnh")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nhà 1" })).toBeTruthy();
    expect(
      screen.getByText(
        /Mỗi lượt AI Chiêm tinh cần bạn đồng ý riêng/,
      ),
    ).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "Lưu bản đồ trên thiết bị" }),
    );
    expect(onSaveChart).toHaveBeenCalledTimes(1);

    expect(screen.queryByText(canonicalFixtureInput.date)).toBeNull();
    expect(screen.queryByText(canonicalFixtureInput.time)).toBeNull();
    expect(
      screen.queryByText(canonicalFixtureInput.place.timezone),
    ).toBeNull();
    expect(
      screen.queryByText(String(canonicalFixtureInput.place.latitude)),
    ).toBeNull();
    expect(
      screen.queryByText(String(canonicalFixtureInput.place.longitude)),
    ).toBeNull();
  });

  it("disables repeated save attempts while storage is busy", async () => {
    const onSaveChart = jest.fn();
    const screen = await renderStory({ onSaveChart, saving: true });

    openStory(screen);
    fireEvent.press(screen.getByRole("tab", { name: "Dữ liệu" }));
    const save = screen.getByRole("button", { name: "Đang lưu bản đồ…" });
    expect(save.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(save);
    expect(onSaveChart).not.toHaveBeenCalled();
  });
});
