import { ReactNode, useRef } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";

export function TarotArtworkButton({ children, label, hint, previewLabel, onPress, onPreview, style }: {
  children: ReactNode;
  label: string;
  hint: string;
  previewLabel: string;
  onPress: () => void;
  onPreview: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const previewed = useRef(false);
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityActions={[{ name: "activate" }, { name: "preview", label: previewLabel }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === "preview") onPreview();
        if (event.nativeEvent.actionName === "activate") onPress();
      }}
      delayLongPress={450}
      onPressIn={() => { previewed.current = false; }}
      onLongPress={() => { previewed.current = true; onPreview(); }}
      onPress={() => { if (!previewed.current) onPress(); }}
      style={style}
    >
      {children}
    </Pressable>
  );
}
