import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { localizeAstrologySign, type AstrologySignId } from "./contracts";
import type { BigThree } from "./sky";
import type { Big3Story, TopicReading } from "./skyContent";

// "LINH · 15/03/2000 · 14:30 · HÀ NỘI" without the name until charts carry one.
export function chartHeaderLine(input: { date: string; time?: string }, placeName: string, language: Language) {
  const [year, month, day] = input.date.split("-");
  const date = language === "vi" ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  return [date, input.time ?? (language === "vi" ? "Không rõ giờ" : "Unknown time"), placeName.split(" · ")[0]].join(" · ");
}

// One sign, or the sampled possibilities when the birth time is not exact.
export function signList(signs: AstrologySignId[], language: Language) {
  return signs.map((sign) => localizeAstrologySign(sign, language)).join(" / ");
}

export function BigThreeCards({ big3, language }: { big3: BigThree; language: Language }) {
  const vi = language === "vi";
  const cards = [
    { glyph: "☉", label: vi ? "Mặt Trời" : "Sun", sign: signList(big3.sun, language), role: vi ? "Bạn là ai" : "Who you are" },
    { glyph: "☽", label: vi ? "Mặt Trăng" : "Moon", sign: signList(big3.moon, language), role: vi ? "Bạn cảm thế nào" : "How you feel" },
    ...(big3.rising ? [{ glyph: "↑", label: vi ? "Cung mọc" : "Rising", sign: localizeAstrologySign(big3.rising, language), role: vi ? "Người khác thấy" : "How others see you" }] : [])
  ];
  return (
    <View style={s.cards}>
      {cards.map((card) => (
        <View key={card.label} style={s.card} accessible accessibilityLabel={`${card.label} ${card.sign}. ${card.role}`}>
          <Text style={s.glyph}>{card.glyph} {card.label}</Text>
          <Text style={s.sign}>{card.sign}</Text>
          <Text style={s.role}>{card.role}</Text>
        </View>
      ))}
    </View>
  );
}

export function Big3Summary({ story }: { story: Big3Story }) {
  return (
    <View style={s.summary}>
      {story.headline ? <Text style={s.headline} accessibilityRole="header">{story.headline}</Text> : null}
      {story.lines.map((line) => <Text key={line} style={s.summaryLine}>{line}</Text>)}
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

export function SkyTabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string }[]; active: T; onChange: (id: T) => void }) {
  return (
    <View style={s.tabs} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(tab.id)} style={[s.tab, selected && s.tabActive]}>
            <Text style={[s.tabText, selected && s.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TopicPanel({ reading, language, onAddBirthTime }: { reading: TopicReading; language: Language; onAddBirthTime: () => void }) {
  const vi = language === "vi";
  return (
    <View style={s.panel}>
      {reading.points.map((point) => (
        <View key={point.id} style={s.pointCard}>
          <Text style={s.pointKicker}>
            {point.sign ? `${point.name} · ${localizeAstrologySign(point.sign, language)}` : point.name}
          </Text>
          {point.sign ? (
            <>
              <Text style={s.pointTitle}>{point.title}</Text>
              <Text style={s.summaryLine}>{point.body}</Text>
              <View style={s.columns}>
                <View style={s.column}>
                  <Text style={[s.columnLabel, s.needsLabel]}>{reading.labels.needs}</Text>
                  {point.needs?.map((item) => <Text key={item} style={s.item}>{item}</Text>)}
                </View>
                <View style={s.column}>
                  <Text style={[s.columnLabel, s.watchLabel]}>{reading.labels.watch}</Text>
                  {point.watch?.map((item) => <Text key={item} style={s.item}>{item}</Text>)}
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={s.role}>{point.intro}</Text>
              <Text style={s.summaryLine}>{reading.needsBirthTime}</Text>
            </>
          )}
        </View>
      ))}
      {reading.missingTime ? (
        <Pressable accessibilityRole="button" onPress={onAddBirthTime} style={s.invite}>
          <Text style={s.inviteText}>{vi ? "Bổ sung giờ sinh" : "Add birth time"}</Text>
        </Pressable>
      ) : null}
      {reading.birthTimeNote ? <Text style={s.note}>{reading.birthTimeNote}</Text> : null}
      <Text style={s.note}>{reading.reminder}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  cards: { flexDirection: "row", gap: 8 },
  card: { flex: 1, minWidth: 0, padding: 12, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 4 },
  glyph: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12 },
  sign: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 19, lineHeight: 23 },
  role: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 16 },
  summary: { gap: 8 },
  headline: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 24, lineHeight: 29 },
  summaryLine: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22 },
  row: { minHeight: layout.minimumTouchTarget + 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.card, backgroundColor: "#1F1C1E", flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  rowDetail: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, marginTop: 2 },
  tabs: { flexDirection: "row", gap: 6 },
  tab: { flexGrow: 1, minHeight: layout.minimumTouchTarget, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.18)", alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.ivory, borderColor: colors.ivory },
  tabText: { color: "#E9E2D6", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  tabTextActive: { color: colors.charcoal },
  panel: { gap: 12 },
  pointCard: { padding: 16, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 8 },
  pointKicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },
  pointTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21, lineHeight: 26 },
  columns: { flexDirection: "row", gap: 14, marginTop: 2 },
  column: { flex: 1, minWidth: 0, gap: 6 },
  columnLabel: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  needsLabel: { color: "#9FD3CF" },
  watchLabel: { color: "#E7B7BE" },
  item: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  invite: { minHeight: layout.minimumTouchTarget, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  inviteText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 }
});
