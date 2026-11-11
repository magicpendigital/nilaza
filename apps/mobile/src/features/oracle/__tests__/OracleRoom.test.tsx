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

it("shows the 115 support card under a crisis reply only (analysis OR-05)", () => {
  const screen = render(<OracleRoom {...props} turns={[{ id: "c", role: "oracle", text: "Bạn không một mình.", createdAt: "2026-11-02", intent: "safety_redirect", moderationStatus: "blocked", safety: "crisis" }]} />);
  expect(screen.getByText("Gọi 115")).toBeTruthy();
  screen.rerender(<OracleRoom {...props} turns={[{ id: "b", role: "oracle", text: "Mình không đưa lời khuyên y tế.", createdAt: "2026-11-02", intent: "safety_redirect", moderationStatus: "blocked", safety: "boundary" }]} />);
  expect(screen.queryByText("Gọi 115")).toBeNull();
});

it("shows model tools as one-line chips with the detail as a hint, and the AI banner (oracle-ai-tools-2026-11-11)", () => {
  const card = (kind: "draw_tarot" | "ask_guide" | "open_council", vi: string) => ({
    id: kind, kind, icon: "sparkles-outline", target: "tarot" as const, enabled: true,
    label: { vi, en: vi }, detail: { vi: `Chi tiết ${vi}`, en: "detail" }
  });
  const onAction = jest.fn();
  const screen = render(<OracleRoom {...props} aiEnabled onAction={onAction} turns={[{ id: "o", role: "oracle", text: "Mình nghe bạn.", createdAt: "2026-11-11", moderationStatus: "passed",
    actionCards: [card("draw_tarot", "Trải bài"), card("ask_guide", "Hỏi một người dẫn"), card("open_council", "Hội đồng"), { ...card("open_council", "Thừa"), id: "extra" }] }]} />);
  expect(screen.getByText(/Oracle là AI/)).toBeTruthy();
  expect(screen.getByText("Trải bài")).toBeTruthy();
  expect(screen.queryByText("Chi tiết Trải bài")).toBeNull();
  expect(screen.queryByText("Thừa")).toBeNull();
  expect(screen.getByHintText("Chi tiết Trải bài")).toBeTruthy();
  require("@testing-library/react-native").fireEvent.press(screen.getByText("Hỏi một người dẫn"));
  expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ kind: "ask_guide" }));
});
