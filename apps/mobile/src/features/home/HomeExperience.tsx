import type { ReactNode } from "react";
import { useState } from "react";
import { Image, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Brand } from "../../a2ui/Brand";
import { brandCopy, notificationLabel } from "../../brand/copy";
import { getFeatureVisual } from "../../visualAssets";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { moonLitPath, moonPhaseFor, moonPhaseLabel, type MoonPhase } from "./moonPhase";

export type HomeTarotTopic = "love" | "career" | "self";
export type HomeZodiac = { hasBirthDate: boolean; sign: string; line: string };

const goalCopy: Record<string, { topic: HomeTarotTopic; vi: [string, string, string]; en: [string, string, string]; askVi: string[]; askEn: string[] }> = {
  love: {
    topic: "love",
    vi: ["Tình yêu", "Trải bài tình yêu", "Một câu hỏi về mối quan hệ"],
    en: ["Love", "Love reading", "One question about a relationship"],
    askVi: ["Người ấy có nghĩ về mình?", "Có nên nhắn lại không?", "Mình cần gì trong một mối quan hệ?"],
    askEn: ["Are they thinking of me?", "Should I text back?", "What do I need in a relationship?"]
  },
  career: {
    topic: "career",
    vi: ["Sự nghiệp", "Trải bài sự nghiệp", "Một câu hỏi về công việc"],
    en: ["Career", "Career reading", "One question about work"],
    askVi: ["Có nên đổi việc không?", "Vì sao mình mất động lực?", "Bước tiếp theo của mình là gì?"],
    askEn: ["Should I change jobs?", "Why have I lost motivation?", "What is my next step?"]
  }
};
const defaultGoalCopy = {
  topic: "self" as const,
  vi: ["Bản thân", "Trải bài về bản thân", "Lắng nghe điều đang ở trong lòng"] as [string, string, string],
  en: ["Self", "A reading about you", "Listen to what is on your mind"] as [string, string, string],
  askVi: ["Vì sao mình thấy mệt?", "Hôm nay mình nên chú ý điều gì?", "Điều gì đang làm mình bận lòng?"],
  askEn: ["Why do I feel tired?", "What should I notice today?", "What is weighing on me?"]
};

export function homeGoalSuggestion(goal: string | undefined, language: Language) {
  const copy = (goal && goalCopy[goal]) || defaultGoalCopy;
  const [label, title, detail] = language === "vi" ? copy.vi : copy.en;
  return { topic: copy.topic, label, title, detail, asks: language === "vi" ? copy.askVi : copy.askEn };
}

function MoonGlyph({ phase, size = 36 }: { phase: MoonPhase; size?: number }) {
  const c = size / 2, r = size / 2 - 2;
  const lit = moonLitPath(phase, c, r);
  return <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} fill={colors.surfaceHigh} stroke={colors.border} strokeWidth={1} />
      {lit ? <Path d={lit} fill="#E9DFC9" /> : null}
    </Svg>
  </View>;
}

export function HomeExperience({ language, greeting, now, revealed, streak, onReveal, onAsk, onAstrology, onGoalSuggestion, primaryGoal, zodiac, onJournal, onOpenRecent, onNotifications, unread, reflection, reflectionActions, preRevealHint, cardBack, recent, continuation }: {
  language: Language; greeting: string; now: Date; revealed: boolean; streak: number; onReveal: () => void;
  onAsk: (text: string) => void; onAstrology: () => void; onGoalSuggestion: (topic: HomeTarotTopic) => void; primaryGoal?: string; zodiac: HomeZodiac;
  onJournal: () => void; onOpenRecent?: (id: string) => void; onNotifications: () => void; unread: number;
  reflection: ReactNode; reflectionActions?: ReactNode; preRevealHint?: string; cardBack: ImageSourcePropType;
  recent: Array<{ id: string; title: string; date: string }>; continuation?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [cardOpened, setCardOpened] = useState(false);
  const [askText, setAskText] = useState("");
  const copy = brandCopy(language);
  const drawLabel = { vi: "Chạm để mở lá bài hôm nay", en: "Tap to reveal today's card", "zh-Hans": "轻触揭开今日卡牌", ja: "タップして今日のカードをめくる", ko: "탭하여 오늘의 카드 공개" }[language];
  const phase = moonPhaseFor(now);
  const moon = moonPhaseLabel(phase.id, language);
  const dateLabel = now.toLocaleDateString(language === "vi" ? "vi-VN" : language, { weekday: "long", day: "numeric", month: "numeric" });
  const goal = homeGoalSuggestion(primaryGoal, language);
  const filledDots = Math.max(0, Math.min(7, streak));
  const streakLabel = copy.streakDays.replace("{n}", String(streak));
  const openCard = () => { setCardOpened(revealed); setOpen(true); };
  const ask = (text: string) => { onAsk(text.trim()); setAskText(""); };

  return <View style={s.root}>
    <View style={s.header}>
      <Brand variant="horizontal" width={180} />
      <Pressable accessibilityRole="button" accessibilityLabel={notificationLabel(language, unread)} onPress={onNotifications} style={s.iconButton}>
        <Ionicons name="notifications-outline" size={24} color={colors.ivory} />
        {unread > 0 ? <Text style={s.count}>{unread}</Text> : null}
      </Pressable>
    </View>
    <Text style={s.kicker}>{`${dateLabel} · ${moon.name}`}</Text>
    <Text accessibilityRole="header" style={s.greeting}>{greeting}</Text>
    <Text style={s.subtitle}>{copy.today}</Text>

    <Pressable accessibilityRole="button" accessibilityLabel={revealed ? copy.revisitToday : copy.revealToday} onPress={openCard} style={s.hero}>
      <Image source={getFeatureVisual("open-reflection-home")} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.heroScrim]} />
      <View style={s.heroRow}>
        <Image source={cardBack} resizeMode="cover" style={s.heroCard} accessible={false} />
        <View style={s.heroCopy}>
          <Text style={s.kicker}>{copy.todayCard}</Text>
          <Text style={s.heroTitle}>{copy.todayCardTitle}</Text>
          <Text style={s.heroHint}>{revealed ? copy.todayCardRevealedHint : copy.todayCardHint}</Text>
          <View style={s.heroButton}><Text style={s.primaryText}>{revealed ? copy.revisitToday : copy.revealToday}</Text></View>
        </View>
      </View>
    </Pressable>
    {filledDots > 0 ? <View style={s.streakRow} accessible accessibilityLabel={streakLabel}>
      {Array.from({ length: 7 }, (_, index) => <View key={index} style={[s.dot, index < filledDots && s.dotFilled]} />)}
      <Text style={s.streakText}>{streakLabel}</Text>
    </View> : null}

    <View style={s.tileRow}>
      <View style={s.tile} accessible accessibilityLabel={`${copy.skyToday}: ${moon.name}. ${moon.hint}`}>
        <MoonGlyph phase={phase} />
        <Text style={s.tileKicker}>{copy.skyToday}</Text>
        <Text style={s.tileTitle}>{moon.name}</Text>
        <Text style={s.tileBody}>{moon.hint}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onAstrology} style={s.tile}>
        <Ionicons name="planet-outline" size={32} color={colors.gold} accessible={false} />
        <Text style={s.tileKicker}>{zodiac.hasBirthDate ? copy.signToday.replace("{sign}", zodiac.sign) : copy.yourSky}</Text>
        <Text style={s.tileBody} numberOfLines={4}>{zodiac.hasBirthDate ? zodiac.line : copy.addBirthDate}</Text>
        <Text style={s.link}>{copy.openSky}</Text>
      </Pressable>
    </View>

    <Text style={[s.kicker, s.sectionGap]}>{copy.askLabel}</Text>
    <View style={s.askRow}>
      <TextInput value={askText} onChangeText={setAskText} placeholder={copy.askPlaceholder} placeholderTextColor="#6B645C" accessibilityLabel={copy.askLabel}
        returnKeyType="send" onSubmitEditing={() => ask(askText)} style={s.askInput} />
      <Pressable accessibilityRole="button" accessibilityLabel={copy.askSend} onPress={() => ask(askText)} style={s.askSend}>
        <Ionicons name="arrow-forward" size={20} color={colors.ivory} />
      </Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
      {goal.asks.map(text => <Pressable key={text} accessibilityRole="button" onPress={() => ask(text)} style={s.chip}><Text style={s.chipText}>{text}</Text></Pressable>)}
    </ScrollView>

    <Text style={[s.kicker, s.sectionGap]}>{`${copy.forYou} · ${goal.label}`}</Text>
    <View style={s.tileRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${goal.title}. ${goal.detail}`} onPress={() => onGoalSuggestion(goal.topic)} style={[s.tile, s.mediaTile]}>
        <Image source={getFeatureVisual("tarot")} style={s.tileImage} resizeMode="cover" accessible={false} />
        <View style={s.mediaCopy}><Text style={s.tileTitle}>{goal.title}</Text><Text style={s.tileBody}>{goal.detail}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onAstrology} style={[s.tile, s.mediaTile]}>
        <Image source={getFeatureVisual("astrology")} style={s.tileImage} resizeMode="cover" accessible={false} />
        <View style={s.mediaCopy}><Text style={s.tileTitle}>{copy.yourSky}</Text><Text style={s.tileBody}>{zodiac.hasBirthDate ? zodiac.sign : copy.addBirthDate}</Text></View>
      </Pressable>
    </View>

    {continuation}
    <View style={s.sectionHeader}>
      <Text accessibilityRole="header" style={s.section}>{copy.recent}</Text>
      <Pressable accessibilityRole="button" onPress={onJournal} style={s.linkButton}><Text style={s.link}>{copy.journal}</Text></Pressable>
    </View>
    {recent.length ? recent.map(entry => <Pressable key={entry.id} accessibilityRole="button" onPress={() => onOpenRecent ? onOpenRecent(entry.id) : onJournal()} style={s.recent}>
      <View style={{ flex: 1 }}><Text style={s.recentTitle}>{entry.title}</Text><Text style={s.meta}>{entry.date}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.moon} />
    </Pressable>) : <Text style={s.empty}>{copy.empty}</Text>}

    <Modal visible={open} animationType="none" onRequestClose={() => setOpen(false)} presentationStyle="fullScreen">
      <SafeAreaView style={s.modal}>
        <View style={s.modalHeader}><Text accessibilityRole="header" style={s.modalTitle}>{copy.todayCard}</Text><Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={() => setOpen(false)} style={s.iconButton}><Ionicons name="close" size={28} color={colors.ivory} /></Pressable></View>
        <ScrollView contentContainerStyle={s.modalContent}>
          {cardOpened ? reflection : <View style={{ alignItems: "center", gap: 20 }}>
            <Text style={s.subtitle}>{copy.breath}</Text>
            {preRevealHint ? <Text style={[s.tileBody, { textAlign: "center" }]}>{preRevealHint}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={drawLabel} onPress={() => { onReveal(); setCardOpened(true); }} style={{ alignItems: "center", gap: 20, width: "100%" }}>
              <Image source={cardBack} resizeMode="contain" style={{ width: 180, height: 300 }} accessible={false} />
              <View style={[s.primary, { alignSelf: "stretch" }]}><Text style={s.primaryText}>{drawLabel}</Text></View>
            </Pressable>
          </View>}
        </ScrollView>
        {cardOpened && reflectionActions ? <View style={s.modalFooter}>{reflectionActions}</View>
          : <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={[s.secondary, { margin: 20 }]}><Text style={s.secondaryText}>{copy.close}</Text></Pressable>}
      </SafeAreaView>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  root: { width: "100%", maxWidth: 760, alignSelf: "center", paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3 },
  count: { color: colors.gold, fontFamily: typography.bodyFontFamily, fontSize: 12 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
  greeting: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 36, includeFontPadding: false, lineHeight: 46, marginTop: 8 },
  subtitle: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24, marginTop: 4, marginBottom: 18 },
  hero: { borderRadius: radius.card, overflow: "hidden", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.38)" },
  heroScrim: { backgroundColor: "rgba(21, 20, 22, 0.66)" },
  heroRow: { flexDirection: "row", gap: 16, padding: 16, alignItems: "center" },
  heroCard: { width: 92, height: 156, borderRadius: 6 },
  heroCopy: { flex: 1, gap: 6 },
  heroTitle: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 24, lineHeight: 30 },
  heroHint: { color: "#D9D2C7", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  heroButton: { marginTop: 6, minHeight: 48, borderRadius: radius.control, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  streakText: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 13, marginLeft: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.outline },
  dotFilled: { backgroundColor: colors.gold, borderColor: colors.gold },
  tileRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  tile: { flex: 1, minHeight: 48, borderRadius: radius.card, backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  tileKicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
  tileTitle: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 19, lineHeight: 24 },
  tileBody: { color: "#C9C2B7", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  mediaTile: { padding: 0, overflow: "hidden" },
  tileImage: { width: "100%", height: 92 },
  mediaCopy: { padding: 12, gap: 4 },
  link: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, lineHeight: 20 },
  linkButton: { minHeight: 48, justifyContent: "center", paddingLeft: 12 },
  sectionGap: { marginTop: 26 },
  askRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, minHeight: 56, borderRadius: radius.control, backgroundColor: colors.ivory, paddingLeft: 16, paddingRight: 4 },
  askInput: { flex: 1, minHeight: 48, color: colors.charcoal, fontFamily: typography.bodyFontFamily, fontSize: 16 },
  askSend: { width: 48, height: 48, borderRadius: radius.control, backgroundColor: colors.charcoal, alignItems: "center", justifyContent: "center" },
  chipRow: { gap: 8, paddingTop: 10 },
  chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.onSurface, fontFamily: typography.bodyFontFamily, fontSize: 14 },
  primary: { minHeight: 56, backgroundColor: colors.ivory, borderRadius: radius.control, padding: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15, lineHeight: 22, textAlign: "center" },
  secondary: { minHeight: 52, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.control, padding: 12, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24, textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26 },
  section: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 25 },
  recent: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 64, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  recentTitle: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 23 },
  meta: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 13, marginTop: 4 },
  empty: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 },
  modal: { flex: 1, backgroundColor: colors.charcoal },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8, maxWidth: 760, width: "100%", alignSelf: "center" },
  modalTitle: { flex: 1, color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 30 },
  modalContent: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 24, gap: 16, paddingBottom: 40 },
  modalFooter: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border }
});
