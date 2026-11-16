import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Tarot v2 pack 0 (Owner 2026-11-16): the button under a free reference reading. It only asks for the AI analysis (the
// caller confirms first); the reading above stays whatever the AI does. No Nil number is shown (Owner decision 2026-11-15).
export function TarotDeepAnalysis({ language, busy, busyLabel, onPress }: { language: Language; busy: boolean; busyLabel: string; onPress: () => void }) {
  const vi = language === "vi";
  return (
    <View style={s.panel}>
      <Text style={s.body}>{vi
        ? "Bài đọc ở trên giống nhau với ai rút cùng các lá. Phân tích chuyên sâu để AI đọc chính câu hỏi của bạn. Chỉ tính lượt khi AI trả bài."
        : "The reading above is the same for anyone who draws these cards. Deep analysis lets the AI read your own question. It only counts when the AI delivers."}</Text>
      <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={onPress} style={[s.button, busy && s.disabled]}>
        <Text style={s.buttonText}>{busy ? busyLabel : vi ? "Phân tích chuyên sâu bằng AI" : "Deep analysis with AI"}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { gap: 10, marginTop: 16 },
  body: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 20 },
  button: { minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.6)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 }
});
