import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Tarot v2 pack 0 (Owner 2026-11-16): the button under a free reference reading. It only asks for the AI analysis (the
// caller confirms first); the reading above stays whatever the AI does. No Nil number is shown (Owner decision 2026-11-15).
// Value report batch A (Owner 2026-11-21): lead with what the person receives; promise only what the analysis returns today.
// Batch B (Owner feedback 21/11): an optional hook names the two drawn cards the deep reading will look into.
export function TarotDeepAnalysis({ language, busy, busyLabel, onPress, hook }: { language: Language; busy: boolean; busyLabel: string; onPress: () => void; hook?: string }) {
  const vi = language === "vi";
  const points = vi
    ? ["Đọc chính câu hỏi bạn vừa viết", "Nối từng lá với vị trí của nó trong trải bài", "Gợi một hướng nên cân nhắc và một câu hỏi để viết"]
    : ["Reads the question you just wrote", "Links each card to its place in the spread", "Offers a direction to consider and a question to write about"];
  return (
    <View style={s.panel}>
      <Text style={s.title}>{vi ? "Muốn đi sâu hơn vào câu hỏi của bạn?" : "Want to go deeper into your question?"}</Text>
      {hook ? <Text style={s.hook}>{hook}</Text> : null}
      <View style={s.list}>
        {points.map((point) => (
          <Text key={point} style={s.point}>{`•  ${point}`}</Text>
        ))}
      </View>
      <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={onPress} style={[s.button, busy && s.disabled]}>
        <Text style={s.buttonText}>{busy ? busyLabel : vi ? "Đọc chuyên sâu cho câu hỏi này" : "Deep reading for this question"}</Text>
      </Pressable>
      <Text style={s.note}>{vi ? "Chỉ tính lượt khi bài đọc được trả về." : "It only counts when the reading is delivered."}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { gap: 10, marginTop: 16 },
  title: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15, lineHeight: 22 },
  hook: { color: "#D8D0C4", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21 },
  list: { gap: 4 },
  point: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 20 },
  button: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.ink, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18, textAlign: "center" }
});
