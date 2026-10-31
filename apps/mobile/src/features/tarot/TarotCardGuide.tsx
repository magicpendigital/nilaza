import type { ReactNode } from "react";
import { useState } from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import type { TarotCardGuide as Guide, TarotGuideTopic } from "./cardGuide";

type Neighbor = { name: string; onPress: () => void };

export type TarotCardGuideProps = {
  language: Language;
  name: string;
  originalName: string;
  arcanaLabel: string;
  image: ImageSourcePropType;
  uprightMeaning: string;
  reversedMeaning: string;
  // Orientation drawn in a reading; undefined when the card is opened from the library.
  drawnReversed?: boolean;
  guide: Guide | null;
  practice: string;
  onOpenImage: (reversed: boolean) => void;
  previous: Neighbor;
  next: Neighbor;
  // Deeper lessons, archetype and chat stay owned by the Tarot flow.
  children?: ReactNode;
};

const topicIcon: Record<TarotGuideTopic["id"], { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  love: { name: "heart-outline", color: "#E7B7BE" },
  career: { name: "briefcase-outline", color: "#E9D7AE" },
  self: { name: "radio-button-on-outline", color: "#9FD3CF" }
};

export function TarotCardGuide({ language, name, originalName, arcanaLabel, image, uprightMeaning, reversedMeaning, drawnReversed, guide, practice, onOpenImage, previous, next, children }: TarotCardGuideProps) {
  const vi = language === "vi";
  const [reversed, setReversed] = useState(Boolean(drawnReversed));
  const meaning = reversed ? reversedMeaning : uprightMeaning;
  const orientationTabs = [
    { id: false, label: vi ? "Xuôi" : "Upright" },
    { id: true, label: vi ? "Ngược" : "Reversed" }
  ];

  return (
    <View style={s.root}>
      <View style={s.hero}>
        <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${name}. ${vi ? "Xem hình lá bài toàn màn hình" : "View full-screen card artwork"}`} onPress={() => onOpenImage(reversed)} style={s.artWrap}>
          <Image source={image} style={[s.art, reversed && s.artReversed]} resizeMode="cover" />
        </Pressable>
        <View style={s.heroCopy}>
          <Text style={s.kicker}>{arcanaLabel}</Text>
          <Text style={s.name} accessibilityRole="header">{name}</Text>
          {originalName !== name ? <Text style={s.original}>{originalName}</Text> : null}
          {guide ? (
            <View style={s.facts}>
              <Text style={s.fact}>{vi ? "Nguyên tố" : "Element"}: {guide.element}</Text>
              <Text style={s.fact}>{vi ? "Chiêm tinh" : "Astrology"}: {guide.astrology}</Text>
              {guide.modernPlanet ? <Text style={s.fact}>{vi ? "Hiện đại" : "Modern"}: {guide.modernPlanet}</Text> : null}
            </View>
          ) : null}
          {drawnReversed !== undefined ? (
            <Text style={s.drawn}>{vi ? (drawnReversed ? "Trong trải bài: Ngược" : "Trong trải bài: Xuôi") : drawnReversed ? "In this reading: Reversed" : "In this reading: Upright"}</Text>
          ) : null}
        </View>
      </View>

      <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel={vi ? "Chiều lá" : "Card orientation"}>
        {orientationTabs.map((tab) => {
          const selected = tab.id === reversed;
          return (
            <Pressable key={tab.label} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setReversed(tab.id)} style={[s.tab, selected && s.tabSelected]}>
              <Text style={[s.tabText, selected && s.tabTextSelected]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.meaning}>{meaning}</Text>

      {guide && !reversed ? (
        <View style={s.stack}>
          {guide.topics.map((topic) => (
            <View key={topic.id} style={s.topicCard}>
              <View style={s.topicHead}>
                <Ionicons name={topicIcon[topic.id].name} size={16} color={topicIcon[topic.id].color} />
                <Text style={[s.topicLabel, { color: topicIcon[topic.id].color }]}>{topic.label}</Text>
              </View>
              <Text style={s.body}>{topic.body}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {guide && reversed ? (
        <Text style={s.hint}>{vi ? "Ý nghĩa theo từng chủ đề hiện có cho chiều xuôi. Chuyển sang Xuôi để xem." : "Topic meanings are written for the upright card. Switch to Upright to read them."}</Text>
      ) : null}

      {guide ? (
        <View style={s.misreading}>
          <Text style={s.boxTitle}>{vi ? "Hay bị hiểu nhầm" : "Often misread"}</Text>
          <Text style={s.muted}>{guide.misconception}</Text>
          {guide.otherReadings ? (
            <>
              <Text style={[s.boxTitle, s.boxTitleGap]}>{vi ? "Các cách hiểu khác" : "Other readings"}</Text>
              <Text style={s.muted}>{guide.otherReadings}</Text>
            </>
          ) : null}
        </View>
      ) : null}

      {guide?.supportNote ? (
        <View style={s.support} accessibilityRole="summary">
          <View style={s.topicHead}>
            <Ionicons name="hand-left-outline" size={16} color="#9FD3CF" />
            <Text style={[s.topicLabel, { color: "#9FD3CF" }]}>{vi ? "Khi cần thêm hỗ trợ" : "If you need more support"}</Text>
          </View>
          <Text style={s.body}>{guide.supportNote}</Text>
        </View>
      ) : null}

      <View style={s.practice}>
        <Text style={s.kicker}>{vi ? "Thực hành" : "Practice"}</Text>
        <Text style={s.practiceText}>{practice}</Text>
      </View>

      {children}

      {guide?.notes.length ? (
        <View style={s.notes}>
          <Text style={s.kicker}>{vi ? "Ghi chú chiêm tinh" : "Astrology notes"}</Text>
          {guide.notes.map((note) => <Text key={note} style={s.noteText}>{note}</Text>)}
        </View>
      ) : null}

      <View style={s.neighbors}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${vi ? "Lá trước" : "Previous card"}: ${previous.name}`} onPress={previous.onPress} style={s.neighbor}>
          <Ionicons name="chevron-back-outline" size={18} color="#E9E2D6" />
          <Text style={s.neighborText} numberOfLines={1}>{previous.name}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${vi ? "Lá sau" : "Next card"}: ${next.name}`} onPress={next.onPress} style={[s.neighbor, s.neighborNext]}>
          <Text style={s.neighborText} numberOfLines={1}>{next.name}</Text>
          <Ionicons name="chevron-forward-outline" size={18} color="#E9E2D6" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 18, paddingBottom: 8 },
  hero: { flexDirection: "row", alignItems: "flex-end", gap: 18 },
  artWrap: { borderRadius: 12, overflow: "hidden", width: 150, height: 258, backgroundColor: colors.panel, shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 14 } },
  art: { width: "100%", height: "100%" },
  artReversed: { transform: [{ rotate: "180deg" }] },
  heroCopy: { flex: 1, minWidth: 0, paddingBottom: 6 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  name: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 36, marginTop: 6 },
  original: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 14, marginTop: 4 },
  facts: { gap: 4, marginTop: 12 },
  fact: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 18 },
  drawn: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, marginTop: 10 },
  tabs: { flexDirection: "row", gap: 4, padding: 4, borderRadius: radius.pill, backgroundColor: "#1F1C1E" },
  tab: { flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  tabSelected: { backgroundColor: colors.ivory },
  tabText: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 14 },
  tabTextSelected: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  meaning: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 20, lineHeight: 27 },
  stack: { gap: 10 },
  topicCard: { padding: 16, borderRadius: radius.card, backgroundColor: "#1F1C1E" },
  topicHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  topicLabel: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22, marginTop: 8 },
  hint: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19 },
  misreading: { padding: 16, borderRadius: radius.card, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(247, 241, 230, 0.2)" },
  boxTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13 },
  boxTitleGap: { marginTop: 14 },
  muted: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21, marginTop: 6 },
  support: { padding: 16, borderRadius: radius.card, backgroundColor: "rgba(14, 90, 90, 0.35)", borderWidth: 1, borderColor: "rgba(127, 181, 167, 0.4)" },
  practice: { padding: 16, borderRadius: radius.card, backgroundColor: "rgba(201, 164, 92, 0.1)" },
  practiceText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22, marginTop: 6 },
  notes: { gap: 6 },
  noteText: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19 },
  neighbors: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: "rgba(247, 241, 230, 0.08)", paddingTop: 8 },
  neighbor: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, paddingHorizontal: 4, maxWidth: "48%" },
  neighborNext: { justifyContent: "flex-end" },
  neighborText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, flexShrink: 1 }
});
