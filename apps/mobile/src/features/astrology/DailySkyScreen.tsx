import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { MoonGlyph } from "../home/MoonGlyph";
import { moonPhaseLabel } from "../home/moonPhase";
import { localizeAstrologySign, type AstrologySignId } from "./contracts";
import { dailySkyAt, type DailySky } from "./dailySky";
import { dailySkyReading, ingressLine, skyPersonalOf, type SkyTopic } from "./dailySkyContent";
import { deviceZone, formatClock, formatDayMonth, localDateOf, type LocalZone } from "./localDay";

// "Bầu trời hôm nay" (Lô 2, spec section 6): works offline and as a guest; the chart, when saved
// on this device, only changes which text is chosen. Nothing is stored or sent from here.

const weekdays = {
  vi: ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};
const shortWeekdays = { vi: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };

const signName = (sign: AstrologySignId, language: Language) => localizeAstrologySign(sign, language);

/** "Trăng gần tròn · 97% sáng · Trăng tròn lúc 21:54 ngày mai" */
export function skyPhaseLine(sky: DailySky, language: Language, zone: LocalZone = deviceZone): string {
  const vi = language === "vi";
  const phase = moonPhaseLabel(sky.phase.id, language).name;
  const percent = `${Math.round(sky.illumination * 100)}% ${vi ? "sáng" : "lit"}`;
  const event = vi ? (sky.next.kind === "full" ? "Trăng tròn" : "Trăng mới") : sky.next.kind === "full" ? "Full moon" : "New moon";
  const time = formatClock(sky.next.at, zone);
  const when = sky.next.days === 0
    ? vi ? `lúc ${time} hôm nay` : `at ${time} today`
    : sky.next.days === 1
      ? vi ? `lúc ${time} ngày mai` : `at ${time} tomorrow`
      : vi ? `ngày ${formatDayMonth(localDateOf(sky.next.at, zone))} lúc ${time}` : `on ${formatDayMonth(localDateOf(sky.next.at, zone))} at ${time}`;
  return `${phase} · ${percent} · ${event} ${when}`;
}

export function DailySkyScreen({ language, now, zone = deviceZone, chart, ready = true, onAddBirthDate, onAddBirthTime, onWriteJournal }: {
  language: Language;
  now?: Date;
  zone?: LocalZone;
  /** The user's saved chart on this device, if any. */
  chart?: CandidateChart | null;
  /** False while saved data is still loading: no invite is shown yet. */
  ready?: boolean;
  onAddBirthDate?: () => void;
  onAddBirthTime?: () => void;
  onWriteJournal?: (prompt: string) => void;
}) {
  const vi = language === "vi";
  const [at] = useState(() => now ?? new Date());
  const [topic, setTopic] = useState<SkyTopic>("love");
  const [howOpen, setHowOpen] = useState(false);
  // A Sun boundary user may pick a sign for this visit only; nothing is saved.
  const [chosenSun, setChosenSun] = useState<AstrologySignId | undefined>();
  const sky = useMemo(() => dailySkyAt(at, zone), [at, zone]);
  const personal = useMemo(() => skyPersonalOf(chart, at, chosenSun), [chart, at, chosenSun]);
  const reading = dailySkyReading(sky, personal, language, zone);
  const ingress = ingressLine(sky, language, zone);
  const phaseLine = skyPhaseLine(sky, language, zone);
  const dateLabel = `${weekdays[language === "vi" ? "vi" : "en"][sky.week[0].weekday]} · ${formatDayMonth(sky.date)}`;
  const moonTitle = vi ? `Trăng ở ${signName(sky.sign, language)}` : `Moon in ${signName(sky.sign, language)}`;
  const activeTopic = reading.topics.find((item) => item.id === topic) ?? reading.topics[0];
  const disclaimer = reading.how.lines[reading.how.lines.length - 1];
  const dayNames = shortWeekdays[vi ? "vi" : "en"];

  return (
    <View style={s.root}>
      <Text style={s.kicker} accessibilityRole="header">{vi ? "Bầu trời hôm nay" : "Today's sky"}</Text>

      <View style={s.moonCard} accessible accessibilityLabel={[dateLabel, moonTitle, phaseLine, ingress, reading.phaseNote].filter(Boolean).join(". ")}>
        <MoonGlyph phase={sky} size={64} />
        <View style={s.flex}>
          <Text style={s.meta}>{dateLabel}</Text>
          <Text style={s.moonTitle}>{moonTitle}</Text>
          <Text style={s.meta}>{phaseLine}</Text>
          {ingress ? <Text style={s.ingress}>{ingress}</Text> : null}
          {reading.phaseNote ? <Text style={s.meta}>{reading.phaseNote}</Text> : null}
        </View>
      </View>

      <View style={s.sourceChip}><Text style={s.sourceText}>{reading.source}</Text></View>

      {reading.notice && personal.kind === "boundary" ? (
        <View style={s.notice}>
          <Text style={s.body}>{reading.notice}</Text>
          <View style={s.links}>
            {onAddBirthTime ? (
              <Pressable accessibilityRole="button" onPress={onAddBirthTime} style={s.linkButton}>
                <Text style={s.link}>{vi ? "Thêm giờ sinh" : "Add birth time"}</Text>
              </Pressable>
            ) : null}
            {personal.options.map((sign) => (
              <Pressable key={sign} accessibilityRole="button" onPress={() => setChosenSun(sign)} style={s.linkButton}>
                <Text style={s.link}>{vi ? `Chọn tạm ${signName(sign, language)}` : `Use ${signName(sign, language)} for now`}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={s.headline}>{reading.headline}</Text>
      <Text style={s.body}>{reading.body}</Text>

      <View style={s.columns}>
        <View style={s.column}>
          <Text style={[s.columnLabel, s.leanLabel]}>{reading.labels.lean}</Text>
          {reading.lean.map((item) => <Text key={item} style={s.item}>{item}</Text>)}
        </View>
        <View style={s.column}>
          <Text style={[s.columnLabel, s.easeLabel]}>{reading.labels.ease}</Text>
          {reading.ease.map((item) => <Text key={item} style={s.item}>{item}</Text>)}
        </View>
      </View>

      <View style={s.card}>
        <View style={s.tabs} accessibilityRole="tablist">
          {reading.topics.map((item) => (
            <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: item.id === topic }} onPress={() => setTopic(item.id)} style={[s.tab, item.id === topic && s.tabActive]}>
              <Text style={[s.tabText, item.id === topic && s.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.body}>{activeTopic.text}</Text>
      </View>

      {reading.personal ? (
        <View style={s.card}>
          <Text style={s.kicker}>{reading.personal.label}</Text>
          <Text style={s.cardTitle}>{reading.personal.title}</Text>
          <Text style={s.body}>{reading.personal.body}</Text>
          {personal.kind === "house" ? <Text style={s.note}>{vi ? "Nhà theo cung nguyên (Whole Sign), tính từ giờ sinh bạn đã nhập." : "Whole Sign houses, from the birth time you entered."}</Text> : null}
        </View>
      ) : null}

      {ready && reading.invite ? (
        <View style={s.invite}>
          <Text style={s.body}>{reading.invite.text}</Text>
          {(reading.invite.kind === "birthDate" ? onAddBirthDate : onAddBirthTime) ? (
            <Pressable accessibilityRole="button" onPress={reading.invite.kind === "birthDate" ? onAddBirthDate : onAddBirthTime} style={s.linkButton}>
              <Text style={s.link}>{reading.invite.kind === "birthDate" ? (vi ? "Thêm ngày sinh →" : "Add birth date →") : vi ? "Thêm giờ sinh →" : "Add birth time →"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Text style={s.kicker} accessibilityRole="header">{vi ? "7 ngày tới của Mặt Trăng" : "The Moon's next 7 days"}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.week}>
        {sky.week.map((day, index) => {
          const name = signName(day.sign, language);
          const label = index === 0 ? (vi ? "Hôm nay" : "Today") : dayNames[day.weekday];
          const change = day.change ? `→ ${formatClock(day.change.at, zone)}` : "";
          const spoken = [`${label} ${formatDayMonth(day.date)}`, name, day.change ? (vi ? `đổi sang ${signName(day.change.to, language)} lúc ${formatClock(day.change.at, zone)}` : `moves into ${signName(day.change.to, language)} at ${formatClock(day.change.at, zone)}`) : ""].filter(Boolean).join(", ");
          return (
            <View key={day.key} style={[s.day, index === 0 && s.dayToday]} accessible accessibilityLabel={spoken}>
              <Text style={s.dayName}>{label}</Text>
              <MoonGlyph phase={day} size={24} />
              <Text style={s.daySign} numberOfLines={2}>{name}</Text>
              {change ? <Text style={s.dayChange}>{change}</Text> : null}
            </View>
          );
        })}
      </ScrollView>
      <Text style={s.note}>{reading.weekNote}</Text>

      <View style={s.card}>
        <Text style={s.kicker}>{vi ? "Câu hỏi để viết" : "A question to write about"}</Text>
        <Text style={s.cardTitle}>{reading.journal}</Text>
        {onWriteJournal ? (
          <Pressable accessibilityRole="button" onPress={() => onWriteJournal(reading.journal)} style={s.primary}>
            <Text style={s.primaryText}>{vi ? "Viết vào Nhật ký" : "Write in Journal"}</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: howOpen }} onPress={() => setHowOpen((open) => !open)} style={s.howRow}>
        <Text style={s.cardTitleSmall}>{reading.how.title}</Text>
        <Ionicons name={howOpen ? "chevron-up" : "chevron-down"} size={18} color="#B8B0A4" />
      </Pressable>
      {howOpen ? reading.how.lines.slice(0, -1).map((line) => <Text key={line} style={s.note}>{line}</Text>) : null}
      <Text style={s.note}>{disclaimer}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 14 },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  moonCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, borderRadius: 18, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)" },
  moonTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 26, lineHeight: 31 },
  meta: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19 },
  ingress: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, lineHeight: 19 },
  sourceChip: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: "rgba(201, 164, 92, 0.12)" },
  sourceText: { color: "#E9DFC9", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  notice: { padding: 14, borderRadius: radius.card, backgroundColor: "rgba(231, 183, 190, 0.1)", gap: 6 },
  headline: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 23, lineHeight: 29 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 21 },
  columns: { flexDirection: "row", gap: 14 },
  column: { flex: 1, minWidth: 0, gap: 6 },
  columnLabel: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  leanLabel: { color: "#9FD3CF" },
  easeLabel: { color: "#E7B7BE" },
  item: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  card: { padding: 16, borderRadius: 18, backgroundColor: "#1F1C1E", gap: 10 },
  cardTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 20, lineHeight: 26 },
  cardTitleSmall: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  tabs: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tab: { minHeight: layout.minimumTouchTarget, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", justifyContent: "center" },
  tabActive: { backgroundColor: colors.ivory, borderColor: colors.ivory },
  tabText: { color: "#E9E2D6", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  tabTextActive: { color: colors.charcoal },
  invite: { padding: 14, borderRadius: radius.card, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201, 164, 92, 0.5)", gap: 4 },
  links: { flexDirection: "row", flexWrap: "wrap", columnGap: 18 },
  linkButton: { minHeight: layout.minimumTouchTarget, justifyContent: "center" },
  link: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  week: { gap: 8, paddingRight: 8 },
  day: { width: 76, paddingVertical: 10, paddingHorizontal: 6, borderRadius: radius.card, backgroundColor: "#1F1C1E", alignItems: "center", gap: 6 },
  dayToday: { borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.6)" },
  dayName: { color: "#B8B0A4", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12 },
  daySign: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 12.5, textAlign: "center" },
  dayChange: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11.5 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  primary: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  howRow: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }
});
