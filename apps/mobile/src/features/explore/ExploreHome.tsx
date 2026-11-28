import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { localizeAstrologySign } from "../astrology/contracts";
import { skyGlanceAt } from "../astrology/dailySky";
import { MoonGlyph } from "../home/MoonGlyph";
import { moonPhaseLabel } from "../home/moonPhase";

// Khám phá (design canvas Explore, 2026-10-31): Tarot, Astrology, decks by mood, guides, face reading soon.
export type ExploreDeckTile = { mood: string; deckName: string; image: ImageSourcePropType; onPress: () => void };
export type ExploreGuideRow = { key: string; title: string; detail: string; thumbnails: ImageSourcePropType[]; onPress: () => void };
// "Soi chiếu" group. Extension point: add a row here only when its screen is live (no "soon" tiles in this group).
export type ExploreReflectRow = { key: string; icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void };

export function ExploreHome({ language, deckCount, onTarot, onLibrary, onAstrology, onSky, onNumerology, onAllDecks, decks, guides, onAllGuides, onBookQuote, now }: {
  language: Language;
  deckCount: number;
  onTarot: () => void;
  onLibrary: () => void;
  onAstrology: () => void;
  /** Opens "Bầu trời hôm nay"; the block is hidden without it. */
  onSky?: () => void;
  now?: Date;
  onNumerology: () => void;
  onAllDecks: () => void;
  decks: ExploreDeckTile[];
  guides: ExploreGuideRow[];
  onAllGuides: () => void;
  /** Opens "Lời người xưa" (one line a day from the whole library); the "Soi chiếu" group is hidden when no row has a target. */
  onBookQuote?: () => void;
}) {
  const vi = language === "vi";
  const sky = onSky ? skyGlanceAt(now ?? new Date()) : null;
  const skySign = sky ? localizeAstrologySign(sky.sign, language) : "";
  const reflectRows: ExploreReflectRow[] = [
    ...(onBookQuote ? [{
      key: "book_quote",
      icon: "book-outline" as const,
      title: vi ? "Lời người xưa" : "Words of the ancients",
      // No book count: the library grows (Owner 28/11/2026).
      detail: vi ? "Mỗi ngày một câu từ kho sách xưa, kèm lời bình và một câu hỏi để lặng ngẫm." : "One line a day from the old books, with commentary and a question to sit with.",
      onPress: onBookQuote
    }] : [])
  ];
  const skyLine = sky ? `${moonPhaseLabel(sky.phase.id, language).name} · ${Math.round(sky.illumination * 100)}% ${vi ? "sáng" : "lit"}` : "";
  return (
    <View style={s.root}>
      <Text style={s.title} accessibilityRole="header">{vi ? "Khám phá" : "Explore"}</Text>

      <View style={s.tarot}>
        <Text style={s.kicker}>Tarot</Text>
        <Text style={s.cardTitle}>{vi ? "Hỏi một câu, rút vài lá" : "Ask a question, draw a few cards"}</Text>
        <Text style={s.cardBody}>{vi ? `78 lá · ${deckCount} bộ bài · có giải nghĩa theo câu hỏi của bạn` : `78 cards · ${deckCount} decks · meanings for your question`}</Text>
        <View style={s.actions}>
          <Pressable accessibilityRole="button" onPress={onTarot} style={s.primary}><Text style={s.primaryText}>{vi ? "Trải bài" : "Draw cards"}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onLibrary} style={s.secondary}><Text style={s.secondaryText}>{vi ? "Học 78 lá" : "Learn 78 cards"}</Text></Pressable>
        </View>
      </View>

      {sky && onSky ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${vi ? "Bầu trời hôm nay" : "Today's sky"}: ${vi ? "Trăng ở" : "Moon in"} ${skySign}. ${skyLine}`} onPress={onSky} style={s.astro}>
          <MoonGlyph phase={sky} size={44} />
          <View style={s.flex}>
            <Text style={s.kicker}>{vi ? "Bầu trời hôm nay" : "Today's sky"}</Text>
            <Text style={s.cardTitle}>{vi ? `Trăng ở ${skySign}` : `Moon in ${skySign}`}</Text>
            <Text style={s.cardBody}>{skyLine}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#B8B0A4" />
        </Pressable>
      ) : null}

      <Pressable accessibilityRole="button" onPress={onAstrology} style={s.astro}>
        <View style={s.flex}>
          <Text style={s.kicker}>{vi ? "Chiêm tinh" : "Astrology"}</Text>
          <Text style={s.cardTitle}>{vi ? "Bầu trời của bạn" : "Your sky"}</Text>
          <Text style={s.cardBody}>{vi ? "Big 3, 12 cung & thần thoại và so lá số với một người." : "Big 3, 12 signs & myths and comparing charts with someone."}</Text>
        </View>
        <Ionicons name="planet-outline" size={34} color={colors.gold} />
      </Pressable>

      <Pressable accessibilityRole="button" onPress={onNumerology} style={s.astro}>
        <View style={s.flex}>
          <Text style={s.kicker}>{vi ? "Bản đồ số" : "Number map"}</Text>
          <Text style={s.cardTitle}>{vi ? "Những con số của bạn" : "Your numbers"}</Text>
          <Text style={s.cardBody}>{vi ? "Số chủ đạo, ngày sinh và biểu đồ ngày sinh. Tính ngay trên máy." : "Life path, birthday and birth-date chart. Calculated on your device."}</Text>
        </View>
        <Ionicons name="keypad-outline" size={34} color={colors.gold} />
      </Pressable>

      {reflectRows.length ? (
        <View style={s.section}>
          <Text accessibilityRole="header" style={s.kicker}>{vi ? "Soi chiếu" : "Reflect"}</Text>
          {reflectRows.map((row) => (
            <Pressable key={row.key} accessibilityRole="button" accessibilityLabel={`${row.title}. ${row.detail}`} onPress={row.onPress} style={s.astro}>
              <View style={s.flex}>
                <Text style={s.cardTitle}>{row.title}</Text>
                <Text style={s.cardBody}>{row.detail}</Text>
              </View>
              <Ionicons name={row.icon} size={30} color={colors.gold} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.kicker}>{vi ? "Chọn bộ bài theo tâm trạng" : "Pick a deck by mood"}</Text>
          <Pressable accessibilityRole="button" onPress={onAllDecks} hitSlop={8}><Text style={s.link}>{vi ? `Xem ${deckCount} bộ` : `See ${deckCount} decks`}</Text></Pressable>
        </View>
        <View style={s.decks}>
          {decks.map((deck) => (
            <Pressable key={deck.deckName} accessibilityRole="button" accessibilityLabel={`${deck.mood}: ${deck.deckName}`} onPress={deck.onPress} style={s.deck}>
              <Image source={deck.image} style={s.deckImage} resizeMode="cover" />
              <Text style={s.deckMood}>{deck.mood}</Text>
              <Text numberOfLines={1} style={s.deckName}>{deck.deckName}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.kicker}>{vi ? "Trò chuyện với người dẫn" : "Talk with a guide"}</Text>
          <Pressable accessibilityRole="button" onPress={onAllGuides} hitSlop={8}><Text style={s.link}>{vi ? "Xem tất cả" : "See all"}</Text></Pressable>
        </View>
        {guides.map((guide) => (
          <Pressable key={guide.key} accessibilityRole="button" onPress={guide.onPress} style={s.row}>
            <View style={[s.stack, { width: 44 + (guide.thumbnails.length - 1) * 18 }]}>
              {guide.thumbnails.map((source, index) => <Image key={index} source={source} style={[s.avatar, { left: index * 18 }]} />)}
            </View>
            <View style={s.flex}>
              <Text numberOfLines={1} style={s.rowTitle}>{guide.title}</Text>
              <Text numberOfLines={1} style={s.rowDetail}>{guide.detail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8F877C" />
          </Pressable>
        ))}
      </View>

      <View style={[s.row, s.soon]} accessible accessibilityLabel={vi ? "Xem tướng mặt, sắp có" : "Face reading, coming soon"}>
        <Ionicons name="happy-outline" size={22} color="#8F877C" />
        <Text style={[s.rowTitle, s.flex, s.soonText]}>{vi ? "Xem tướng mặt" : "Face reading"}</Text>
        <Text style={s.badge}>{vi ? "Sắp có" : "Soon"}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 16, paddingTop: 8 },
  flex: { flex: 1, minWidth: 0 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 36, lineHeight: 40 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  tarot: { padding: 18, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)", gap: 8 },
  cardTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 24, lineHeight: 29 },
  cardBody: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  primary: { flex: 1, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  secondary: { flex: 1, minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.2)", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  astro: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: radius.card, backgroundColor: "#1F1C1E" },
  section: { gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  link: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13 },
  decks: { flexDirection: "row", gap: 10 },
  deck: { flex: 1, minWidth: 0, gap: 4 },
  deckImage: { width: "100%", height: 128, borderRadius: radius.card, backgroundColor: "#1F1C1E" },
  deckMood: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5, marginTop: 4 },
  deckName: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12 },
  row: { minHeight: layout.minimumTouchTarget + 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.card, backgroundColor: "#1F1C1E", flexDirection: "row", alignItems: "center", gap: 12 },
  stack: { height: 44 },
  avatar: { position: "absolute", top: 0, width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#1F1C1E" },
  rowTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  rowDetail: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, marginTop: 2 },
  soon: { backgroundColor: "transparent", borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(247, 241, 230, 0.16)" },
  soonText: { color: "#8F877C" },
  badge: { color: "#8F877C", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)" }
});
