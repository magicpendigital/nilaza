import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { EBGaramond_400Regular, EBGaramond_500Medium, EBGaramond_600SemiBold } from "@expo-google-fonts/eb-garamond";
import { HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold } from "@expo-google-fonts/hanken-grotesk";
import decksData from "../../../../../packages/content/data/tarot-decks.json";
import cardsData from "../../../../../packages/content/data/tarot-cards.json";
import { TarotFlow, buildTarotReadingResult, getCopy } from "../../../App";
import type { TarotCard, TarotDeck } from "../../types";
import { colors, typography } from "../../theme";

/** Actual Tarot UI, isolated synthetic state. No auth, storage, network or provider operations. */
export default function TarotDepthPreview() {
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [stage, setStage] = useState<React.ComponentProps<typeof TarotFlow>["stage"]>("cardMeaning");
  const [cardId, setCardId] = useState<string | null>("major-00-fool");
  const [deckId, setDeckId] = useState("moon-garden");
  const [topic, setTopic] = useState<React.ComponentProps<typeof TarotFlow>["tarotTopic"]>("self");
  const [spread, setSpread] = useState<React.ComponentProps<typeof TarotFlow>["tarotSpread"]>("daily-one");
  const [question, setQuestion] = useState("");
  const [keepDeck, setKeepDeck] = useState(true);
  const [guideId, setGuideId] = useState("nilaza-oracle");
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null);
  const [reading, setReading] = useState<ReturnType<typeof buildTarotReadingResult> | null>(null);
  const [fonts, fontError] = useFonts({ EBGaramond_400Regular, EBGaramond_500Medium, EBGaramond_600SemiBold,
    HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold });
  const deck = (decksData as TarotDeck[]).find(item => item.id === deckId)!;
  const result = () => {
    const chosen = ["major-00-fool", "minor-cups-two", "minor-pentacles-eight"].map((id, index) => ({
      ...(cardsData as TarotCard[]).find(item => item.id === id)!, reversed: false,
      spread: (language === "vi" ? ["Tình huống", "Thử thách", "Gợi mở"] : ["Situation", "Challenge", "Reflection"])[index],
    }));
    setSpread("situation-challenge-advice");
    const output = buildTarotReadingResult(deck, "self", "situation-challenge-advice", question, chosen, {
      summary: language === "vi" ? "Mẫu kiểm tra: bắt đầu nhỏ, trao đổi rõ và luyện từng bước. Đây là dữ liệu giả lập để kiểm giao diện, không phải phản hồi AI." : "Test fixture: begin small, communicate clearly and practice one step. Synthetic UI data, not an AI response.",
      reflection: language === "vi" ? "Một bước thử nào phù hợp hôm nay?" : "Which small experiment could fit today?",
      moderationStatus: "passed",
      sections: chosen.map((card, index) => ({ key: `position_${index}`, title: { en: `${card.spread} · ${card.name.en}` }, body: { en: language === "vi"
        ? `Phần kiểm tra ${index + 1}: ${card.uprightMeaning.vi} Liên hệ riêng của vị trí này cần được giữ khi lưu và mở lại.`
        : `Test section ${index + 1}: ${card.uprightMeaning.en} This position-specific section must survive saving and reopening.` } })),
    }, language);
    setReading(output); setStage("result");
  };
  if (!fonts && !fontError) return <Text>Loading fonts…</Text>;
  const control = (label: string, action: () => void) => <Pressable accessibilityRole="button" onPress={action}
    style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 10 }}><Text style={{ color: colors.gold, fontFamily: typography.bodyFontFamily }}>{label}</Text></Pressable>;
  return <View style={{ flex: 1, backgroundColor: colors.charcoal }}>
    <Text style={{ color: colors.ivory, padding: 8, fontFamily: typography.bodyFontFamily, fontSize: 12 }}>QA · SYNTHETIC DATA · NO ACCOUNT / AI CALL</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {control("VI / EN", () => setLanguage(value => value === "vi" ? "en" : "vi"))}
      {control(language === "vi" ? "Học lá" : "Study card", () => { setReading(null); setStage("cardMeaning"); })}
      {control(language === "vi" ? "Câu hỏi mẫu" : "Example questions", () => setStage("topic"))}
      {control(language === "vi" ? "Bài học" : "Lessons", () => setStage("learn"))}
      {control(language === "vi" ? "Kết quả 3 lá" : "3-card result", result)}
      {saved ? control(language === "vi" ? "Mở bản đã lưu" : "Reopen saved", () => {
        if (reading) setReading({ ...reading, cards: saved.cards as typeof reading.cards,
          sections: saved.sections as typeof reading.sections, summary: (saved.synthesis as typeof reading.synthesis).en });
        setStage("result");
      }) : null}
    </View>
    <TarotFlow c={getCopy(language)} language={language} reading={reading} selectedDeck={deck} displayedTier="free"
      selectedDeckId={deckId} setSelectedDeckId={setDeckId} setStage={setStage} stage={stage} tarotError="" tarotGenerating={false}
      tarotQuestion={question} keepSelectedDeck={keepDeck} intentionReviewed={false} onKeepSelectedDeckChange={setKeepDeck}
      tarotSpread={spread} tarotTopic={topic} generatedArtifacts={[]} selectedTarotCardId={cardId} selectedTarotGuideId={guideId}
      setSelectedTarotCardId={setCardId} setSelectedTarotGuideId={setGuideId} onBack={() => setStage("cardMeaning")}
      onStartOver={() => setStage("topic")} onAskFollowUp={() => {}} onChatWithCard={() => {}} onCreateShareArtifact={() => {}}
      onDraw={result} onQuestionChange={setQuestion} onReportReading={() => {}}
      onSave={entry => setSaved(JSON.parse(JSON.stringify(entry.sourceSnapshot)))} onSpreadChange={setSpread} onTopicChange={setTopic} />
  </View>;
}
