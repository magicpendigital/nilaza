import React from "react";
import { render } from "@testing-library/react-native";
import { OracleRoom } from "../OracleRoom";

jest.mock("../../../a2ui", () => {
  const { Text, View } = require("react-native");
  return {
    ChatSurface: ({ children }: any) => <View>{children}</View>,
    ChatMessageBubble: ({ children, meta, avatar }: any) => <View accessibilityLabel={avatar ? "brand-avatar" : undefined}><Text>{children}</Text>{meta ? <Text>{meta}</Text> : null}</View>,
    ChatComposer: () => null, ChatThinkingIndicator: () => null,
    IconButton: () => null, QuickReplyRail: () => null
  };
});
jest.mock("../../../responsive", () => ({ useAdaptiveLayout: () => ({ layoutMode: "compact", isCompactHeight: false }) }));

const props = {
  error: "", generating: false, input: "", language: "vi" as const, memoryAllowed: false,
  onAction: jest.fn(), onChangeInput: jest.fn(), onNew: jest.fn(), onReport: jest.fn(),
  onSaveLast: jest.fn(), onSend: jest.fn(), onToggleMemory: jest.fn()
};

it("shows the response with the official avatar without technical routing labels", () => {
  const screen = render(<OracleRoom {...props} turns={[{ id: "qa", role: "oracle", text: "Một câu hỏi cho hôm nay.", createdAt: "2026-09-14", intent: "reflect", moderationStatus: "passed" }]} />);
  expect(screen.getByText("Một câu hỏi cho hôm nay.")).toBeTruthy();
  expect(screen.getByLabelText("brand-avatar")).toBeTruthy();
  expect(screen.queryByText("reflect / passed")).toBeNull();
});

it("keeps fallback status understandable and visible", () => {
  const screen = render(<OracleRoom {...props} turns={[{ id: "qa", role: "oracle", text: "Gợi ý phản chiếu", createdAt: "2026-09-14", moderationStatus: "fallback" }]} />);
  expect(screen.getByText("Gợi ý của Nilaza trên máy, không phải AI trả lời.")).toBeTruthy();
});
