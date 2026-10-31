import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => {
  const React = require("react");
  const createComponent = (name: string) => ({ children, ...props }: any) => React.createElement(name, props, children);
  const animation = {
    start: jest.fn((callback?: () => void) => callback?.()),
    stop: jest.fn(),
  };

  return {
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(async () => true),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Animated: {
      Image: createComponent("Animated.Image"),
      Value: class {
        setValue = jest.fn();
        interpolate() {
          return "0deg";
        }
      },
      View: createComponent("Animated.View"),
      delay: jest.fn(() => animation),
      loop: jest.fn(() => animation),
      sequence: jest.fn(() => animation),
      timing: jest.fn(() => animation),
    },
    Easing: {
      linear: jest.fn(),
    },
    Image: createComponent("Image"),
    Pressable: createComponent("Pressable"),
    ScrollView: createComponent("ScrollView"),
    StyleSheet: {
      absoluteFill: {},
      create: (styles: any) => styles,
    },
    Text: createComponent("Text"),
    TextInput: createComponent("TextInput"),
    View: createComponent("View"),
  };
});

import {
  ActionTile,
  ChatComposer,
  GenerationActivityBubble,
  ChatMessageBubble,
  ChatThinkingIndicator,
  ChatParticipantStrip,
  ChatSurface,
  QuickReplyRail,
  Chip,
  ChoiceTile,
  FeatureWide,
  Header,
  IconButton,
  IconText,
  LanguageSelector,
  MiniStat,
  OnboardingProgress,
  PrimaryButton,
  RitualButton,
  SecondaryButton,
  StatusChip,
  StatusLine,
  TopBar,
} from "../index";
import { languageOptions } from "../../i18n";
import { AdaptiveNavigation } from "../AdaptiveNavigation";
import { AdaptiveScaffold, ResponsiveGrid } from "../layout";
import type { GenerationActivity } from "../../types";
import { resolveAdaptiveLayout } from "../../responsive";
import { AccessibilityInfo, Animated } from "react-native";

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

function instanceText(node: renderer.ReactTestInstance): string {
  return node.children.map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return instanceText(child as renderer.ReactTestInstance);
  }).join(" ");
}

function pressFirstButton(tree: renderer.ReactTestRenderer) {
  const button = tree.root.findAll((node) => node.props.accessibilityRole === "button")[0];
  expect(button).toBeTruthy();
  act(() => {
    button.props.onPress?.();
  });
}

describe("a2ui Components", () => {
  it("exposes selected and disabled state independently of color", () => {
    const chip = renderTree(<Chip active label="Self" onPress={() => {}} />);
    expect(chip.root.findByType("Pressable" as any).props.accessibilityState).toEqual({ selected: true });
    const ritual = renderTree(<RitualButton disabled label="Wait" onPress={() => {}} />);
    expect(ritual.root.findByType("Pressable" as any).props.accessibilityState).toEqual({ disabled: true });
    expect(ritual.root.findByType("Pressable" as any).props.disabled).toBe(true);
    act(() => { chip.unmount(); ritual.unmount(); });
  });

  it("keeps status static until preference resolves and stops animation on a later OS event", async () => {
    let resolvePreference!: (value: boolean) => void;
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockImplementationOnce(() => new Promise<boolean>(resolve => { resolvePreference = resolve; }));
    (AccessibilityInfo.addEventListener as jest.Mock).mockClear();
    (Animated.loop as jest.Mock).mockClear();
    const tree = renderTree(<ChatThinkingIndicator label="Reflecting" />);
    expectText(tree, "Reflecting");
    expect(Animated.loop).not.toHaveBeenCalled();
    const onPreference = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls[0][1];
    await act(async () => { resolvePreference(false); });
    expect(Animated.loop).toHaveBeenCalledTimes(1);
    const animation = (Animated.loop as jest.Mock).mock.results[0].value;
    animation.stop.mockClear();
    act(() => onPreference(true));
    expect(animation.stop).toHaveBeenCalledTimes(1);
    expectText(tree, "Reflecting");
    act(() => tree.unmount());
  });

  it("does not let a late initial preference overwrite an OS change", async () => {
    let resolvePreference!: (value: boolean) => void;
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockImplementationOnce(() => new Promise<boolean>(resolve => { resolvePreference = resolve; }));
    (AccessibilityInfo.addEventListener as jest.Mock).mockClear();
    (Animated.loop as jest.Mock).mockClear();
    const tree = renderTree(<ChatThinkingIndicator label="Reflecting" />);
    const onPreference = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls[0][1];
    act(() => onPreference(true));
    await act(async () => { resolvePreference(false); });
    expect(Animated.loop).not.toHaveBeenCalled();
    act(() => tree.unmount());
  });
  it("stretches rail content vertically so long screens have a bounded scroll viewport", () => {
    const tree = renderTree(<AdaptiveScaffold layout={resolveAdaptiveLayout(1180, 820)}><React.Fragment /></AdaptiveScaffold>);
    const content = tree.root.findAllByType("View" as any).find(node => Array.isArray(node.props.style) &&
      node.props.style.some((style: any) => style?.marginHorizontal === "auto"));
    const resolvedStyle = Object.assign({}, ...content!.props.style.filter(Boolean));
    expect(resolvedStyle.alignSelf).toBe("stretch");
    expect(resolvedStyle.minHeight).toBe(0);
    expect(resolvedStyle.minWidth).toBe(0);
    expect(resolvedStyle.flex).toBe(1);
  });

  it("sizes grid cells by available container width, never by device model", () => {
    const tree = renderTree(<ResponsiveGrid minItemWidth={240}><React.Fragment /><React.Fragment /></ResponsiveGrid>);
    const grid = tree.root.findAllByType("View" as any).find(node => node.props.onLayout);
    act(() => grid!.props.onLayout({ nativeEvent: { layout: { width: 320 } } }));
    expect(grid!.children[0]).toHaveProperty("props.style.width", 320);
    act(() => grid!.props.onLayout({ nativeEvent: { layout: { width: 1000 } } }));
    expect(grid!.children[0]).toHaveProperty("props.style.width", 492);
  });

  it("preserves child state when rotating between tabs and rail", () => {
    const mounted = jest.fn();
    function Draft() {
      const [draft, setDraft] = React.useState("question");
      React.useEffect(() => { mounted(); }, []);
      return React.createElement("Draft", { draft, onChange: setDraft });
    }
    const renderLayout = (width: number, height: number) => {
      const layout = resolveAdaptiveLayout(width, height);
      return <AdaptiveScaffold layout={layout} navigation={React.createElement("Navigation")}><Draft /></AdaptiveScaffold>;
    };
    const tree = renderTree(renderLayout(768, 1024));
    act(() => tree.root.findByType("Draft" as any).props.onChange("unsent draft"));
    act(() => tree.update(renderLayout(1024, 768)));
    expect(tree.root.findByType("Draft" as any).props.draft).toBe("unsent draft");
    act(() => tree.update(renderLayout(500, 768)));
    expect(tree.root.findByType("Draft" as any).props.draft).toBe("unsent draft");
    expect(mounted).toHaveBeenCalledTimes(1);
  });

  it.each(["bottom", "rail"] as const)("shares tab labels and selected state in %s navigation", mode => {
    const onSelect = jest.fn();
    const items = [{ id: "chat", label: "Trò chuyện", icon: "chatbubble-outline" as const }];
    const tree = renderTree(<AdaptiveNavigation items={items} selected="chat" mode={mode} onSelect={onSelect} />);
    const tab = tree.root.findByType("Pressable" as any);
    expect(tab.props.accessibilityLabel).toBe("Trò chuyện");
    expect(tab.props.accessibilityState).toEqual({ selected: true });
    const resolvedStyle = Object.assign({}, ...tab.props.style.filter(Boolean));
    expect(resolvedStyle.minHeight).toBeGreaterThanOrEqual(44);
    expect(resolvedStyle.minWidth).toBeGreaterThanOrEqual(44);
    act(() => tab.props.onPress());
    expect(onSelect).toHaveBeenCalledWith("chat");
  });

  it("renders TopBar correctly", () => {
    const tree = renderTree(<TopBar title="Test Title" leftIcon="chevron-back" rightIcon="settings" />);
    expectText(tree, "Test Title");
  });

  it("adds the brand emblem to Nilaza top bars", () => {
    const tree = renderTree(<TopBar title="NILAZA" />);
    const emblem = tree.root.findByType("Image" as any);
    expect(emblem.props.resizeMode).toBe("contain");
    expect(tree.root.findAll(node => node.props.accessibilityLabel === "Nilaza").length).toBeGreaterThan(0);
  });

  it("renders IconButton and responds to press", () => {
    const onPressMock = jest.fn();
    const tree = renderTree(<IconButton name="settings" onPress={onPressMock} />);
    pressFirstButton(tree);
    expect(onPressMock).toHaveBeenCalledTimes(1);
    const button = tree.root.find((node) => node.props.accessibilityRole === "button");
    expect(button.props.accessibilityLabel).toBe("settings");
    expect(button.props.style).toEqual(expect.objectContaining({ height: 48, width: 48 }));
    expect(button.props.hitSlop).toBe(8);
  });

  it("renders IconText and responds to press", () => {
    const onPressMock = jest.fn();
    const tree = renderTree(<IconText label="Test Label" name="settings" onPress={onPressMock} />);
    expectText(tree, "Test Label");
    pressFirstButton(tree);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders Header correctly", () => {
    const tree = renderTree(<Header eyebrow="Test Eyebrow" title="Test Title" />);
    expectText(tree, "Test Eyebrow");
    expectText(tree, "Test Title");
  });

  it("renders OnboardingProgress correctly", () => {
    const tree = renderTree(<OnboardingProgress step={2} />);
    expect(tree.root).toBeTruthy();
  });

  it("renders PrimaryButton and responds to press", () => {
    const onPressMock = jest.fn();
    const tree = renderTree(<PrimaryButton label="Primary" onPress={onPressMock} />);
    expectText(tree, "Primary");
    pressFirstButton(tree);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders SecondaryButton and responds to press", () => {
    const onPressMock = jest.fn();
    const tree = renderTree(<SecondaryButton label="Secondary" onPress={onPressMock} />);
    expectText(tree, "Secondary");
    pressFirstButton(tree);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders Chip and responds to press", () => {
    const onPressMock = jest.fn();
    const tree = renderTree(<Chip active={true} label="Chip Label" onPress={onPressMock} />);
    expectText(tree, "Chip Label");
    pressFirstButton(tree);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders LanguageSelector and responds to press on enabled languages", () => {
    const onChangeMock = jest.fn();
    const tree = renderTree(<LanguageSelector language="en" onChange={onChangeMock} />);
    expectText(tree, "English");

    pressFirstButton(tree);

    const enabledButton = tree.root
      .findAll((node) => node.props.accessibilityRole === "button")
      .find((node) => node.props.accessibilityState?.selected === true && instanceText(node).includes("English"));
    expect(enabledButton).toBeTruthy();

    act(() => {
      enabledButton?.props.onPress?.();
    });
    expect(onChangeMock).toHaveBeenCalledWith("en");

    const disabledLang = languageOptions.find((item) => !item.enabled);
    if (disabledLang) {
      const disabledButton = tree.root
        .findAll((node) => node.props.accessibilityRole === "button")
        .find((node) => node.props.disabled === true);
      act(() => {
        disabledButton?.props.onPress?.();
      });
      expect(onChangeMock).toHaveBeenCalledTimes(1);
    }
  });

  it("renders ChoiceTile and responds to press", () => {
    const onPressMock = jest.fn();
    const tree = renderTree(<ChoiceTile active={false} detail="Detail text" label="Choice" onPress={onPressMock} />);
    expectText(tree, "Choice");
    expectText(tree, "Detail text");
    pressFirstButton(tree);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders ActionTile and responds to press", () => {
    const onPressMock = jest.fn();
    const tree = renderTree(<ActionTile detail="Detail text" icon="star" label="Action" onPress={onPressMock} />);
    expectText(tree, "Action");
    expectText(tree, "Detail text");
    pressFirstButton(tree);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders FeatureWide and responds to press", () => {
    const onPressMock = jest.fn();
    const tree = renderTree(<FeatureWide detail="Feature detail" icon="star" label="Feature" onPress={onPressMock} muted={true} />);
    expectText(tree, "Feature");
    expectText(tree, "Feature detail");
    pressFirstButton(tree);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders MiniStat correctly", () => {
    const tree = renderTree(<MiniStat label="Label" value="Value" />);
    expectText(tree, "Label");
    expectText(tree, "Value");
  });

  it("renders StatusChip correctly for different tones", () => {
    const tree = renderTree(<StatusChip label="Good" tone="good" />);
    expectText(tree, "Good");

    act(() => {
      tree.update(<StatusChip label="Warn" tone="warn" />);
    });
    expectText(tree, "Warn");

    act(() => {
      tree.update(<StatusChip label="Bad" tone="bad" />);
    });
    expectText(tree, "Bad");

    act(() => {
      tree.update(<StatusChip label="Neutral" tone="neutral" />);
    });
    expectText(tree, "Neutral");

    act(() => {
      tree.update(<StatusChip label="Default" />);
    });
    expectText(tree, "Default");
  });

  it("renders StatusLine correctly", () => {
    const tree = renderTree(<StatusLine label="System Status" status="Operational" tone="good" />);
    expectText(tree, "System Status");
    expectText(tree, "Operational");
  });

  it("renders reusable chat message bubbles", () => {
    const tree = renderTree(
      <ChatMessageBubble author="Marcus" meta="Council guide" tone="guide">
        What are you protecting by waiting?
      </ChatMessageBubble>
    );

    expectText(tree, "Marcus");
    expectText(tree, "Council guide");
    expectText(tree, "What are you protecting by waiting?");
  });

  it("renders ChatComposer and sends only when it has content", () => {
    const onSendMock = jest.fn();
    const tree = renderTree(<ChatComposer onChangeText={jest.fn()} onSend={onSendMock} placeholder="Ask the council" value="" />);
    const emptySendButton = tree.root.findAll((node) => node.props.accessibilityRole === "button")[0];

    expect(emptySendButton.props.accessibilityState.disabled).toBe(true);
    expect(emptySendButton.props.accessibilityLabel).toBe("Gửi");

    act(() => {
      tree.update(<ChatComposer onChangeText={jest.fn()} onSend={onSendMock} placeholder="Ask the council" value="I need perspective" />);
    });

    const activeSendButton = tree.root.findAll((node) => node.props.accessibilityRole === "button")[0];
    expect(activeSendButton.props.accessibilityState.disabled).toBe(false);

    act(() => {
      activeSendButton.props.onPress?.();
    });

    expect(onSendMock).toHaveBeenCalledTimes(1);
  });

  it("renders chat participants and add action", () => {
    const onAddMock = jest.fn();
    const tree = renderTree(
      <ChatParticipantStrip
        addLabel="Add"
        onAdd={onAddMock}
        participants={[{ id: "marcus", name: "Marcus", role: "Stoic guide" }]}
        selectedIds={["marcus"]}
      />
    );

    expectText(tree, "Marcus");
    expectText(tree, "Stoic guide");
    expectText(tree, "Add");

    const addButton = tree.root.findAll((node) => node.props.accessibilityRole === "button").at(-1);
    act(() => {
      addButton?.props.onPress?.();
    });

    expect(onAddMock).toHaveBeenCalledTimes(1);
  });

  it("renders ChatSurface with quick replies", () => {
    const onSelectMock = jest.fn();
    const tree = renderTree(
      <ChatSurface
        composer={<QuickReplyRail prompts={[{ id: "love", label: "Love confusion" }]} onSelect={onSelectMock} />}
        header={<Header eyebrow="Council" title="Group chat" />}
      >
        <ChatMessageBubble tone="system">Your council is ready.</ChatMessageBubble>
      </ChatSurface>
    );

    expectText(tree, "Council");
    expectText(tree, "Group chat");
    expectText(tree, "Your council is ready.");
    expectText(tree, "Love confusion");

    const promptButton = tree.root.findAll((node) => node.props.accessibilityRole === "button")[0];
    act(() => {
      promptButton.props.onPress?.();
    });

    expect(onSelectMock).toHaveBeenCalledWith({ id: "love", label: "Love confusion" });
  });

  it("keeps a privacy-safe activity bubble actionable for waiting and ready work", () => {
    const onOpen = jest.fn();
    const activity: GenerationActivity = {
      id: "job-1",
      feature: "persona_chat",
      status: "working",
      title: { vi: "Aristotle đang suy ngẫm", en: "Aristotle is reflecting" },
      detail: { vi: "Bạn có thể tiếp tục khám phá", en: "You can keep exploring" },
      targetRoute: "chat",
      targetMode: "room",
      personaId: "aristotle",
      createdAt: "2026-09-07T00:00:00.000Z",
      updatedAt: "2026-09-07T00:00:00.000Z"
    };
    const tree = renderTree(<GenerationActivityBubble activity={activity} language="vi" onOpen={onOpen} />);

    expectText(tree, "Aristotle đang suy ngẫm");
    expectText(tree, "Bạn có thể tiếp tục khám phá");
    act(() => tree.root.findByProps({ accessibilityRole: "button" }).props.onPress());
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
