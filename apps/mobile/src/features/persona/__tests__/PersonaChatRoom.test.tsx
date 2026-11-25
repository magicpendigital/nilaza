import React from "react";
import renderer, { act } from "react-test-renderer";

import { PersonaChatRoom } from "../PersonaChatRoom";

jest.mock("react-native", () => {
  const React = require("react");
  const createComponent = (name: string) => ({ children, ...props }: any) => React.createElement(name, props, children);

  return {
    Image: createComponent("Image"),
    KeyboardAvoidingView: createComponent("KeyboardAvoidingView"),
    Platform: { OS: "ios" },
    Pressable: createComponent("Pressable"),
    ScrollView: createComponent("ScrollView"),
    StyleSheet: {
      create: (styles: any) => styles
    },
    Text: createComponent("Text"),
    TextInput: createComponent("TextInput"),
    View: createComponent("View")
  };
});

const mountedTrees: renderer.ReactTestRenderer[] = [];

function renderTree(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  mountedTrees.push(tree!);
  return tree!;
}

// The thinking counter runs an interval while a reply is pending; unmount so no timer outlives a test.
afterEach(() => {
  act(() => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

function textContent(node: any): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(" ");
  return textContent(node.children);
}

function expectText(tree: renderer.ReactTestRenderer, value: string) {
  expect(textContent(tree.toJSON())).toContain(value);
}

function baseProps() {
  return {
    chatError: "",
    chatGenerating: false,
    copy: {
      askSomething: "Ask your guide",
      generatingAnswer: "Your guide is listening...",
      newChat: "New",
      report: "Report",
      retry: "Retry",
      save: "Save"
    },
    input: "",
    language: "en" as const,
    messages: [],
    activeSessionId: "session-1",
    onBack: jest.fn(),
    onChangeInput: jest.fn(),
    onNewChat: jest.fn(),
    onReport: jest.fn(),
    onResumeSession: jest.fn(),
    onRetry: jest.fn(),
    onSaveLastInsight: jest.fn(),
    onSaveMessage: jest.fn(),
    onSend: jest.fn(),
    personaName: "Marcus",
    personaPrompts: ["I need perspective", "Help me decide"],
    personaThumbnail: { uri: "persona.png" },
    personaTransparency: "Inspired AI guide, not the real person.",
    sessionSummaries: []
  };
}

describe("PersonaChatRoom", () => {
  it("renders empty-state guidance and sends quick replies", () => {
    const props = baseProps();
    const tree = renderTree(<PersonaChatRoom {...props} />);

    expectText(tree, "Marcus");
    expectText(tree, "AI guide inspired by Marcus.");
    expectText(tree, "Details");
    expectText(tree, "I am here.");
    expectText(tree, "I need perspective");

    const quickReply = tree.root
      .findAll((node) => node.props.accessibilityRole === "button")
      .find((node) => textContent(node).includes("I need perspective"));

    act(() => {
      quickReply?.props.onPress?.();
    });

    expect(props.onSend).toHaveBeenCalledWith("I need perspective");
  });

  it("opens with the persona's own line and falls back to the generic one", () => {
    const own = renderTree(<PersonaChatRoom {...baseProps()} openingLine="Hello. Tell me what you are weighing." />);
    expectText(own, "Hello. Tell me what you are weighing.");
    expect(textContent(own.toJSON())).not.toContain("I am here.");
    const fallback = renderTree(<PersonaChatRoom {...baseProps()} />);
    expectText(fallback, "I am here.");
  });

  it("renders an active thread and routes guide save actions", () => {
    const props = {
      ...baseProps(),
      messages: [
        { id: "m1", role: "user" as const, text: "What should I notice?" },
        { id: "m2", role: "guide" as const, text: "Notice what your hesitation protects.", promptVersionId: "persona-v1" }
      ]
    };
    const tree = renderTree(<PersonaChatRoom {...props} />);

    expectText(tree, "What should I notice?");
    expectText(tree, "Notice what your hesitation protects.");
    expectText(tree, "Save");

    const saveButtons = tree.root
      .findAll((node) => node.props.accessibilityRole === "button")
      .filter((node) => textContent(node).includes("Save"));

    act(() => {
      saveButtons[0].props.onPress?.();
    });

    expect(props.onSaveMessage).toHaveBeenCalledWith(props.messages[1]);
  });

  it("labels a canned reply as a fallback, not an AI answer", () => {
    const props = {
      ...baseProps(),
      messages: [
        { id: "m1", role: "user" as const, text: "Help me decide" },
        { id: "m2", role: "guide" as const, text: "Canned reply.", uiMetadata: { fallback: true } },
        { id: "m3", role: "guide" as const, text: "Real reply." }
      ]
    };
    const tree = renderTree(<PersonaChatRoom {...props} />);
    const metas = tree.root.findAll((node) => typeof node.props.meta === "string").map((node) => node.props.meta);
    expect(metas).toEqual(["Fallback reply — AI is not connected."]);
  });

  it("keeps composer send disabled while generating and exposes retry on errors", () => {
    const props = {
      ...baseProps(),
      chatError: "Could not answer yet.",
      chatGenerating: true,
      input: "Please answer"
    };
    const tree = renderTree(<PersonaChatRoom {...props} />);

    expectText(tree, "Your guide is listening...");
    expectText(tree, "Could not answer yet.");

    const retryButton = tree.root
      .findAll((node) => node.props.accessibilityRole === "button")
      .find((node) => textContent(node).includes("Retry"));

    act(() => {
      retryButton?.props.onPress?.();
    });

    expect(props.onRetry).toHaveBeenCalledTimes(1);

    const sendButton = tree.root
      .findAll((node) => node.props.accessibilityRole === "button")
      .find((node) => node.props.accessibilityState?.disabled === true);

    expect(sendButton).toBeTruthy();
  });

  it("labels the handoff by its real source instead of calling every source astrology", () => {
    const tree = renderTree(<PersonaChatRoom {...baseProps()} handoffContext={{ sourceType: "tarot_card", sourceId: "moon-garden:major-17-star", sourceLabel: "The Star card", safeSummary: "The Star in Moon Garden." }} />);

    expectText(tree, "Continuing from a tarot card");
    expect(textContent(tree.toJSON())).not.toContain("astrology preview");
  });

  it("labels the header buttons in the app language for screen readers", () => {
    const tree = renderTree(<PersonaChatRoom {...baseProps()} language="vi" />);
    const labels = tree.root.findAll((node) => node.props.accessibilityRole === "button").map((node) => node.props.accessibilityLabel);
    expect(labels).toEqual(expect.arrayContaining(["Quay lại", "Thêm tùy chọn"]));
  });

  it("shows the 115 support card under a crisis safety reply only", () => {
    const tree = renderTree(<PersonaChatRoom {...baseProps()} messages={[
      { id: "m1", role: "user" as const, text: "I want to die" },
      { id: "m2", role: "guide" as const, text: "I hear that this is very hard.", uiMetadata: { safety: "crisis" } }
    ]} />);
    expectText(tree, "Call 115");
    const ordinary = renderTree(<PersonaChatRoom {...baseProps()} messages={[{ id: "m3", role: "guide" as const, text: "Notice the pause." }]} />);
    expect(textContent(ordinary.toJSON())).not.toContain("Call 115");
  });
  it("shows the reply growing while it streams, without announcing each piece", () => {
    const tree = renderTree(<PersonaChatRoom {...baseProps()} chatGenerating messages={[{ id: "m1", role: "user" as const, text: "Tell me" }]}
      streamingReply={{ personaId: "p", text: "The first part of", status: "streaming", modelTier: "deep_knowledge" }} />);
    expectText(tree, "The first part of");
    expect(textContent(tree.toJSON())).not.toContain("Your guide is listening...");
    expect(tree.root.findAll((node) => typeof node.type === "string" && node.props.accessibilityLiveRegion === "polite")).toHaveLength(0);
  });

  it("counts silent seconds after 10 s while a reasoning guide thinks", () => {
    jest.useFakeTimers();
    try {
      const tree = renderTree(<PersonaChatRoom {...baseProps()} chatGenerating language="vi" messages={[{ id: "m1", role: "user" as const, text: "Hỏi" }]} />);
      act(() => { jest.advanceTimersByTime(5000); });
      expect(textContent(tree.toJSON())).not.toContain("Đang suy nghĩ");
      act(() => { jest.advanceTimersByTime(7000); });
      expectText(tree, "Đang suy nghĩ kỹ · 12 giây");
      expect(textContent(tree.toJSON())).not.toContain("vài phút");
      act(() => { jest.advanceTimersByTime(20000); });
      expectText(tree, "Đang suy nghĩ kỹ · 32 giây. Câu trả lời sâu có thể cần vài phút");
      // The ticking seconds never sit inside the polite live region, so TalkBack does not read every tick.
      const live = tree.root.findAll((node) => typeof node.type === "string" && node.props.accessibilityLiveRegion === "polite");
      live.forEach((node) => expect(textContent(node)).not.toContain("giây"));
    } finally {
      jest.useRealTimers();
    }
  });

  it("renders a long Markdown answer without raw marks and without turning bullets italic", () => {
    const text = "## Ý chính\n- một\n* hai ý dài\n**đậm** và *nghiêng*\n> trích dẫn";
    const tree = renderTree(<PersonaChatRoom {...baseProps()} messages={[{ id: "m1", role: "guide" as const, text }]} />);
    const all = textContent(tree.toJSON());
    expect(all).toContain("Ý chính");
    expect(all).not.toContain("##");
    expect(all).toMatch(/•\s+một/);
    expect(all).toMatch(/•\s+hai ý dài/);
    expect(all).not.toContain("**");
    const italic = tree.root.findAll((node) => node.type === "Text" && node.props.style?.fontStyle === "italic").map((node) => textContent(node));
    expect(italic).toEqual(expect.arrayContaining(["nghiêng", "trích dẫn"]));
    italic.forEach((value) => expect(value).not.toContain("hai ý dài"));
  });

  it("stops following new text once the reader scrolls up and offers a way back", () => {
    const props = { ...baseProps(), chatGenerating: true, messages: [{ id: "m1", role: "user" as const, text: "Tell me" }] };
    const reply = (text: string) => ({ personaId: "p", text, status: "streaming" as const, modelTier: "deep_knowledge" as const });
    const tree = renderTree(<PersonaChatRoom {...props} streamingReply={reply("First part")} />);
    const scroll = () => tree.root.find((node) => node.props.testID === "chat-message-scroll");
    const awayFromBottom = { nativeEvent: { contentOffset: { y: 0 }, contentSize: { height: 2000 }, layoutMeasurement: { height: 600 } } };
    expect(textContent(tree.toJSON())).not.toContain("Show newest");
    act(() => {
      scroll().props.onScrollBeginDrag(awayFromBottom);
      scroll().props.onScroll(awayFromBottom);
      scroll().props.onScrollEndDrag(awayFromBottom);
    });
    act(() => { tree.update(<PersonaChatRoom {...props} streamingReply={reply("First part and more")} />); });
    act(() => { scroll().props.onContentSizeChange(400, 2200); });
    expectText(tree, "Show newest");
    const chip = tree.root.find((node) => typeof node.type === "string" && node.props.accessibilityLabel === "Show the newest part of the chat");
    act(() => { chip.props.onPress(); });
    expect(textContent(tree.toJSON())).not.toContain("Show newest");
  });

  it("names the book a book guide is inspired by in the header and the honesty note", () => {
    const tree = renderTree(<PersonaChatRoom {...baseProps()} language="vi" personaName="Người dẫn Kinh Dịch" personaInspiration="sách Kinh Dịch" />);
    expectText(tree, "sách Kinh Dịch");
    expectText(tree, "Không phải tác giả, cuốn sách");
  });

  it("keeps interrupted partial text marked as not saved, next to Retry", () => {
    const props = { ...baseProps(), chatError: "The reply was cut off.", messages: [{ id: "m1", role: "user" as const, text: "Tell me" }] };
    const tree = renderTree(<PersonaChatRoom {...props} streamingReply={{ personaId: "p", text: "Half an answer", status: "interrupted" }} />);
    expectText(tree, "Half an answer");
    const metas = tree.root.findAll((node) => typeof node.props.meta === "string").map((node) => node.props.meta);
    expect(metas).toContain("Reply interrupted and not saved.");
    expectText(tree, "Retry");
  });

  it("announces only a guide reply that arrives while the room is open", () => {
    const props = { ...baseProps(), messages: [{ id: "m1", role: "user" as const, text: "Tell me" }, { id: "m2", role: "guide" as const, text: "Old reply." }] };
    const tree = renderTree(<PersonaChatRoom {...props} />);
    expect(tree.root.findAll((node) => typeof node.type === "string" && node.props.accessibilityLiveRegion === "polite")).toHaveLength(0);
    act(() => {
      tree.update(<PersonaChatRoom {...props} messages={[...props.messages, { id: "m3", role: "user" as const, text: "More" }, { id: "m4", role: "guide" as const, text: "Final reply." }]} />);
    });
    const live = tree.root.findAll((node) => typeof node.type === "string" && node.props.accessibilityLiveRegion === "polite");
    expect(live).toHaveLength(1);
    expect(textContent(live[0])).toContain("Final reply.");
  });

  it("offers Đào sâu only under the latest finished knowledge-tier reply and sends it through onSend", () => {
    const deep = { id: "m2", role: "guide" as const, text: "A knowledge answer.", uiMetadata: { modelTier: "deep_knowledge" } };
    const props = { ...baseProps(), language: "vi" as const, messages: [{ id: "m1", role: "user" as const, text: "Hỏi" }, deep] };
    const tree = renderTree(<PersonaChatRoom {...props} />);
    const chip = tree.root.findAll((node) => typeof node.type === "string" && node.props.accessibilityRole === "button" && node.props.accessibilityLabel === "Đào sâu");
    expect(chip).toHaveLength(1);
    act(() => { chip[0].props.onPress(); });
    expect(props.onSend).toHaveBeenCalledWith(expect.stringContaining("đào sâu"));

    const hasChip = (element: React.ReactElement) => textContent(renderTree(element).toJSON()).includes("Đào sâu");
    expect(hasChip(<PersonaChatRoom {...props} chatGenerating />)).toBe(false);
    expect(hasChip(<PersonaChatRoom {...props} messages={[deep, { id: "m3", role: "user" as const, text: "Thêm" }]} />)).toBe(false);
    expect(hasChip(<PersonaChatRoom {...props} messages={[{ ...deep, uiMetadata: { modelTier: "standard" } }]} />)).toBe(false);
    expect(hasChip(<PersonaChatRoom {...props} messages={[{ ...deep, uiMetadata: { modelTier: "deep_knowledge", fallback: true } }]} />)).toBe(false);
  });
});
