import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Khám phá (design canvas Explore, 2026-10-31): Tarot, Astrology, decks by mood, guides, face reading soon.
export type ExploreDeckTile = { mood: string; deckName: string; image: ImageSourcePropType; onPress: () => void };
export type ExploreGuideRow = { key: string; title: string; detail: string; thumbnails: ImageSourcePropType[]; onPress: () => void };

export function ExploreHome({ language, deckCount, onTarot, onLibrary, onAstrology, onAllDecks, decks, guides, onAllGuides }: {
  language: Language;
  deckCount: number;
  onTarot: () => void;
  onLibrary: () => void;
  onAstrology: () => void;
  onAllDecks: () => void;
  decks: ExploreDeckTile[];
  guides: ExploreGuideRow[];
  onAllGuides: () => void;
}) {
  const vi = language === "vi";
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

      <Pressable accessibilityRole="button" onPress={onAstrology} style={s.astro}>
        <View style={s.flex}>
          <Text style={s.kicker}>{vi ? "Chiêm tinh" : "Astrology"}</Text>
          <Text style={s.cardTitle}>{vi ? "Bầu trời của bạn" : "Your sky"}</Text>
          <Text style={s.cardBody}>{vi ? "Big 3, Mặt Trăng hôm nay và so lá số với một người." : "Big 3, today's Moon and comparing charts with someone."}</Text>
        </View>
        <Ionicons name="planet-outline" size={34} color={colors.gold} />
      </Pressable>

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
