import React from "react";
import renderer, { act } from "react-test-renderer";
import { TarotArtworkButton } from "../TarotArtworkButton";

jest.mock("react-native", () => ({ Pressable: "Pressable" }));

it("separates tap, long press and accessible preview without changing cards", () => {
  const onPress = jest.fn();
  const onPreview = jest.fn();
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(
    <TarotArtworkButton label="Mặt Trăng" hint="Chạm giữ để xem tranh" previewLabel="Xem tranh" onPress={onPress} onPreview={onPreview}>
      Mặt Trăng
    </TarotArtworkButton>
  ); });
  const button = tree!.root.findByType("Pressable" as any);
  act(() => { button.props.onPressIn(); button.props.onPress(); });
  expect(onPress).toHaveBeenCalledTimes(1);
  act(() => { button.props.onPressIn(); button.props.onLongPress(); button.props.onPress(); });
  expect(onPreview).toHaveBeenCalledTimes(1);
  expect(onPress).toHaveBeenCalledTimes(1);
  act(() => { button.props.onAccessibilityAction({ nativeEvent: { actionName: "preview" } }); });
  expect(onPreview).toHaveBeenCalledTimes(2);
  expect(button.props.accessibilityRole).toBe("imagebutton");
  expect(button.props.accessibilityActions).toContainEqual({ name: "preview", label: "Xem tranh" });
  act(() => { button.props.onPressIn(); button.props.onPress(); });
  expect(onPress).toHaveBeenCalledTimes(2);
});
