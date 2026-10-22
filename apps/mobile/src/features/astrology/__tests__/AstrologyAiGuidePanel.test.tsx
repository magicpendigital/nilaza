import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import {
  AstrologyAiGuideEvidence,
  AstrologyAiGuidePanel,
} from "../AstrologyAiGuidePanel";

const baseProps = {
  language: "vi" as const,
  question: "",
  onQuestionChange: jest.fn(),
  onSubmitQuestion: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("locked state preserves question intent and exposes premium and free paths", () => {
  const onQuestionChange = jest.fn();
  const onRequestUnlock = jest.fn();
  const onContinueFree = jest.fn();
  const screen = render(
    <AstrologyAiGuidePanel
      {...baseProps}
      onContinueFree={onContinueFree}
      onQuestionChange={onQuestionChange}
      onRequestUnlock={onRequestUnlock}
      question="Điều gì đang mâu thuẫn trong tôi?"
      status="locked"
    />,
  );

  expect(screen.getByText("Nối các điểm trong bản đồ của bạn")).toBeTruthy();
  expect(
    screen.getByText("Dựa trên dữ kiện đã tính · AI không tự tính lại bản đồ"),
  ).toBeTruthy();
  fireEvent.press(screen.getByText("Vì sao tôi thường tự gây áp lực?"));
  expect(onQuestionChange).toHaveBeenCalledWith(
    "Vì sao tôi thường tự gây áp lực?",
  );
  fireEvent.press(screen.getByText("Mở khóa Người dẫn đường AI"));
  expect(onRequestUnlock).toHaveBeenCalledWith(
    "Điều gì đang mâu thuẫn trong tôi?",
  );
  fireEvent.press(screen.getByText("Tiếp tục đọc bản đồ miễn phí"));
  expect(onContinueFree).toHaveBeenCalledTimes(1);
});

test("ready state submits a trimmed English question", () => {
  const onSubmitQuestion = jest.fn();
  const screen = render(
    <AstrologyAiGuidePanel
      {...baseProps}
      language="en"
      onSubmitQuestion={onSubmitQuestion}
      question="  How do these placements work together?  "
      status="ready"
    />,
  );

  fireEvent.press(screen.getByLabelText("Send question to the AI guide"));
  expect(onSubmitQuestion).toHaveBeenCalledWith(
    "How do these placements work together?",
  );
});

test("loading and error states communicate progress and retry without submitting", () => {
  const onRetry = jest.fn();
  const loading = render(
    <AstrologyAiGuidePanel
      {...baseProps}
      question="Một câu hỏi"
      status="loading"
    />,
  );
  expect(
    loading.getByLabelText("Đang nối các dữ kiện trong bản đồ của bạn…"),
  ).toBeTruthy();
  expect(
    loading.queryByLabelText("Gửi câu hỏi cho Người dẫn đường AI"),
  ).toBeNull();
  loading.unmount();

  const error = render(
    <AstrologyAiGuidePanel
      {...baseProps}
      errorMessage="Kết nối bị gián đoạn."
      onRetry={onRetry}
      question="Một câu hỏi"
      status="error"
    />,
  );
  expect(error.getByText("Kết nối bị gián đoạn.")).toBeTruthy();
  fireEvent.press(error.getByText("Thử phân tích lại"));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test("success state renders grounded answer and returns selected evidence", () => {
  const onEvidencePress = jest.fn();
  const evidence: AstrologyAiGuideEvidence[] = [
    {
      id: "sun",
      glyph: "☉",
      label: "Mặt Trời",
      detail: "Ma Kết · Nhà 1",
      highlighted: true,
    },
    {
      id: "moon",
      glyph: "☽",
      label: "Mặt Trăng",
      detail: "Bọ Cạp · Nhà 4",
    },
  ];
  const screen = render(
    <AstrologyAiGuidePanel
      {...baseProps}
      answer={{
        eyebrow: "Một cách đọc để suy ngẫm",
        title: "Giữa trách nhiệm và nhu cầu riêng tư",
        paragraphs: [
          "Mặt Trời và Mặt Trăng gợi hai nhu cầu cần được lắng nghe cùng lúc.",
        ],
        evidenceIds: ["sun", "moon"],
        suggestedFollowUps: ["Tôi có thể cân bằng hai nhu cầu này ra sao?"],
      }}
      evidence={evidence}
      onEvidencePress={onEvidencePress}
      question=""
      status="success"
    />,
  );

  expect(
    screen.getByText("Giữa trách nhiệm và nhu cầu riêng tư"),
  ).toBeTruthy();
  expect(
    screen.getByText("Tôi có thể cân bằng hai nhu cầu này ra sao?"),
  ).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Mặt Trời, Ma Kết · Nhà 1"));
  expect(onEvidencePress).toHaveBeenCalledWith(evidence[0]);
});

test("success without a validated answer never renders a fabricated fallback", () => {
  const screen = render(
    <AstrologyAiGuidePanel {...baseProps} status="success" />,
  );

  expect(
    screen.getByText(
      "Phản hồi chưa có đủ dữ kiện nguồn để hiển thị an toàn. Hãy thử lại.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Bản phân tích của bạn đã sẵn sàng")).toBeNull();
});

test("empty question keeps the send action disabled", () => {
  const screen = render(
    <AstrologyAiGuidePanel {...baseProps} status="ready" />,
  );
  expect(
    screen.getByLabelText("Gửi câu hỏi cho Người dẫn đường AI").props
      .accessibilityState.disabled,
  ).toBe(true);
});
