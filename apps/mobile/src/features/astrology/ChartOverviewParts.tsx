import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { localizeAstrologySign } from "./contracts";
import type { BigThree } from "./sky";

// "LINH · 15/03/2000 · 14:30 · HÀ NỘI" without the name until charts carry one.
export function chartHeaderLine(input: { date: string; time?: string }, placeName: string, language: Language) {
  const [year, month, day] = input.date.split("-");
  const date = language === "vi" ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  return [date, input.time ?? (language === "vi" ? "Không rõ giờ" : "Unknown time"), placeName.split(" · ")[0]].join(" · ");
}

export function BigThreeCards({ big3, language }: { big3: BigThree; language: Language }) {
  const vi = language === "vi";
  const cards = [
    { glyph: "☉", label: vi ? "Mặt Trời" : "Sun", sign: big3.sun, role: vi ? "Bạn là ai" : "Who you are" },
    { glyph: "☽", label: vi ? "Mặt Trăng" : "Moon", sign: big3.moon, role: vi ? "Bạn cảm thế nào" : "How you feel" },
    ...(big3.rising ? [{ glyph: "↑", label: vi ? "Cung mọc" : "Rising", sign: big3.rising, role: vi ? "Người khác thấy" : "How others see you" }] : [])
  ];
  return (
    <View style={s.cards}>
      {cards.map((card) => (
        <View key={card.label} style={s.card} accessible accessibilityLabel={`${card.label} ${localizeAstrologySign(card.sign, language)}. ${card.role}`}>
          <Text style={s.glyph}>{card.glyph} {card.label}</Text>
          <Text style={s.sign}>{localizeAstrologySign(card.sign, language)}</Text>
          <Text style={s.role}>{card.role}</Text>
        </View>
      ))}
    </View>
  );
}

export function ChartRowLink({ title, detail, onPress, icon }: { title: string; detail: string; onPress: () => void; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>
      <Ionicons name={icon} size={20} color={colors.gold} />
      <View style={s.flex}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B8B0A4" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  cards: { flexDirection: "row", gap: 8 },
  card: { flex: 1, minWidth: 0, padding: 12, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 4 },
  glyph: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12 },
  sign: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 19, lineHeight: 23 },
  role: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 16 },
  row: { minHeight: layout.minimumTouchTarget + 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.card, backgroundColor: "#1F1C1E", flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  rowDetail: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, marginTop: 2 }
});
