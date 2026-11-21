import type { ReactNode } from "react";
import { useState } from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ReadingDetails } from "../../a2ui/ReadingDetails";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";

export type ResultCard = {
  id: string;
  position: string;
  /** Original (English) card name, the title (Owner decision 2026-11-02). */
  name: string;
  /** Vietnamese name shown under the title; empty in English. */
  originalName: string;
  reversed: boolean;
  image: ImageSourcePropType;
  body: string;
  /** "reading": the AI paragraph tied to this card; "library": the general card meaning (analysis TA-08). */
  bodySource?: "reading" | "library";
  keywords: string[];
  onOpenImage: () => void;
  onLearn: () => void;
};

export type TarotResultViewProps = {
  language: Language;
  question: string;
  cards: ResultCard[];
  summary: string;
  sourceLabel: string;
  extraSections: Array<{ id: string; title: string; body: string }>;
  reflection: string;
  onWriteJournal?: (prompt: string) => void;
  children?: ReactNode;
};

// "Heading sentence. Rest of the summary" → a short title over the paragraph, as in the design.
export function splitSummary(summary: string): { title?: string; body: string } {
  const match = summary.trim().match(/^(.{12,140}?[.!?…])\s+([\s\S]{20,})$/);
  return match ? { title: match[1], body: match[2] } : { body: summary.trim() };
}

export function TarotResultView({ language, question, cards, summary, sourceLabel, extraSections, reflection, onWriteJournal, children }: TarotResultViewProps) {
  const vi = language === "vi";
  const [open, setOpen] = useState<string | null>(cards[0]?.id ?? null);
  const { title, body } = splitSummary(summary);
  const orientation = (reversed: boolean) => (reversed ? (vi ? "Ngược" : "Reversed") : vi ? "Xuôi" : "Upright");

  return (
    <View style={s.root}>
      {question.trim() ? <Text style={s.question}>“{question.trim()}”</Text> : null}

      <View style={s.cards}>
        {cards.map((card) => (
          <View key={card.id} style={s.cardCol}>
            <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${card.position}: ${card.name}${card.originalName && card.originalName !== card.name ? `, ${card.originalName}` : ""}, ${orientation(card.reversed)}. ${vi ? "Xem hình lá bài toàn màn hình" : "View full-screen card artwork"}`}
              onPress={card.onOpenImage} style={s.cardArt}>
              <Image source={card.image} style={[s.cardImage, card.reversed && s.reversed]} resizeMode="cover" />
            </Pressable>
            <Text style={s.position}>{card.position}</Text>
            <Text style={s.cardName}>{card.name}</Text>
            {card.originalName && card.originalName !== card.name ? <Text style={s.cardSubName}>{card.originalName}</Text> : null}
          </View>
        ))}
      </View>

      <View style={s.summary}>
        <Text style={s.kicker}>{vi ? "Tóm lại" : "In short"}</Text>
        {title ? <Text style={s.summaryTitle} accessibilityRole="header">{title}</Text> : null}
        <Text style={s.summaryBody}>{body}</Text>
        <Text style={s.source}>{sourceLabel}</Text>
      </View>
      {children}

      <View style={s.accordions}>
        {cards.map((card) => {
          const expanded = open === card.id;
          return (
            <View key={card.id} style={s.accordion}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpen(expanded ? null : card.id)} style={s.accordionHead}>
                <Image source={card.image} style={[s.thumb, card.reversed && s.reversed]} resizeMode="cover" />
                <View style={s.flex}>
                  <Text style={s.accordionKicker}>{card.position} · {orientation(card.reversed)}</Text>
                  <Text style={s.accordionTitle}>{card.name}</Text>
                  {card.originalName && card.originalName !== card.name ? <Text style={s.accordionSubtitle}>{card.originalName}</Text> : null}
                </View>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#B8B0A4" />
              </Pressable>
              {expanded ? (
                <View style={s.accordionBody}>
                  <Text style={s.bodyKicker}>
                    {card.bodySource === "library"
                      ? (vi ? "Ý nghĩa truyền thống của lá" : "Traditional meaning of the card")
                      : (vi ? `Vì sao lá này ở vị trí ${card.position}` : `Why this card sits in ${card.position}`)}
                  </Text>
                  <Text style={s.body}>{card.body}</Text>
                  {card.keywords.length ? (
                    <View style={s.keywords}>
                      {card.keywords.map((keyword) => <Text key={keyword} style={s.keyword}>{keyword}</Text>)}
                    </View>
                  ) : null}
                  <Pressable accessibilityRole="link" onPress={card.onLearn} style={s.learn}>
                    <Text style={s.learnText}>{vi ? "Học thêm về lá này →" : "Learn more about this card →"}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {extraSections.length ? (
        <ReadingDetails label={vi ? "Đọc thêm diễn giải" : "Read more of the interpretation"} collapseLabel={vi ? "Thu gọn" : "Collapse"} sections={extraSections} />
      ) : null}

      {reflection.trim() ? (
        <View style={s.reflection}>
          <Text style={[s.kicker, s.center]}>{vi ? "Câu hỏi để viết" : "A question to write about"}</Text>
          <Text style={s.reflectionText}>{reflection.trim()}</Text>
          {onWriteJournal ? (
            <Pressable accessibilityRole="button" onPress={() => onWriteJournal(reflection.trim())} style={s.write}>
              <Text style={s.learnText}>{vi ? "Viết vào Nhật ký" : "Write in Journal"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export type TarotResultDockProps = {
  language: Language;
  onSave: () => void;
  onAskFurther: () => void;
  onShare: () => void;
  onReport: () => void;
};

export function TarotResultDock({ language, onSave, onAskFurther, onShare, onReport }: TarotResultDockProps) {
  const vi = language === "vi";
  const [menu, setMenu] = useState(false);
  return (
    <View style={s.dock}>
      {menu ? (
        <View style={s.menu}>
          <Pressable accessibilityRole="button" onPress={() => { setMenu(false); onShare(); }} style={s.menuItem}>
            <Ionicons name="share-social-outline" size={18} color={colors.ivory} />
            <Text style={s.menuText}>{vi ? "Chia sẻ ảnh trải bài" : "Share reading image"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setMenu(false); onReport(); }} style={s.menuItem}>
            <Ionicons name="flag-outline" size={18} color={colors.ivory} />
            <Text style={s.menuText}>{vi ? "Báo cáo nội dung" : "Report content"}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={s.dockRow}>
        <Pressable accessibilityRole="button" onPress={onSave} style={[s.dockButton, s.dockPrimary]}>
          <Text style={s.dockPrimaryText}>{vi ? "Lưu trải bài" : "Save reading"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onAskFurther} style={[s.dockButton, s.dockSecondary]}>
          <Text style={s.dockSecondaryText}>{vi ? "Hỏi tiếp" : "Ask further"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: menu }} accessibilityLabel={vi ? "Thêm: chia sẻ ảnh, báo cáo nội dung" : "More: share image, report content"}
          onPress={() => setMenu((shown) => !shown)} style={s.dockMore}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.ivory} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingTop: 4, gap: 0 },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: "center" },
  question: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22, textAlign: "center", marginHorizontal: 8 },
  cards: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 20 },
  cardCol: { flex: 1, maxWidth: 120, alignItems: "center", gap: 6 },
  cardArt: { width: "100%", aspectRatio: 100 / 172, borderRadius: 10, overflow: "hidden", backgroundColor: colors.panel },
  cardImage: { width: "100%", height: "100%" },
  reversed: { transform: [{ rotate: "180deg" }] },
  position: { color: "#B8B0A4", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", textAlign: "center" },
  cardName: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 17, lineHeight: 19, textAlign: "center" },
  cardSubName: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 11.5, textAlign: "center" },
  summary: { marginTop: 22, padding: 20, borderRadius: 18, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)" },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  summaryTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 24, lineHeight: 29, marginTop: 10 },
  summaryBody: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 24, marginTop: 12 },
  source: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 17, marginTop: 12 },
  accordions: { gap: 10, marginTop: 14 },
  accordion: { borderRadius: 18, backgroundColor: "#1F1C1E", overflow: "hidden" },
  accordionHead: { minHeight: 60, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 30, height: 50, borderRadius: 4 },
  accordionKicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase" },
  accordionTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, marginTop: 2 },
  accordionSubtitle: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, marginTop: 1 },
  accordionBody: { paddingHorizontal: 18, paddingBottom: 18 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 24 },
  bodyKicker: { color: colors.gold, fontFamily: typography.bodyFontFamily, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  keywords: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  keyword: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "#2A2629", color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, overflow: "hidden" },
  learn: { minHeight: layout.minimumTouchTarget, justifyContent: "center", alignSelf: "flex-start" },
  learnText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  reflection: { marginTop: 22, alignItems: "center" },
  reflectionText: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontStyle: "italic", fontSize: 22, lineHeight: 30, textAlign: "center", marginTop: 10, marginHorizontal: 8 },
  write: { minHeight: layout.minimumTouchTarget, justifyContent: "center" },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, backgroundColor: colors.charcoal, borderTopWidth: 1, borderTopColor: "rgba(247, 241, 230, 0.08)" },
  dockRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  dockButton: { flex: 1, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  dockPrimary: { backgroundColor: colors.ivory },
  dockPrimaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  dockSecondary: { borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.6)" },
  dockSecondaryText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  dockMore: { width: 52, height: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", alignItems: "center", justifyContent: "center" },
  menu: { marginBottom: 10, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.1)" },
  menuItem: { minHeight: layout.minimumTouchTarget, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 14.5 }
});
