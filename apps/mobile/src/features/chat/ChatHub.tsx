import { useState } from "react";
import { Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Trò chuyện hub (ChatHub design, 2026-10-31): continue, Oracle, Council, then the guide grid.
export type HubCategory = "all" | "love" | "healing" | "sages" | "books";

export type HubGuide = {
  id: string;
  name: string;
  tagline: string;
  thumbnail: ImageSourcePropType;
  comingSoon: boolean;
  /** "book" cards carry a book badge and say "Sách" to screen readers, so books and characters are told apart without colour. */
  kind?: "book" | "guide";
  /** Tint over borrowed placeholder art so two guides sharing one image still look different (until their own art exists). */
  artTint?: string;
};

export type HubRecent = { title: string; snippet: string; updatedAt: string; thumbnail?: ImageSourcePropType; icon: "sparkles-outline" | "people-outline" | "chatbubble-ellipses-outline" };

// Guides shown before "Xem cả": the order of the design canvas.
export const hubFeaturedIds = [
  "archetype-the-love-oracle",
  "archetype-inner-child-healer",
  "archetype-the-mystic",
  "archetype-the-astrologer",
  "book-communication-mentor",
  "book-calm-living-mentor",
  "figure-aristotle",
  "figure-laozi"
];

export function relativeDayLabel(iso: string, now: Date, language: Language) {
  const vi = language === "vi";
  const then = new Date(iso);
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / 86400000);
  if (days <= 0) return vi ? "hôm nay" : "today";
  if (days === 1) return vi ? "hôm qua" : "yesterday";
  if (days < 7) return vi ? `${days} ngày trước` : `${days} days ago`;
  return then.toLocaleDateString(vi ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit" });
}

export function ChatHub({ language, now, recent, councilThumbnails, guides, matches, onOpenRecent, onOracle, onCouncil, onOpenGuide }: {
  language: Language;
  now: Date;
  recent?: HubRecent;
  councilThumbnails: ImageSourcePropType[];
  guides: HubGuide[];
  matches: (guideId: string, category: HubCategory, query: string) => boolean;
  onOpenRecent: () => void;
  onOracle: () => void;
  onCouncil: () => void;
  onOpenGuide: (guideId: string) => void;
}) {
  const vi = language === "vi";
  const [category, setCategory] = useState<HubCategory>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const filtered = guides.filter((guide) => matches(guide.id, category, query));
  const collapsed = !showAll && category === "all" && !query.trim();
  const visible = collapsed ? hubFeaturedIds.map((id) => filtered.find((guide) => guide.id === id)).filter((guide): guide is HubGuide => !!guide) : filtered;
  const categories: { id: HubCategory; label: string }[] = [
    { id: "all", label: vi ? "Tất cả" : "All" },
    { id: "love", label: vi ? "Tình cảm" : "Love" },
    { id: "healing", label: vi ? "Chữa lành" : "Healing" },
    { id: "sages", label: vi ? "Triết gia" : "Philosophers" },
    { id: "books", label: vi ? "Sách" : "Books" }
  ];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">{vi ? "Trò chuyện" : "Chat"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Tìm người dẫn hoặc chủ đề" : "Search guides or topics"}
          accessibilityState={{ expanded: searchOpen }} onPress={() => { setSearchOpen((open) => !open); setQuery(""); }} style={s.iconButton}>
          <Ionicons name={searchOpen ? "close" : "search"} size={20} color={colors.ivory} />
        </Pressable>
      </View>
      {searchOpen ? (
        <TextInput autoFocus value={query} onChangeText={setQuery} accessibilityLabel={vi ? "Tìm người dẫn hoặc chủ đề" : "Search guides or topics"}
          placeholder={vi ? "Tìm người dẫn hoặc chủ đề…" : "Search guides or topics…"} placeholderTextColor="#8F877C" style={s.search} />
      ) : null}

      {recent && !searchOpen ? (
        <View style={s.section}>
          <Text style={s.kicker}>{vi ? "Tiếp tục" : "Continue"}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${vi ? "Tiếp tục" : "Continue"} ${recent.title}`} onPress={onOpenRecent} style={s.recent}>
            {recent.thumbnail ? <Image source={recent.thumbnail} style={s.recentAvatar} /> : (
              <View style={[s.recentAvatar, s.recentIcon]}><Ionicons name={recent.icon} size={20} color={colors.gold} /></View>
            )}
            <View style={s.flex}>
              <View style={s.recentTop}>
                <Text numberOfLines={1} style={[s.recentTitle, s.flex]}>{recent.title}</Text>
                <Text style={s.meta}>{relativeDayLabel(recent.updatedAt, now, language)}</Text>
              </View>
              {recent.snippet ? <Text numberOfLines={1} style={s.recentSnippet}>“{recent.snippet}”</Text> : null}
            </View>
          </Pressable>
        </View>
      ) : null}

      {!searchOpen ? (
        <>
          <View style={s.oracle}>
            <View style={s.oracleTitleRow}>
              <Ionicons name="sparkles-outline" size={22} color="#8A6A2E" />
              <Text style={s.oracleTitle}>Nilaza Oracle</Text>
            </View>
            <Text style={s.oracleBody}>{vi ? "Kể điều đang xảy ra. Oracle gợi ý nên trải bài, hỏi một người dẫn hay viết vài dòng." : "Tell what is happening. Oracle suggests a spread, a guide to ask or a few lines to write."}</Text>
            <Pressable accessibilityRole="button" onPress={onOracle} style={s.oracleButton}>
              <Text style={s.oracleButtonText}>{vi ? "Bắt đầu kể" : "Start telling"}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={onCouncil} style={s.council}>
            <View style={s.avatarStack}>
              {councilThumbnails.slice(0, 3).map((source, index) => (
                <Image key={index} source={source} style={[s.stackAvatar, { left: index * 20 }]} />
              ))}
            </View>
            <View style={s.flex}>
              <Text style={s.councilTitle}>{vi ? "Hội đồng 3 góc nhìn" : "Three-view council"}</Text>
              <Text style={s.meta}>{vi ? "Ba người dẫn cùng soi một quyết định" : "Three guides look at one decision"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8F877C" />
          </Pressable>
        </>
      ) : null}

      <View style={s.section}>
        <Text style={s.kicker}>{vi ? "Người dẫn" : "Guides"}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips}>
          {categories.map((item) => {
            const active = item.id === category;
            return (
              <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} hitSlop={4} onPress={() => setCategory(item.id)} style={[s.chip, active && s.chipActive]}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={s.grid}>
          {visible.map((guide) => (
            <Pressable key={guide.id} accessibilityRole="button"
              accessibilityLabel={`${guide.kind === "book" ? (vi ? "Sách: " : "Book: ") : ""}${guide.name}. ${guide.tagline}${guide.comingSoon ? (vi ? ". Sắp ra mắt" : ". Coming soon") : ""}`}
              onPress={() => onOpenGuide(guide.id)} style={s.cell}>
              <View style={[s.avatarWrap, guide.comingSoon && s.dim]}>
                <Image source={guide.thumbnail} style={s.gridAvatar} />
                {guide.artTint ? <View testID={`hub-art-tint-${guide.id}`} style={[s.artTint, { backgroundColor: guide.artTint }]} /> : null}
                {guide.kind === "book" ? (
                  <View testID={`hub-book-badge-${guide.id}`} style={s.bookBadge}>
                    <Ionicons name="book-outline" size={13} color={colors.gold} />
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={2} style={s.gridName}>{guide.name}</Text>
              <Text numberOfLines={2} style={s.gridTagline}>{guide.comingSoon ? (vi ? "Sắp ra mắt" : "Coming soon") : guide.tagline}</Text>
            </Pressable>
          ))}
          {collapsed && guides.length > visible.length ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={[s.cell, s.moreCell]}>
              <Text style={s.moreTitle}>{vi ? `Xem cả ${guides.length}` : `See all ${guides.length}`}</Text>
              <Text style={s.meta}>{vi ? "người dẫn" : "guides"}</Text>
            </Pressable>
          ) : null}
        </View>
        {!visible.length ? (
          <Text style={s.meta}>
            {category === "books"
              ? (vi ? "Chưa có sách phù hợp. Thử từ khóa khác hoặc xem Tất cả." : "No book matches. Try another word or see All.")
              : (vi ? "Chưa có người dẫn phù hợp. Thử nhóm hoặc từ khóa khác." : "No guide matches. Try another group or word.")}
          </Text>
        ) : null}
        <Text style={s.note}>{vi ? "Người dẫn là AI lấy cảm hứng từ nhân vật, cuốn sách hoặc chủ đề, không phải người thật, tác giả hay đại diện chính thức." : "Guides are AI inspired by figures, books or themes, not real people, authors or official representatives."}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 14, paddingTop: 8 },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 36, lineHeight: 40 },
  iconButton: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.14)", alignItems: "center", justifyContent: "center" },
  search: { minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)", backgroundColor: "#1F1C1E", paddingHorizontal: 18, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15 },
  section: { gap: 10 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  meta: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 17 },
  recent: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.08)" },
  recentAvatar: { width: 48, height: 48, borderRadius: 24 },
  recentIcon: { backgroundColor: "rgba(201, 164, 92, 0.12)", alignItems: "center", justifyContent: "center" },
  recentTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  recentTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  recentSnippet: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, marginTop: 3 },
  oracle: { padding: 18, borderRadius: radius.card, backgroundColor: colors.ivory, gap: 8 },
  oracleTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  oracleTitle: { color: colors.charcoal, fontFamily: typography.headlineRegularFontFamily, fontSize: 23 },
  oracleBody: { color: "#3A3530", fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 21 },
  oracleButton: { marginTop: 6, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.charcoal, alignItems: "center", justifyContent: "center" },
  oracleButtonText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  council: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.35)" },
  avatarStack: { width: 84, height: 44 },
  stackAvatar: { position: "absolute", top: 0, width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#1F1C1E" },
  councilTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  chipScroll: { flexGrow: 0 },
  chips: { gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  chipTextActive: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 18, marginTop: 6 },
  cell: { width: "33.333%", alignItems: "center", gap: 6, paddingHorizontal: 5 },
  avatarWrap: { width: 76, height: 76 },
  gridAvatar: { width: 76, height: 76, borderRadius: 38 },
  artTint: { position: "absolute", top: 0, left: 0, width: 76, height: 76, borderRadius: 38, opacity: 0.38 },
  bookBadge: { position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.charcoal, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.6)", alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.55 },
  gridName: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5, lineHeight: 17, textAlign: "center" },
  gridTagline: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 16, textAlign: "center" },
  moreCell: { minHeight: 140, justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201, 164, 92, 0.5)", borderRadius: radius.card },
  moreTitle: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 18, marginTop: 8 }
});
