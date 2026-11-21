import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { CrisisSupportCard } from "../safety/CrisisSupportCard";

// While the deep read is written (up to about two minutes, Owner 2026-11-03) the card names the stage
// the request is most likely in. Stages follow elapsed time, not live progress, and say so.
export const deepReadStages = [
  { after: 0, vi: "Đang đọc các vị trí trong lá số", en: "Reading the placements in your chart" },
  { after: 10, vi: "Đang nối các góc hợp và suy ngẫm", en: "Connecting aspects and reflecting" },
  { after: 60, vi: "Đang viết bài đọc", en: "Writing your read" }
];

export function deepReadStage(elapsedSeconds: number) {
  return [...deepReadStages].reverse().find((stage) => elapsedSeconds >= stage.after) ?? deepReadStages[0];
}

function useElapsedSeconds(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!active) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return elapsed;
}

// Đọc sâu với AI on the chart overview (Owner decisions 2026-10-31): entitled accounts write one deep
// read per local day. UX review K4/U1 (2026-11-15): a visitor without an account gets a sign-in button;
// Premium wording appears only while Premium is on sale, never "Sắp ra mắt". With onOpenPremium the
// Premium button opens the Premium section of Me instead of only showing a hint.
export function AiDeepRead({ language, available, premiumOnSale, signInRequired = false, onSignIn, onOpenPremium, crisis = false, status, answer, error, onWrite, onOpenFull }: {
  language: Language;
  available: boolean;
  premiumOnSale: boolean;
  onOpenPremium?: () => void;
  signInRequired?: boolean;
  onSignIn?: () => void;
  crisis?: boolean;
  status: "ready" | "loading" | "success" | "error" | "locked";
  answer?: { title: string; paragraphs: string[] };
  error?: string;
  onWrite: () => void;
  onOpenFull: () => void;
}) {
  const vi = language === "vi";
  const [premiumHint, setPremiumHint] = useState(false);
  const elapsed = useElapsedSeconds(status === "loading");
  const stage = deepReadStage(elapsed);
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
              ? "Hiểu vì sao bạn vừa thế này vừa thế kia: bài đọc riêng nối Mặt Trời, Mặt Trăng, Cung mọc và các góc hợp trong lá số của bạn thành một bức tranh, kèm câu hỏi để tự soi chiếu."
              : "See why you can be one way and another at once: a personal read that ties your Sun, Moon, Rising and aspects into one picture, with questions for self-reflection."}
          </Text>
          {available ? (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: status === "loading" }} disabled={status === "loading"} onPress={onWrite} style={s.primary}>
              {status === "loading" ? <ActivityIndicator color={colors.charcoal} /> : null}
              <Text style={s.primaryText}>{status === "loading" ? (vi ? "Đang viết…" : "Writing…") : vi ? "Viết bài đọc sâu · 1 lượt/ngày" : "Write a deep read · 1 a day"}</Text>
            </Pressable>
          ) : signInRequired && onSignIn ? (
            <Pressable accessibilityRole="button" onPress={onSignIn} style={s.primary}>
              <Text style={s.primaryText}>{vi ? "Đăng nhập để dùng · 1 lượt/ngày" : "Sign in to use · 1 a day"}</Text>
            </Pressable>
          ) : premiumOnSale ? (
            <Pressable accessibilityRole="button" onPress={() => (onOpenPremium ? onOpenPremium() : setPremiumHint(true))} style={s.secondary}>
              <Text style={s.secondaryText}>{vi ? "Có trong Premium" : "Included in Premium"}</Text>
            </Pressable>
          ) : (
            <Text style={s.note}>{vi ? "Bài đọc sâu chưa mở cho tài khoản này." : "Deep read is not open for this account yet."}</Text>
          )}
          {status === "loading" ? (
            <View accessibilityLiveRegion="polite" style={s.stages}>
              {deepReadStages.map((item) => {
                const done = elapsed >= item.after && item !== stage;
                const current = item === stage;
                return (
                  <View key={item.after} style={s.stageRow}>
                    <Ionicons name={done ? "checkmark-circle" : current ? "ellipse" : "ellipse-outline"} size={14} color={done || current ? colors.gold : "#6E675F"} />
                    <Text style={[s.stageText, current && s.stageCurrent]}>{vi ? item.vi : item.en}</Text>
                  </View>
                );
              })}
              <Text style={s.note}>{vi ? "Thường mất 1–2 phút. Các bước tính theo thời gian chờ, không phải tiến độ thật." : "Usually 1–2 minutes. Steps follow the wait time, not live progress."}</Text>
            </View>
          ) : null}
          {premiumHint && premiumOnSale && !available ? <Text style={s.note}>{vi ? "Mở mục Tôi để xem gói Premium." : "Open Me to see Premium."}</Text> : null}
          {status === "error" && crisis ? <CrisisSupportCard language={language} /> : null}
          {status === "error" && !crisis && error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
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
  stages: { gap: 6 },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stageText: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  stageCurrent: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  error: { color: "#E7B7BE", fontFamily: typography.bodyFontFamily, fontSize: 13.5 }
});
