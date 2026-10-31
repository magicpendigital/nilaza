import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Đọc sâu với AI on the chart overview (Owner decisions 2026-10-31): free accounts see what the AI adds
// and "Có trong Premium" (Sắp ra mắt while nothing is sold); Premium writes one deep read per local day.
export function AiDeepRead({ language, available, premiumOnSale, status, answer, error, onWrite, onOpenFull }: {
  language: Language;
  available: boolean;
  premiumOnSale: boolean;
  status: "ready" | "loading" | "success" | "error" | "locked";
  answer?: { title: string; paragraphs: string[] };
  error?: string;
  onWrite: () => void;
  onOpenFull: () => void;
}) {
  const vi = language === "vi";
  const [soon, setSoon] = useState(false);
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Ionicons name="sparkles-outline" size={18} color={colors.gold} />
        <Text style={s.kicker}>{vi ? "Đọc sâu với AI" : "Deep read with AI"}</Text>
      </View>
      {status === "success" && answer ? (
        <>
          <Text style={s.title}>{answer.title}</Text>
          {answer.paragraphs[0] ? <Text numberOfLines={4} style={s.body}>{answer.paragraphs[0]}</Text> : null}
          <Pressable accessibilityRole="button" onPress={onOpenFull} style={s.secondary}>
            <Text style={s.secondaryText}>{vi ? "Đọc đầy đủ" : "Read in full"}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={s.body}>
            {vi
              ? "Một bài đọc riêng nối Mặt Trời, Mặt Trăng, Cung mọc và các góc hợp trong lá số của bạn, kèm câu hỏi để tự soi chiếu."
              : "A personal read that links your Sun, Moon, Rising and aspects, with questions for self-reflection."}
          </Text>
          {available ? (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: status === "loading" }} disabled={status === "loading"} onPress={onWrite} style={s.primary}>
              {status === "loading" ? <ActivityIndicator color={colors.charcoal} /> : null}
              <Text style={s.primaryText}>{status === "loading" ? (vi ? "Đang viết…" : "Writing…") : vi ? "Viết bài đọc sâu · 1 lượt/ngày" : "Write a deep read · 1 a day"}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setSoon(true)} style={s.secondary}>
              <Text style={s.secondaryText}>{vi ? "Có trong Premium" : "Included in Premium"}</Text>
            </Pressable>
          )}
          {soon && !available ? <Text style={s.note}>{premiumOnSale ? (vi ? "Mở mục Tôi để xem gói Premium." : "Open Me to see Premium.") : vi ? "Sắp ra mắt." : "Coming soon."}</Text> : null}
          {status === "error" && error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
        </>
      )}
      <Text style={s.note}>{vi ? "Diễn giải biểu tượng để tự phản chiếu, không phải dự đoán." : "Symbolic interpretation for self-reflection, not prediction."}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 16, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)", gap: 10 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21, lineHeight: 26 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 21 },
  primary: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ivory, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  secondary: { minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.2)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  error: { color: "#E7B7BE", fontFamily: typography.bodyFontFamily, fontSize: 13.5 }
});
