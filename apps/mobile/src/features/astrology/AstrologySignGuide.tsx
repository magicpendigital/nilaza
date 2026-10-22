import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import signGuides from "../../../../../packages/content/data/astrology-zodiac-guides.json";
import chapterData from "../../../../../packages/content/data/astrology-mythology-chapters.json";
import { colors, radius, spacing, typography } from "../../theme";
import type { AstrologyLanguage, AstrologySignId } from "./contracts";
import { ReadingDetails } from "../../a2ui/ReadingDetails";

type Mode = "preview" | "chart" | "detail";

const local = (copy: { vi: string; en: string }, language: AstrologyLanguage) =>
  language === "vi" ? copy.vi : copy.en;

export function AstrologySignGuide({
  signId,
  language,
  mode = "preview",
  placementLabel,
  onReflection,
}: {
  signId: AstrologySignId;
  language: AstrologyLanguage;
  mode?: Mode;
  placementLabel?: string;
  onReflection?: (title: string, prompt: string) => void;
}) {
  const guide = signGuides.signs.find((item) => item.id === signId);
  if (!guide) return null;

  const vi = language === "vi";
  const element = signGuides.elements[
    guide.element as keyof typeof signGuides.elements
  ];
  const modality = signGuides.modalities[
    guide.modality as keyof typeof signGuides.modalities
  ];
  const signName = local(
    chapterData.chapters.find((chapter) => chapter.id === signId)?.name ?? {
      vi: guide.id,
      en: guide.id,
    },
    language,
  );
  const heading = vi ? "LĂNG KÍNH CUNG HOÀNG ĐẠO" : "ZODIAC SIGN LENS";

  return (
    <View
      accessibilityLabel={heading}
      style={[
        styles.container,
        mode === "detail" && styles.detailContainer,
        mode === "chart" && styles.chartContainer,
      ]}
      testID={`astrology-sign-guide-${signId}-${mode}`}
    >
      <Text style={[styles.eyebrow, mode === "chart" && styles.chartEyebrow]}>
        {heading}
      </Text>
      <View style={styles.metaRow}>
        <Text style={[styles.archetype, mode === "chart" && styles.chartArchetype]}>
          {local(guide.archetype, language)}
        </Text>
        <Text style={[styles.metaText, mode === "chart" && styles.chartMetaText]}>
          {local(element.name, language)} · {local(modality.name, language)}
        </Text>
      </View>
      {mode === "detail" ? (
        <Text style={styles.disclaimer}>{local(signGuides.intro, language)}</Text>
      ) : mode === "preview" ? (
        <Text style={styles.note}>
          {vi
            ? "Một lăng kính biểu tượng để khám phá và tự phản chiếu."
            : "A symbolic lens for exploration and reflection."}
        </Text>
      ) : null}
      <Text style={[styles.body, mode === "chart" && styles.chartBody]}>
        {local(guide.meaning, language)}
      </Text>

      {mode === "detail" ? (
        <>
          <Text style={styles.note}>
            {local(element.description, language)} {local(modality.description, language)}
          </Text>
          <Text style={styles.sectionTitle}>
            {vi ? "NGUỒN LỰC" : "A RESOURCE"}
          </Text>
          <Text style={styles.body}>{local(guide.resource, language)}</Text>
          <Text style={styles.sectionTitle}>
            {vi ? "ĐIỀU CÓ THỂ QUAN SÁT" : "SOMETHING TO NOTICE"}
          </Text>
          <Text style={styles.body}>{local(guide.invitation, language)}</Text>
          <View style={styles.reflection}>
            <Text style={styles.sectionTitle}>
              {vi ? "CÂU HỎI SUY NGẪM" : "REFLECTION QUESTION"}
            </Text>
            <Text style={styles.question}>{local(guide.question, language)}</Text>
            {onReflection ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  onReflection(signName, local(guide.question, language))
                }
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <Text style={styles.actionText}>
                  {vi ? "Viết suy ngẫm từ cung này" : "Reflect on this sign"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.sources}>
            <Text style={styles.note}>
              {vi
                ? "Nguồn tham khảo hệ phân loại; phần diễn giải do Nilaza biên soạn."
                : "References for the classification; interpretations written by Nilaza."}
            </Text>
            {signGuides.taxonomyReferences.map((reference) => (
              <Pressable
                accessibilityRole="link"
                key={reference.id}
                onPress={() => void Linking.openURL(reference.url).catch(() => {})}
                style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}
              >
                <Text style={styles.sourceLinkText}>
                  {local(reference.title, language)} ↗
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : mode === "chart" ? (
        <>
          <ReadingDetails key={`${signId}-${language}`} tone="light"
            label={vi ? "Đọc sâu về lăng kính cung này" : "Explore this sign lens"}
            collapseLabel={vi ? "Thu gọn lăng kính cung" : "Collapse the sign lens"}
            sections={[
              { id: "resource", title: vi ? "Nguồn lực" : "A resource", body: local(guide.resource, language) },
              { id: "invitation", title: vi ? "Điều có thể quan sát" : "Something to notice", body: local(guide.invitation, language) },
              { id: "question", title: vi ? "Câu hỏi phản chiếu" : "Reflection question", body: local(guide.question, language) },
            ]} />
          <Text style={[styles.note, styles.chartNote]}>
            {local(element.description, language)} {local(modality.description, language)}
          </Text>
          <Text style={[styles.note, styles.chartNote]}>
            {placementLabel
              ? `${placementLabel} ${vi ? "trong" : "in"} ${signName}. `
              : ""}
            {local(signGuides.placementNote, language)}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(14, 90, 90, 0.10)",
    borderColor: "rgba(201, 164, 92, 0.24)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  chartContainer: {
    // Chart Story places this card on an ivory sheet. The detail/library
    // palette intentionally stays dark, but reusing it here made the copy
    // nearly disappear into the light parchment surface.
    backgroundColor: "rgba(14, 90, 90, 0.08)",
    borderColor: "rgba(14, 90, 90, 0.28)",
  },
  detailContainer: {
    backgroundColor: "rgba(14, 90, 90, 0.14)",
    gap: spacing.md,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 11,
    letterSpacing: 1.1,
    lineHeight: 17,
  },
  chartEyebrow: {
    color: colors.teal,
  },
  metaRow: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  archetype: {
    color: colors.ivory,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 23,
    lineHeight: 29,
  },
  chartArchetype: {
    color: colors.ink,
  },
  metaText: {
    color: colors.moon,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  chartMetaText: {
    color: colors.teal,
  },
  body: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 24,
  },
  chartBody: {
    color: colors.ink,
  },
  note: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 21,
  },
  chartNote: {
    color: colors.ink,
  },
  sectionTitle: {
    color: colors.gold,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 11,
    letterSpacing: 1.1,
    lineHeight: 17,
  },
  reflection: {
    backgroundColor: "rgba(201, 164, 92, 0.08)",
    borderColor: "rgba(201, 164, 92, 0.22)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  question: {
    color: colors.ivory,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 21,
    lineHeight: 28,
  },
  action: {
    alignItems: "center",
    borderColor: colors.teal,
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: colors.ivory,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  pressed: { opacity: 0.72 },
  disclaimer: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 19,
  },
  sources: { gap: spacing.xs },
  sourceLink: {
    justifyContent: "center",
    minHeight: 44,
  },
  sourceLinkText: {
    color: colors.gold,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
});
