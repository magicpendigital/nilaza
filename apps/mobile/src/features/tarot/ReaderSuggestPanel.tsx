import { useEffect, useMemo, useRef, useState } from "react";
import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { readerTopicChip, suggestTarotReader, type ReaderCardInput, type ReaderGuideInput, type ReaderSuggestion } from "./readerSuggest";
import type { ReaderAiSuggestion, TarotNoteExperiment } from "./tarotNote";

// Batch C (Owner approved 23/11/2026, artboard ReaderSuggest): the reader is suggested from the question and the
// drawn cards, not from the deck. The user can always pick someone else; nothing here blocks the choice.

export type ReaderOption = {
  slug: string;
  name: string;
  role: string;
  image: ImageSourcePropType;
  accentColor?: string;
};

export type ReaderSuggestReading = {
  id: string;
  drawId?: string;
  topic: string;
  question: string;
  deckId: string;
  cards: ReaderCardInput[];
};

export type ReaderSuggestSource = "rules" | "ai";

// Per app session: which spreads already had their reader picked automatically, which ones the person changed by
// hand, and the AI answer per draw. Leaving for the chat and coming back must not reset a choice or call again.
const autoSelected = new Set<string>();
const userChose = new Set<string>();
const shownLogged = new Set<string>();
const aiAnswers = new Map<string, ReaderAiSuggestion | null>();

/** Test helper. */
export function resetReaderSuggestState() {
  autoSelected.clear();
  userChose.clear();
  shownLogged.clear();
  aiAnswers.clear();
}

/**
 * Rules first (instant, offline). Only when the rules are unsure, the person is signed in and the draw has a server
 * id, ask the optional AI tier once; its slug replaces the rule pick only if it arrives before the person taps.
 */
export function useReaderSuggestion({ reading, guides, language, aiEnabled, requestAi, onAutoSelect, onShown }: {
  reading: ReaderSuggestReading | null;
  guides: ReaderGuideInput[];
  language: Language;
  aiEnabled: boolean;
  requestAi?: (drawId: string, candidates: string[]) => Promise<ReaderAiSuggestion | null>;
  onAutoSelect: (slug: string) => void;
  onShown?: (event: { slug: string; topic: string | null; source: ReaderSuggestSource; experiment?: TarotNoteExperiment }) => void;
}): { suggestion: ReaderSuggestion | null; source: ReaderSuggestSource; experiment: TarotNoteExperiment; markUserChoice: () => void } {
  const readingId = reading?.id ?? "";
  const drawId = reading?.drawId;
  const guidesKey = guides.map((guide) => guide.slug).join("|");
  const [aiAnswer, setAiAnswer] = useState<ReaderAiSuggestion | null>(() => (drawId ? aiAnswers.get(drawId) ?? null : null));
  const readingRef = useRef(reading);
  readingRef.current = reading;
  const guidesRef = useRef(guides);
  guidesRef.current = guides;
  const callbacks = useRef({ onAutoSelect, onShown, requestAi });
  callbacks.current = { onAutoSelect, onShown, requestAi };

  const rules = useMemo(() => {
    const current = readingRef.current;
    if (!current || !guidesRef.current.length) return null;
    return suggestTarotReader({ ...current, guides: guidesRef.current, language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingId, guidesKey, language]);

  const suggestion = useMemo(() => {
    const current = readingRef.current;
    if (!rules || !current || !aiAnswer) return rules;
    return suggestTarotReader({ ...current, guides: guidesRef.current, language, forcePrimary: aiAnswer.slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, aiAnswer, language]);

  useEffect(() => {
    if (!readingId || !rules) return;
    let alive = true;
    setAiAnswer(drawId ? aiAnswers.get(drawId) ?? null : null);
    const firstVisit = !autoSelected.has(readingId);
    if (firstVisit) {
      autoSelected.add(readingId);
      callbacks.current.onAutoSelect(rules.primary);
    }
    const logShown = (slug: string, source: ReaderSuggestSource, experiment?: TarotNoteExperiment) => {
      if (shownLogged.has(readingId)) return;
      shownLogged.add(readingId);
      callbacks.current.onShown?.({ slug, topic: rules.matchedTopic, source, experiment });
    };
    const ask = callbacks.current.requestAi;
    const wantsAi = firstVisit && rules.lowConfidence && aiEnabled && Boolean(drawId) && Boolean(ask) && !(drawId && aiAnswers.has(drawId));
    if (!wantsAi || !drawId || !ask) {
      const cached = drawId ? aiAnswers.get(drawId) : null;
      logShown(cached?.slug ?? rules.primary, cached ? "ai" : "rules", cached?.experiment ?? undefined);
      return () => { alive = false; };
    }
    void ask(drawId, guidesRef.current.map((guide) => guide.slug)).catch(() => null).then((answer) => {
      aiAnswers.set(drawId, answer ?? null);
      const usable = answer && answer.slug !== rules.primary ? answer : null;
      if (usable && alive && !userChose.has(readingId)) {
        setAiAnswer(usable);
        callbacks.current.onAutoSelect(usable.slug);
        logShown(usable.slug, "ai", usable.experiment ?? undefined);
      } else {
        // The AI may have answered with the rule pick: its campaign tag still belongs to this event.
        logShown(rules.primary, "rules", answer?.experiment ?? undefined);
      }
    });
    return () => { alive = false; };
  }, [readingId, drawId, rules, aiEnabled]);

  return {
    suggestion,
    source: aiAnswer && suggestion?.primary === aiAnswer.slug ? "ai" : "rules",
    experiment: aiAnswer?.experiment ?? null,
    markUserChoice: () => { if (readingId) userChose.add(readingId); }
  };
}

export type ReaderSuggestPanelProps = {
  language: Language;
  suggestion: ReaderSuggestion;
  readers: ReaderOption[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  /** Start the follow-up chat with this reader; `opener` pre-fills the first message. */
  onAsk: (slug: string, opener?: string) => void;
};

export function ReaderSuggestPanel({ language, suggestion, readers, selectedSlug, onSelect, onAsk }: ReaderSuggestPanelProps) {
  const vi = language === "vi";
  const [showAll, setShowAll] = useState(false);
  const bySlug = (slug: string) => readers.find((reader) => reader.slug === slug);
  const primary = bySlug(suggestion.primary) ?? readers[0];
  const selected = bySlug(selectedSlug) ?? primary;
  if (!primary || !selected) return null;
  const isSuggested = selected.slug === primary.slug;
  const alternatives = [primary.slug, ...suggestion.alternatives.map((alt) => alt.slug)]
    .filter((slug) => slug !== selected.slug)
    .slice(0, 2)
    .map((slug) => ({ reader: bySlug(slug), reason: suggestion.alternatives.find((alt) => alt.slug === slug)?.reason }))
    .filter((item): item is { reader: ReaderOption; reason: string | undefined } => Boolean(item.reader));

  const chips = [suggestion.matchedTopic, suggestion.secondaryIntent]
    .filter((intent): intent is NonNullable<typeof intent> => Boolean(intent))
    .map((intent) => readerTopicChip(intent, language));

  return (
    <View style={s.panel}>
      {chips.length ? (
        <View style={s.chipRow}>
          <Text style={s.chipLead}>{vi ? "Nilaza hiểu bạn đang hỏi về" : "Nilaza reads your question as"}</Text>
          {chips.map((chip) => <Text key={chip} style={s.chip}>{chip}</Text>)}
          <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Không đúng? Xem tất cả người dẫn" : "Not right? See all guides"}
            onPress={() => setShowAll(true)} style={s.linkTarget} hitSlop={8}>
            <Text style={s.link}>{vi ? "Không đúng?" : "Not right?"}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.kicker} accessibilityRole="header">{isSuggested
          ? (vi ? "HỢP NHẤT VỚI CÂU HỎI NÀY" : "BEST FIT FOR THIS QUESTION")
          : (vi ? "NGƯỜI DẪN BẠN CHỌN" : "THE GUIDE YOU CHOSE")}</Text>
        <View style={s.who}>
          <View style={[s.avatar, { borderColor: selected.accentColor ?? colors.gold }]}>
            <Image source={selected.image} style={s.avatarImage} resizeMode="cover" accessibilityIgnoresInvertColors />
          </View>
          <View style={s.flex}>
            <Text style={s.name}>{selected.name}</Text>
            <Text style={s.role}>{selected.role}</Text>
          </View>
        </View>
        {isSuggested ? (
          <>
            <Text style={s.reason}>{suggestion.reason}</Text>
            {suggestion.matchLines.topic ? (
              <Text style={s.match}>{`✓ ${vi ? "Khớp chủ đề câu hỏi" : "Matches your question"}: ${suggestion.matchLines.topic}`}</Text>
            ) : null}
            {suggestion.matchLines.cards ? (
              <Text style={s.match}>{`✓ ${vi ? "Khớp lá bài" : "Matches the cards"}: ${suggestion.matchLines.cards}`}</Text>
            ) : null}
          </>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => onSelect(primary.slug)} style={s.linkTarget}>
            <Text style={s.link}>{vi ? `Quay về gợi ý: ${primary.name}` : `Back to the suggestion: ${primary.name}`}</Text>
          </Pressable>
        )}
        <View style={s.openers}>
          {suggestion.openers.map((opener) => (
            <Pressable key={opener} accessibilityRole="button" accessibilityHint={vi ? `Mở trò chuyện với ${selected.name} bằng câu này` : `Opens a chat with ${selected.name} with this question`}
              onPress={() => onAsk(selected.slug, opener)} style={s.opener}>
              <Text style={s.openerText}>{opener}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => onAsk(selected.slug)} style={s.primary}>
          <Text style={s.primaryText}>{vi ? `Hỏi tiếp với ${selected.name}` : `Ask ${selected.name}`}</Text>
        </Pressable>
      </View>

      {alternatives.length ? (
        <View style={s.alts}>
          <Text style={s.kicker} accessibilityRole="header">{vi ? "HOẶC NHÌN THEO GÓC KHÁC" : "OR TRY ANOTHER ANGLE"}</Text>
          {alternatives.map(({ reader, reason }) => (
            <Pressable key={reader.slug} accessibilityRole="button" accessibilityLabel={`${reader.name}. ${reason ?? reader.role}`}
              onPress={() => onSelect(reader.slug)} style={s.alt}>
              <Image source={reader.image} style={s.altImage} resizeMode="cover" accessibilityIgnoresInvertColors />
              <View style={s.flex}>
                <Text style={s.altName}>{reader.name}</Text>
                <Text style={s.altReason}>{reason ?? reader.role}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {showAll ? (
        <View style={s.all}>
          {readers.map((reader) => {
            const active = reader.slug === selected.slug;
            return (
              <Pressable key={reader.slug} accessibilityRole="button" accessibilityState={{ selected: active }}
                onPress={() => onSelect(reader.slug)} style={[s.allItem, active && s.allItemActive]}>
                <Image source={reader.image} style={s.allImage} resizeMode="cover" accessibilityIgnoresInvertColors />
                <Text style={[s.allName, active && s.allNameActive]}>{reader.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={s.linkTarget}>
          <Text style={s.link}>{vi ? "Xem tất cả người dẫn" : "See all guides"}</Text>
        </Pressable>
      )}

      <Text style={s.footnote}>{vi
        ? "Người dẫn là nhân vật AI với góc nhìn riêng. Trải bài vẫn là để tự soi chiếu, không phải kết luận cố định."
        : "Guides are AI characters with their own lens. The reading stays reflective, not a fixed conclusion."}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { marginTop: 18, gap: 12 },
  flex: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  chipLead: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  chip: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.5)", overflow: "hidden" },
  linkTarget: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, textDecorationLine: "underline" },
  card: { padding: 16, gap: 10, borderRadius: radius.card, backgroundColor: "#1F1B17", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.35)" },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 1.2 },
  who: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  name: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 21, lineHeight: 26 },
  role: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 19 },
  reason: { color: "#E3DCCF", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22 },
  match: { color: "#D8D0C4", fontFamily: typography.bodyMediumFontFamily, fontSize: 13.5, lineHeight: 19 },
  openers: { gap: 8 },
  opener: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.25)", justifyContent: "center" },
  openerText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 20 },
  primary: { minHeight: 48, borderRadius: 999, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: colors.ink, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  alts: { gap: 8 },
  alt: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.15)" },
  altImage: { width: 40, height: 40, borderRadius: 20 },
  altName: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  altReason: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 19 },
  all: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  allItem: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.2)" },
  allItemActive: { borderColor: colors.gold, backgroundColor: "rgba(201, 164, 92, 0.15)" },
  allImage: { width: 28, height: 28, borderRadius: 14 },
  allName: { color: "#D8D0C4", fontFamily: typography.bodyMediumFontFamily, fontSize: 14 },
  allNameActive: { color: colors.ivory },
  footnote: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 }
});
