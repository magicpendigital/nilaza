import { useState } from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { detectTarotTopic, suggestTarotQuestion, type AskTopic } from "./askHelpers";

export type AskSpreadOption = { id: string; cards: number; title: string; detail: string };

export type TarotAskStepProps = {
  language: Language;
  question: string;
  onQuestionChange: (question: string) => void;
  topic: string;
  topics: Array<{ id: AskTopic; label: string }>;
  onTopicChange: (topic: AskTopic) => void;
  examples: string[];
  spreads: AskSpreadOption[];
  spreadId: string;
  onSpreadChange: (spreadId: string) => void;
  deck: { name: string; detail: string; cover: ImageSourcePropType; comingSoon?: boolean };
  onChangeDeck: () => void;
};

const askTopics: AskTopic[] = ["love", "career", "self", "decision"];

export function TarotAskStep({ language, question, onQuestionChange, topic, topics, onTopicChange, examples, spreads, spreadId, onSpreadChange, deck, onChangeDeck }: TarotAskStepProps) {
  const vi = language === "vi";
  // Once the person picks a topic themselves, typing no longer overrides it.
  const [topicChosen, setTopicChosen] = useState(false);
  const [keptQuestion, setKeptQuestion] = useState<string | null>(null);
  const suggestionTopic: AskTopic = askTopics.includes(topic as AskTopic) ? (topic as AskTopic) : "self";
  const suggestion = keptQuestion === question ? null : suggestTarotQuestion(question, suggestionTopic, language);

  const changeQuestion = (text: string) => {
    onQuestionChange(text);
    if (topicChosen) return;
    const detected = detectTarotTopic(text);
    if (detected && detected !== topic) onTopicChange(detected);
  };

  return (
    <View style={s.root}>
      <Text style={s.title} accessibilityRole="header">{vi ? "Bạn muốn hỏi điều gì?" : "What would you like to ask?"}</Text>
      <Text style={s.label}>{vi ? "Viết theo cách bạn nghĩ, không cần chuẩn" : "Write it the way you think it, no need to be perfect"}</Text>
      <TextInput
        accessibilityLabel={vi ? "Câu hỏi của bạn" : "Your question"}
        value={question}
        onChangeText={changeQuestion}
        placeholder={vi ? "Ví dụ: Mình cần chú ý điều gì trong tuần này?" : "For example: What should I pay attention to this week?"}
        placeholderTextColor="#8F877C"
        multiline
        textAlignVertical="top"
        style={s.input}
      />

      {suggestion ? (
        <View style={s.suggestion}>
          <View style={s.row}>
            <Ionicons name="sparkles-outline" size={16} color="#E7B7BE" />
            <Text style={s.suggestionKicker}>{vi ? "Gợi ý cách hỏi để thấy rõ hơn" : "A way to ask that shows more"}</Text>
          </View>
          <Text style={s.suggestionText}>“{suggestion.question}”</Text>
          <View style={s.suggestionActions}>
            <Pressable accessibilityRole="button" onPress={() => changeQuestion(suggestion.question)} style={s.useButton}>
              <Text style={s.useText}>{vi ? "Dùng câu này" : "Use this"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setKeptQuestion(question)} style={s.keepButton}>
              <Text style={s.keepText}>{vi ? "Giữ câu của tôi" : "Keep mine"}</Text>
            </Pressable>
          </View>
          <Text style={s.note}>{suggestion.note}</Text>
        </View>
      ) : !question.trim() && examples.length ? (
        <View style={s.examples}>
          {examples.map((example) => (
            <Pressable key={example} accessibilityRole="button" onPress={() => changeQuestion(example)} style={s.example}>
              <Text style={s.exampleText}>{example}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.kicker}>{vi ? "Chủ đề" : "Topic"}</Text>
          <Text style={s.sectionHint}>{vi ? "Nilaza tự nhận ra, bạn có thể đổi" : "Nilaza picks it up; you can change it"}</Text>
        </View>
        <View style={s.chips}>
          {topics.map((item) => {
            const selected = item.id === topic;
            return (
              <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected }} hitSlop={4}
                onPress={() => { setTopicChosen(true); onTopicChange(item.id); }}
                style={[s.chip, selected && s.chipSelected]}>
                <Text style={[s.chipText, selected && s.chipTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.kicker}>{vi ? "Cách trải" : "Spread"}</Text>
        <View style={s.spreads}>
          {spreads.map((spread) => {
            const selected = spread.id === spreadId;
            return (
              <Pressable key={spread.id} accessibilityRole="button" accessibilityState={{ selected }}
                accessibilityLabel={`${spread.title}. ${spread.detail}`}
                onPress={() => onSpreadChange(spread.id)} style={[s.spread, selected && s.spreadSelected]}>
                <View style={s.glyph} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  {Array.from({ length: spread.cards }, (_, index) => (
                    <View key={index} style={[spread.cards === 1 ? s.glyphCardLarge : s.glyphCard, selected && s.glyphCardSelected]} />
                  ))}
                </View>
                <Text style={s.spreadTitle}>{spread.title}</Text>
                <Text style={[s.spreadDetail, selected && s.spreadDetailSelected]}>{spread.detail}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.kicker}>{vi ? "Bộ bài" : "Deck"}</Text>
        <View style={s.deck}>
          <Image source={deck.cover} style={s.deckCover} resizeMode="cover" />
          <View style={s.deckCopy}>
            <Text style={s.deckName}>{deck.name}</Text>
            <Text style={s.deckDetail} numberOfLines={2}>{deck.comingSoon ? (vi ? "Sắp ra mắt" : "Coming soon") : deck.detail}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={vi ? `Đổi bộ bài, đang chọn ${deck.name}` : `Change deck, ${deck.name} selected`} onPress={onChangeDeck} style={s.deckChange}>
            <Text style={s.deckChangeText}>{vi ? "Đổi" : "Change"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingTop: 8 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 36 },
  label: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, marginTop: 16 },
  input: { marginTop: 8, minHeight: 96, borderRadius: 16, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.5)", backgroundColor: "#1F1C1E", color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24, paddingHorizontal: 16, paddingVertical: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  suggestion: { marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: "rgba(201, 130, 141, 0.12)", borderWidth: 1, borderColor: "rgba(201, 130, 141, 0.35)" },
  suggestionKicker: { color: "#E7B7BE", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12.5 },
  suggestionText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22, marginTop: 8 },
  suggestionActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  useButton: { minHeight: layout.minimumTouchTarget, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: "#E7B7BE", justifyContent: "center" },
  useText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  keepButton: { minHeight: layout.minimumTouchTarget, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.2)", justifyContent: "center" },
  keepText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  note: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 18, marginTop: 10 },
  examples: { marginTop: 12, gap: 8 },
  example: { minHeight: layout.minimumTouchTarget, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.14)", justifyContent: "center" },
  exampleText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  section: { marginTop: 22 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  sectionHint: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", justifyContent: "center" },
  chipSelected: { backgroundColor: colors.rose, borderColor: colors.rose },
  chipText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  chipTextSelected: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  spreads: { flexDirection: "row", gap: 10, marginTop: 10 },
  spread: { flex: 1, minWidth: 0, minHeight: 132, borderRadius: 16, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.14)", backgroundColor: "#1F1C1E", paddingHorizontal: 8, paddingVertical: 12, alignItems: "center", gap: 8 },
  spreadSelected: { borderWidth: 1.5, borderColor: colors.rose, backgroundColor: "rgba(201, 130, 141, 0.14)" },
  glyph: { height: 46, flexDirection: "row", alignItems: "center", gap: 4 },
  glyphCard: { width: 16, height: 28, borderRadius: 3, borderWidth: 1.5, borderColor: "#8F877C" },
  glyphCardLarge: { width: 24, height: 40, borderRadius: 4, borderWidth: 1.5, borderColor: "#8F877C" },
  glyphCardSelected: { backgroundColor: "#E7B7BE", borderColor: "#E7B7BE" },
  spreadTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, textAlign: "center" },
  spreadDetail: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 11.5, lineHeight: 15, textAlign: "center" },
  spreadDetailSelected: { color: "#E9E2D6" },
  deck: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: 16, backgroundColor: "#1F1C1E" },
  deckCover: { width: 56, height: 72, borderRadius: radius.card },
  deckCopy: { flex: 1, minWidth: 0 },
  deckName: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 19 },
  deckDetail: { color: "#E7B7BE", fontFamily: typography.bodyFontFamily, fontSize: 12.5, marginTop: 2 },
  deckChange: { minHeight: layout.minimumTouchTarget, minWidth: layout.minimumTouchTarget, paddingHorizontal: 12, justifyContent: "center", alignItems: "center" },
  deckChangeText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 }
});
