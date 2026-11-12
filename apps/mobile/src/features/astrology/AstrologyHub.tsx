import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { moonPhaseFor, moonPhaseLabel, nextMoonEvent } from "../home/moonPhase";
import { signList } from "./ChartOverviewParts";
import type { BigThree } from "./sky";
import type { Big3Story, MoonToday } from "./skyContent";

export type AstrologyHubProps = {
  language: Language;
  now: Date;
  dateLabel: string;
  myChart?: { big3: BigThree; story: Big3Story; onOpen: () => void; onAddBirthTime: () => void; onShare?: () => void; onInvite?: () => void };
  onCreateChart: () => void;
  today?: MoonToday | null;
  mythology: { completed: number; total: number; onOpen: () => void };
  compare: { count: number; onOpen: () => void };
  saved: { count: number; open: boolean; onToggle: () => void };
  disabled?: boolean;
};

export function AstrologyHub({ language, now, dateLabel, myChart, onCreateChart, today, mythology, compare, saved, disabled }: AstrologyHubProps) {
  const vi = language === "vi";
  const event = nextMoonEvent(now);
  const phase = moonPhaseLabel(moonPhaseFor(now).id, language);
  const moonLine = event.days === 0
    ? vi ? (event.kind === "full" ? "Trăng tròn hôm nay" : "Trăng non hôm nay") : event.kind === "full" ? "Full moon today" : "New moon today"
    : vi ? `${event.kind === "full" ? "Trăng tròn" : "Trăng non"} sau ${event.days} ngày` : `${event.kind === "full" ? "Full moon" : "New moon"} in ${event.days} ${event.days === 1 ? "day" : "days"}`;
  const rows = myChart
    ? [
        { glyph: "☉", label: vi ? "Mặt Trời" : "Sun", sign: signList(myChart.big3.sun, language) },
        { glyph: "☽", label: vi ? "Mặt Trăng" : "Moon", sign: signList(myChart.big3.moon, language) },
        ...(myChart.big3.rising ? [{ glyph: "↑", label: vi ? "Cung mọc" : "Rising", sign: signList([myChart.big3.rising], language) }] : [])
      ]
    : [];

  return (
    <View style={s.root}>
      <Text style={s.kicker}>{vi ? "Chiêm tinh" : "Astrology"}</Text>
      <Text style={s.title} accessibilityRole="header">{vi ? "Bầu trời của bạn" : "Your sky"}</Text>

      {myChart ? (
        <View style={s.bigThree}>
          {myChart.story.headline ? <Text style={s.headline} accessibilityRole="header">{myChart.story.headline}</Text> : null}
          <View accessible accessibilityLabel={rows.map((row) => `${row.label} ${row.sign}`).join(", ")} style={s.bigRows}>
            {rows.map((row) => (
              <View key={row.label} style={s.bigRow}>
                <Text style={s.glyph}>{row.glyph}</Text>
                <Text style={s.bigLabel}>{row.label}</Text>
                <Text style={s.bigSign}>{row.sign}</Text>
              </View>
            ))}
          </View>
          {myChart.story.lines.map((line) => <Text key={line} style={s.summary}>{line}</Text>)}
          <View style={s.links}>
            <Pressable accessibilityRole="button" onPress={myChart.onOpen} style={s.linkButton}>
              <Text style={s.link}>{vi ? "Xem lá số đầy đủ →" : "See full chart →"}</Text>
            </Pressable>
            {myChart.story.needsBirthTime ? (
              <Pressable accessibilityRole="button" onPress={myChart.onAddBirthTime} style={s.linkButton}>
                <Text style={s.link}>{vi ? "Bổ sung giờ sinh" : "Add birth time"}</Text>
              </Pressable>
            ) : null}
            {myChart.onShare ? (
              <Pressable accessibilityRole="button" onPress={myChart.onShare} style={s.linkButton}>
                <Text style={s.link}>{vi ? "Chia sẻ thẻ của bạn" : "Share your card"}</Text>
              </Pressable>
            ) : null}
            {myChart.onInvite ? (
              <Pressable accessibilityRole="button" onPress={myChart.onInvite} style={s.linkButton}>
                <Text style={s.link}>{vi ? "Mời bạn so bản đồ sao" : "Invite a friend to compare"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={s.bigThree}>
          <Text style={s.emptyTitle}>{vi ? "Bầu trời lúc bạn chào đời" : "The sky when you were born"}</Text>
          <Text style={s.body}>{vi ? "Ba thông tin là đủ: ngày, giờ (nếu biết) và nơi sinh. Lá số được tính ngay trên máy." : "Three details are enough: date, time (if known) and place. Your chart is calculated on this device."}</Text>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={onCreateChart} style={[s.primary, disabled && s.disabled]}>
            <Text style={s.primaryText}>{vi ? "Tạo lá số của bạn" : "Create your chart"}</Text>
          </Pressable>
        </View>
      )}

      {today ? (
        <View style={s.today}>
          <Text style={s.kicker}>{dateLabel}</Text>
          <Text style={s.todayTitle}>{today.title}</Text>
          <Text style={s.body}>{today.body}</Text>
          <View style={s.columns}>
            <View style={s.column}>
              <Text style={[s.columnLabel, s.doLabel]}>{today.labels.do}</Text>
              {today.doItems.map((item) => <Text key={item} style={s.item}>{item}</Text>)}
            </View>
            <View style={s.column}>
              <Text style={[s.columnLabel, s.avoidLabel]}>{today.labels.avoid}</Text>
              {today.avoidItems.map((item) => <Text key={item} style={s.item}>{item}</Text>)}
            </View>
          </View>
          <Text style={s.note}>{today.note}</Text>
        </View>
      ) : null}

      <View style={s.tiles}>
        <Pressable accessibilityRole="button" onPress={mythology.onOpen} style={s.tile}>
          <Ionicons name="book-outline" size={20} color={colors.gold} />
          <Text style={s.tileTitle}>{vi ? "12 cung & thần thoại" : "12 signs & myths"}</Text>
          <Text style={s.tileMeta}>{vi ? `${mythology.completed}/${mythology.total} chương đã đọc` : `${mythology.completed}/${mythology.total} chapters read`}</Text>
        </Pressable>
        <View style={s.tile} accessible accessibilityLabel={`${vi ? "Lịch trăng" : "Moon calendar"}: ${phase.name}. ${moonLine}`}>
          <Ionicons name="moon-outline" size={20} color={colors.gold} />
          <Text style={s.tileTitle}>{vi ? "Lịch trăng" : "Moon calendar"}</Text>
          <Text style={s.tileMeta}>{phase.name} · {moonLine}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={compare.onOpen} style={s.savedRow}>
        <Ionicons name="people-outline" size={20} color={colors.gold} />
        <View style={s.flex}>
          <Text style={s.tileTitle}>{vi ? "So với một người" : "Compare with someone"}</Text>
          <Text style={s.tileMeta}>{compare.count ? (vi ? `${compare.count} người đã lưu` : `${compare.count} saved`) : vi ? "Nhịp của hai người gặp nhau ra sao" : "How two rhythms meet"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#B8B0A4" />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: saved.open }} onPress={saved.onToggle} style={s.savedRow}>
        <Ionicons name="albums-outline" size={20} color={colors.gold} />
        <View style={s.flex}>
          <Text style={s.tileTitle}>{vi ? "Lá số đã lưu" : "Saved charts"}</Text>
          <Text style={s.tileMeta}>{saved.count ? (vi ? `${saved.count} lá số trên máy này` : `${saved.count} on this device`) : vi ? "Chưa có lá số nào" : "None yet"}</Text>
        </View>
        <Ionicons name={saved.open ? "chevron-up" : "chevron-down"} size={18} color="#B8B0A4" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 14 },
  flex: { flex: 1, minWidth: 0 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 36, marginTop: -6 },
  bigThree: { padding: 18, borderRadius: 18, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)", gap: 10 },
  headline: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 24, lineHeight: 29 },
  bigRows: { gap: 10 },
  bigRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  glyph: { width: 22, color: colors.gold, fontSize: 18, textAlign: "center" },
  bigLabel: { width: 92, color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 14 },
  bigSign: { flex: 1, color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21 },
  summary: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22, marginTop: 4 },
  links: { flexDirection: "row", flexWrap: "wrap", columnGap: 18 },
  linkButton: { minHeight: layout.minimumTouchTarget, justifyContent: "center" },
  link: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  emptyTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 21 },
  primary: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  disabled: { opacity: 0.5 },
  today: { padding: 18, borderRadius: 18, backgroundColor: "#1F1C1E", gap: 10 },
  todayTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21, lineHeight: 26 },
  columns: { flexDirection: "row", gap: 14 },
  column: { flex: 1, minWidth: 0, gap: 6 },
  columnLabel: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  doLabel: { color: "#9FD3CF" },
  avoidLabel: { color: "#E7B7BE" },
  item: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 17 },
  tiles: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, minWidth: 0, minHeight: 112, padding: 14, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 6 },
  tileTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  tileMeta: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  savedRow: { minHeight: layout.minimumTouchTarget + 16, paddingHorizontal: 14, borderRadius: radius.card, backgroundColor: "#1F1C1E", flexDirection: "row", alignItems: "center", gap: 12 }
});
