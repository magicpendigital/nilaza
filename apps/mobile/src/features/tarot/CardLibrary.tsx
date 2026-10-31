import { useState } from "react";
import { Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { TarotArtworkButton } from "./TarotArtworkButton";

// Thư viện 78 lá (design canvas CardLibrary): deck name, learned progress, group chips and a grid.
// A card counts as learned once its guide has been opened on this device.
export type LibraryGroup = "all" | "major" | "cups" | "wands" | "swords" | "pentacles";

export type LibraryCard = {
  id: string;
  group: Exclude<LibraryGroup, "all">;
  name: string;
  sub: string;
  image: ImageSourcePropType;
  learned: boolean;
};

const groupLines: Record<Exclude<LibraryGroup, "all">, { vi: string; en: string }> = {
  major: { vi: "22 chặng của một hành trình lớn, từ bước đầu tò mò đến khi khép một vòng.", en: "22 stages of a larger journey, from curious first steps to closing a circle." },
  cups: { vi: "Cảm xúc, sự quan tâm, nhu cầu được lắng nghe và những ranh giới mềm.", en: "Feeling, care, being heard and softer boundaries." },
  wands: { vi: "Động lực, cảm hứng, sáng tạo và cách bạn bắt đầu một điều mới.", en: "Drive, inspiration, creativity and how you begin." },
  swords: { vi: "Suy nghĩ, lời nói, giằng co bên trong và cách gọi tên vấn đề.", en: "Thoughts, words, inner conflict and naming the issue." },
  pentacles: { vi: "Công việc, tiền bạc, thói quen, sức bền và đời sống thực tế.", en: "Work, money, habits, endurance and everyday life." }
};

export function CardLibrary({ language, deckName, cards, onOpen, onPreview }: {
  language: Language;
  deckName: string;
  cards: LibraryCard[];
  onOpen: (cardId: string) => void;
  onPreview: (cardId: string) => void;
}) {
  const vi = language === "vi";
  const [group, setGroup] = useState<LibraryGroup>("all");
  const learned = cards.filter((card) => card.learned).length;
  const chips: { id: LibraryGroup; label: string }[] = [
    { id: "all", label: vi ? "Tất cả" : "All" },
    { id: "major", label: vi ? `Ẩn chính · ${cards.filter((card) => card.group === "major").length}` : `Major · ${cards.filter((card) => card.group === "major").length}` },
    { id: "cups", label: vi ? "Cốc" : "Cups" },
    { id: "wands", label: vi ? "Gậy" : "Wands" },
    { id: "swords", label: vi ? "Kiếm" : "Swords" },
    { id: "pentacles", label: vi ? "Tiền" : "Pentacles" }
  ];
  const visible = group === "all" ? cards : cards.filter((card) => card.group === group);
  return (
    <View style={s.root}>
      <Text style={s.kicker}>{vi ? `Bộ ${deckName}` : `${deckName} deck`}</Text>
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">{vi ? "78 lá Tarot" : "78 Tarot cards"}</Text>
        <Text style={s.progress}>{vi ? `Đã học ${learned}/${cards.length}` : `Learned ${learned}/${cards.length}`}</Text>
      </View>
      <View style={s.bar} accessible accessibilityLabel={vi ? `Đã học ${learned} trên ${cards.length} lá` : `${learned} of ${cards.length} cards learned`}>
        <View style={[s.barFill, { width: `${cards.length ? (learned / cards.length) * 100 : 0}%` }]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips}>
        {chips.map((chip) => {
          const active = chip.id === group;
          return (
            <Pressable key={chip.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setGroup(chip.id)} style={[s.chip, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {group !== "all" ? <Text style={s.groupLine}>{vi ? groupLines[group].vi : groupLines[group].en}</Text> : null}
      <View style={s.grid}>
        {visible.map((card) => (
          <TarotArtworkButton
            key={card.id}
            label={`${card.name}. ${card.sub}${card.learned ? (vi ? ". Đã học" : ". Learned") : ""}`}
            hint={vi ? "Chạm giữ để xem tranh toàn màn hình" : "Touch and hold for full-screen artwork"}
            previewLabel={vi ? "Xem tranh toàn màn hình" : "View full-screen artwork"}
            style={s.cell}
            onPress={() => onOpen(card.id)}
            onPreview={() => onPreview(card.id)}
          >
            <Image source={card.image} style={s.image} resizeMode="contain" />
            <Text numberOfLines={2} style={s.name}>{card.name}</Text>
            <Text numberOfLines={1} style={s.sub}>{card.sub}</Text>
            {card.learned ? <View style={s.learnedDot} /> : null}
          </TarotArtworkButton>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 36 },
  progress: { color: "#B8B0A4", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, paddingBottom: 4 },
  bar: { height: 4, borderRadius: 2, backgroundColor: "rgba(247, 241, 230, 0.1)", overflow: "hidden" },
  barFill: { height: 4, backgroundColor: colors.gold },
  chipScroll: { flexGrow: 0 },
  chips: { gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  chipTextActive: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  groupLine: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 16, marginHorizontal: -5 },
  cell: { width: "33.333%", paddingHorizontal: 5, gap: 6 },
  image: { width: "100%", aspectRatio: 0.58, borderRadius: 6 },
  name: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, lineHeight: 17 },
  sub: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 11.5 },
  learnedDot: { position: "absolute", top: 6, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.charcoal }
});
