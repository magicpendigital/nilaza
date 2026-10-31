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

function renderTree(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree!;
}

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

  it("shows the 115 support card under a crisis safety reply only", () => {
    const tree = renderTree(<PersonaChatRoom {...baseProps()} messages={[
      { id: "m1", role: "user" as const, text: "I want to die" },
      { id: "m2", role: "guide" as const, text: "I hear that this is very hard.", uiMetadata: { safety: "crisis" } }
    ]} />);
    expectText(tree, "Call 115");
    const ordinary = renderTree(<PersonaChatRoom {...baseProps()} messages={[{ id: "m3", role: "guide" as const, text: "Notice the pause." }]} />);
    expect(textContent(ordinary.toJSON())).not.toContain("Call 115");
  });
});
