import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import promptData from "../../../../../packages/content/data/journal-prompts.json";
import { colors, layout, radius, typography } from "../../theme";
import type { JournalEntry, Language } from "../../types";

// Journal tab (Journal design, Owner decisions 2026-10-31): 7-day mood strip, today's question,
// source chips and entries grouped by day. Moods are only the ones the user picked.
type Text2 = { vi: string; en: string };
const pick = (text: Text2, language: Language) => (language === "vi" ? text.vi : text.en);

export type JournalFilter = "all" | "cards" | "notes" | "chat" | "astrology";

export const moodColors: Record<string, string> = {
  calm: "#7FB5A7",
  curious: "#C9828D",
  reflective: "#9C8CC9",
  hopeful: "#D9A066",
  stuck: "#8F877C"
};

const sourceStyle: Record<JournalEntry["sourceType"], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  daily: { icon: "sunny-outline", color: colors.gold },
  tarot: { icon: "albums-outline", color: "#E7B7BE" },
  manual: { icon: "create-outline", color: "#C8BDF0" },
  chat: { icon: "chatbubble-ellipses-outline", color: "#9FD3CF" },
  astrology: { icon: "planet-outline", color: colors.gold },
  share_card: { icon: "share-outline", color: "#B8B0A4" }
};

const localDayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export function promptForDay(now: Date, offset: number) {
  const day = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  const list = promptData.prompts;
  return list[(((day + offset) % list.length) + list.length) % list.length];
}

export function matchesJournalFilter(entry: JournalEntry, filter: JournalFilter) {
  if (filter === "all") return true;
  if (filter === "cards") return entry.sourceType === "tarot" || entry.sourceType === "daily";
  if (filter === "notes") return entry.sourceType === "manual" || Boolean(entry.userNote?.trim());
  return entry.sourceType === filter;
}

// The last seven local days, oldest first, with the newest mood the user picked that day.
export function sevenDayMoods(entries: JournalEntry[], now: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    const dayEntries = entries.filter((entry) => localDayKey(new Date(entry.createdAt)) === localDayKey(date) && entry.mood && moodColors[entry.mood]);
    const latest = dayEntries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return { date, mood: latest?.mood };
  });
}

export function JournalHome({ language, now, entries, moodLabel, sourceLabel, bodyOf, onWrite, onOpenEntry, empty }: {
  language: Language;
  now: Date;
  entries: JournalEntry[];
  moodLabel: (mood: string) => string;
  sourceLabel: (sourceType: JournalEntry["sourceType"]) => string;
  bodyOf: (entry: JournalEntry) => string;
  onWrite: (prompt?: string) => void;
  onOpenEntry: (entry: JournalEntry) => void;
  empty: ReactNode;
}) {
  const vi = language === "vi";
  const [filter, setFilter] = useState<JournalFilter>("all");
  const [promptOffset, setPromptOffset] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const prompt = pick(promptForDay(now, promptOffset), language);
  const days = sevenDayMoods(entries, now);
  const weekCounts = days.reduce<Record<string, number>>((acc, day) => (day.mood ? { ...acc, [day.mood]: (acc[day.mood] ?? 0) + 1 } : acc), {});
  const topMood = Object.entries(weekCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const weekdays = vi ? ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const folded = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
  const visible = entries
    .filter((entry) => matchesJournalFilter(entry, filter))
    .filter((entry) => !query.trim() || folded([entry.title, entry.summary, entry.userNote ?? ""].join(" ")).includes(folded(query.trim())))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups: { key: string; label: string; items: JournalEntry[] }[] = [];
  for (const entry of visible) {
    const date = new Date(entry.createdAt);
    const key = localDayKey(date);
    let group = groups.find((item) => item.key === key);
    if (!group) {
      const daysAgo = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
      const dayName = daysAgo === 0 ? (vi ? "Hôm nay" : "Today") : daysAgo === 1 ? (vi ? "Hôm qua" : "Yesterday") : weekdays[date.getDay()];
      group = { key, label: `${dayName} · ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`, items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  }
  const filters: { id: JournalFilter; label: string }[] = [
    { id: "all", label: vi ? "Tất cả" : "All" },
    { id: "cards", label: vi ? "Lá bài" : "Cards" },
    { id: "notes", label: vi ? "Ghi chú" : "Notes" },
    { id: "chat", label: vi ? "Trò chuyện" : "Chat" },
    { id: "astrology", label: vi ? "Chiêm tinh" : "Astrology" }
  ];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">{vi ? "Nhật ký" : "Journal"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Tìm trong Nhật ký" : "Search the journal"} accessibilityState={{ expanded: searchOpen }}
          onPress={() => { setSearchOpen((open) => !open); setQuery(""); }} style={s.iconButton}>
          <Ionicons name={searchOpen ? "close" : "search"} size={20} color={colors.ivory} />
        </Pressable>
      </View>
      <Text style={s.privacy}>{vi ? "Chỉ bạn thấy · lưu trên máy này" : "Only you can see this · saved on this device"}</Text>
      {searchOpen ? (
        <TextInput autoFocus value={query} onChangeText={setQuery} accessibilityLabel={vi ? "Tìm trong Nhật ký" : "Search the journal"}
          placeholder={vi ? "Tìm theo chữ trong mục đã lưu…" : "Search your saved entries…"} placeholderTextColor="#8F877C" style={s.search} />
      ) : (
        <>
          <View style={s.week}>
            <Text style={s.kicker}>{vi ? "7 ngày qua" : "Last 7 days"}</Text>
            <View style={s.days}>
              {days.map((day, index) => {
                const today = index === 6;
                return (
                  <View key={index} style={s.day} accessible accessibilityLabel={`${today ? (vi ? "Hôm nay" : "Today") : weekdays[day.date.getDay()]}: ${day.mood ? moodLabel(day.mood) : vi ? "chưa có cảm xúc" : "no feeling yet"}`}>
                    <View style={[s.dot, day.mood ? { backgroundColor: moodColors[day.mood] } : s.dotEmpty, today && s.dotToday]} />
                    <Text style={[s.dayLabel, today && s.dayToday]}>{today ? (vi ? "Hôm nay" : "Today") : weekdays[day.date.getDay()]}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.weekLine}>
              {topMood ? (
                <>
                  {vi ? "Tuần này bạn hay thấy " : "This week you often felt "}
                  <Text style={[s.weekMood, { color: moodColors[topMood] }]}>{moodLabel(topMood).toLocaleLowerCase(vi ? "vi" : "en")}</Text>
                  {". "}
                  {pick(promptData.weeklyByMood[topMood as keyof typeof promptData.weeklyByMood] ?? promptData.weeklyEmpty, language)}
                </>
              ) : pick(promptData.weeklyEmpty, language)}
            </Text>
          </View>
          <View style={s.question}>
            <Text style={s.kicker}>{vi ? "Câu hỏi hôm nay" : "Today's question"}</Text>
            <Text style={s.questionText}>{prompt}</Text>
            <View style={s.questionActions}>
              <Pressable accessibilityRole="button" onPress={() => onWrite(prompt)} style={s.primary}>
                <Text style={s.primaryText}>{vi ? "Viết vài dòng" : "Write a few lines"}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setPromptOffset((value) => value + 1)} style={s.secondary}>
                <Text style={s.secondaryText}>{vi ? "Câu khác" : "Another"}</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {filters.map((item) => {
          const active = item.id === filter;
          return (
            <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(item.id)} style={[s.chip, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {entries.length === 0 ? empty : groups.length === 0 ? (
        <Text style={s.privacy}>{query.trim() ? (vi ? "Không tìm thấy mục phù hợp. Thử từ khác." : "Nothing matches. Try another word.") : (vi ? "Chưa có mục nào trong nhóm này." : "Nothing in this group yet.")}</Text>
      ) : groups.map((group) => (
        <View key={group.key} style={s.group}>
          <Text style={s.groupLabel}>{group.label}</Text>
          {group.items.map((entry) => {
            const style = sourceStyle[entry.sourceType] ?? sourceStyle.manual;
            const time = new Date(entry.createdAt).toLocaleTimeString(vi ? "vi-VN" : "en-GB", { hour: "2-digit", minute: "2-digit" });
            const kicker = [sourceLabel(entry.sourceType), entry.mood ? moodLabel(entry.mood) : ""].filter(Boolean).join(" · ").toLocaleUpperCase(vi ? "vi" : "en");
            return (
              <Pressable key={entry.id} accessibilityRole="button" onPress={() => onOpenEntry(entry)} style={s.entry}>
                <View style={[s.entryIcon, { backgroundColor: `${style.color}26` }]}>
                  <Ionicons name={style.icon} size={18} color={style.color} />
                </View>
                <View style={s.flex}>
                  <View style={s.entryTop}>
                    <Text numberOfLines={1} style={[s.entryKicker, { color: style.color }]}>{kicker}</Text>
                    <Text style={s.time}>{time}</Text>
                  </View>
                  <Text numberOfLines={1} style={s.entryTitle}>{entry.title}</Text>
                  <Text numberOfLines={2} style={s.entryBody}>{bodyOf(entry)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 14, paddingTop: 8 },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 36, lineHeight: 40 },
  iconButton: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.14)", alignItems: "center", justifyContent: "center" },
  privacy: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 13, marginTop: -8 },
  search: { minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)", backgroundColor: "#1F1C1E", paddingHorizontal: 18, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  week: { padding: 14, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 12 },
  days: { flexDirection: "row" },
  day: { flex: 1, alignItems: "center", gap: 6 },
  dot: { width: 28, height: 28, borderRadius: 14 },
  dotEmpty: { borderWidth: 1, borderStyle: "dashed", borderColor: "#6E675F" },
  dotToday: { outlineWidth: 2, outlineStyle: "solid", outlineColor: colors.ivory, outlineOffset: 2 } as object,
  dayLabel: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 11.5 },
  dayToday: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily },
  weekLine: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 20 },
  weekMood: { fontFamily: typography.bodySemiBoldFontFamily },
  question: { padding: 18, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)", backgroundColor: "#1F1C1E", gap: 8 },
  questionText: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 29 },
  questionActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  primary: { flex: 1, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  secondary: { minHeight: 48, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.18)", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14 },
  chips: { gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  chipTextActive: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  group: { gap: 10 },
  groupLabel: { color: "#B8B0A4", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, marginTop: 6 },
  entry: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: "#1F1C1E" },
  entryIcon: { width: 40, height: 40, borderRadius: radius.card, alignItems: "center", justifyContent: "center" },
  entryTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  entryKicker: { flex: 1, minWidth: 0, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12 },
  time: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12 },
  entryTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15.5, marginTop: 4 },
  entryBody: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 19, marginTop: 3 }
});
