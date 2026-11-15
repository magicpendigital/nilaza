import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Canonical crisis copy, shared by the card and by screens that also need it as text (Astrology,
// UX review K5/U2 2026-11-15). Owner decision 2026-10-31: 115 is the only number shown until other
// Vietnamese hotlines are verified.
export function crisisSupportCopy(language: Language) {
  const vi = language === "vi";
  return {
    title: vi ? "Bạn không phải ở một mình" : "You do not have to be alone",
    body: vi
      ? "Nếu bạn đang không an toàn, hãy gọi 115 (cấp cứu) hoặc nhờ một người bạn tin cậy ở cạnh bạn ngay bây giờ."
      : "If you are not safe, call 115 (emergency, Vietnam) or ask someone you trust to be with you now.",
    call: vi ? "Gọi 115" : "Call 115",
    note: vi ? "Lượt này không tính vào lượt hôm nay của bạn." : "This does not count toward today's turns."
  };
}

// Support card under a crisis safety reply in chat, Council, Oracle and Astrology.
export function CrisisSupportCard({ language }: { language: Language }) {
  const copy = crisisSupportCopy(language);
  return (
    <View accessibilityRole="summary" style={s.card}>
      <Text style={s.title}>{copy.title}</Text>
      <Text style={s.body}>{copy.body}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void Linking.openURL("tel:115").catch(() => undefined); }} style={s.button}>
        <Ionicons name="call-outline" size={18} color={colors.charcoal} />
        <Text style={s.buttonText}>{copy.call}</Text>
      </Pressable>
      <Text style={s.note}>{copy.note}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 8, padding: 16, borderRadius: radius.card, backgroundColor: "#2A1F22", borderWidth: 1, borderColor: "rgba(231, 183, 190, 0.45)", gap: 10 },
  title: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15.5 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 21 },
  button: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ivory, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 }
});
