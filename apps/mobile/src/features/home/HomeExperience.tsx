import type { ReactNode } from "react";
import { useState } from "react";
import { Image, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Brand } from "../../a2ui/Brand";
import { brandCopy, notificationLabel } from "../../brand/copy";
import { getFeatureVisual, type FeatureVisualId } from "../../visualAssets";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { moonLitPath, moonPhaseFor, moonPhaseLabel, type MoonPhase } from "./moonPhase";

export type HomeTarotTopic = "love" | "career" | "self";
export type HomeZodiac = { hasBirthDate: boolean; sign: string; signId?: string; line: string };
export type HomeLatest = { id: string; title: string; meta: string; thumbs: ImageSourcePropType[] };

type TopicCopy = {
  topic: HomeTarotTopic;
  vi: [string, string, string]; en: [string, string, string];
  askVi: string[]; askEn: string[];
  // Ask card: title, detail, Oracle prefill. Replaces the compatibility card (Owner decision 2026-10-30).
  personVi: [string, string, string]; personEn: [string, string, string];
  journalVi: string; journalEn: string;
};

const topicCopy: Record<HomeTarotTopic, TopicCopy> = {
  love: {
    topic: "love",
    vi: ["Tình yêu", "Trải bài tình yêu", "Một câu hỏi về mối quan hệ"],
    en: ["Love", "Love reading", "One question about a relationship"],
    askVi: ["Người ấy có nghĩ về mình?", "Có nên nhắn lại không?", "Mình cần gì trong một mối quan hệ?"],
    askEn: ["Are they thinking of me?", "Should I text back?", "What do I need in a relationship?"],
    personVi: ["Hỏi về một người", "Kể Nilaza nghe về người ấy", "Mình đang nghĩ về một người và muốn hiểu rõ cảm xúc của mình."],
    personEn: ["Ask about someone", "Tell Nilaza about them", "I keep thinking about someone and want to understand how I feel."],
    journalVi: "Viết về một mối quan hệ", journalEn: "Write about a relationship"
  },
  career: {
    topic: "career",
    vi: ["Sự nghiệp", "Trải bài sự nghiệp", "Một câu hỏi về công việc"],
    en: ["Career", "Career reading", "One question about work"],
    askVi: ["Có nên đổi việc không?", "Vì sao mình mất động lực?", "Bước tiếp theo của mình là gì?"],
    askEn: ["Should I change jobs?", "Why have I lost motivation?", "What is my next step?"],
    personVi: ["Hỏi về công việc", "Một quyết định đang làm bạn phân vân", "Mình đang phân vân về công việc và muốn nhìn rõ hơn."],
    personEn: ["Ask about work", "A decision you keep turning over", "I'm unsure about my work and want to see it more clearly."],
    journalVi: "Viết về một ngày làm việc", journalEn: "Write about a work day"
  },
  self: {
    topic: "self",
    vi: ["Bản thân", "Trải bài về bản thân", "Lắng nghe điều đang ở trong lòng"],
    en: ["Self", "A reading about you", "Listen to what is on your mind"],
    askVi: ["Vì sao mình thấy mệt?", "Hôm nay mình nên chú ý điều gì?", "Điều gì đang làm mình bận lòng?"],
    askEn: ["Why do I feel tired?", "What should I notice today?", "What is weighing on me?"],
    personVi: ["Nói điều trong lòng", "Nilaza lắng nghe, không phán xét", "Mình muốn nói về điều đang làm mình bận lòng."],
    personEn: ["Say what's on your mind", "Nilaza listens without judging", "I want to talk about something that's been on my mind."],
    journalVi: "Viết cho chính mình", journalEn: "Write to yourself"
  }
};
const topicOrder: HomeTarotTopic[] = ["love", "career", "self"];

function topicForGoal(goal: string | undefined): HomeTarotTopic {
  return goal === "love" || goal === "career" ? goal : "self";
}

export function homeGoalSuggestion(goal: string | undefined, language: Language) {
  return homeTopicSuggestion(topicForGoal(goal), language);
}

export function homeTopicSuggestion(topic: HomeTarotTopic, language: Language) {
  const copy = topicCopy[topic];
  const vi = language === "vi";
  const [label, title, detail] = vi ? copy.vi : copy.en;
  const [personTitle, personDetail, personPrefill] = vi ? copy.personVi : copy.personEn;
  return {
    topic, label, title, detail, asks: vi ? copy.askVi : copy.askEn,
    person: { title: personTitle, detail: personDetail, prefill: personPrefill },
    journalPrompt: vi ? copy.journalVi : copy.journalEn
  };
}

export function homeSubtitle(now: Date, language: Language) {
  const copy = brandCopy(language);
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return copy.subtitleMorning;
  if (hour >= 11 && hour < 18) return copy.subtitleDay;
  return copy.subtitleEvening;
}

function MoonGlyph({ phase, size = 34 }: { phase: MoonPhase; size?: number }) {
  const c = size / 2, r = size / 2 - 2;
  const lit = moonLitPath(phase, c, r);
  return <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} fill={colors.surfaceHigh} stroke={colors.border} strokeWidth={1} />
      {lit ? <Path d={lit} fill="#E9DFC9" /> : null}
    </Svg>
  </View>;
}

function signVisual(signId?: string): ImageSourcePropType {
  return (signId && getFeatureVisual(`astrology-${signId}-v2` as FeatureVisualId)) || getFeatureVisual("astrology-sanctuary");
}

export function HomeExperience({ language, greeting, now, revealed, streak, onReveal, onAsk, onAstrology, onGoalSuggestion, onWritePrompt, primaryGoal, zodiac, onJournal, onOpenRecent, onNotifications, unread, reflection, reflectionActions, preRevealHint, cardBack, deckCover, latest, continuation, nextStep }: {
  language: Language; greeting: string; now: Date; revealed: boolean; streak: number; onReveal: () => void;
  onAsk: (text: string) => void; onAstrology: () => void; onGoalSuggestion: (topic: HomeTarotTopic) => void; onWritePrompt: (prompt: string) => void;
  primaryGoal?: string; zodiac: HomeZodiac;
  onJournal: () => void; onOpenRecent?: (id: string) => void; onNotifications: () => void; unread: number;
  reflection: ReactNode; reflectionActions?: ReactNode; preRevealHint?: string; cardBack: ImageSourcePropType; deckCover?: ImageSourcePropType;
  latest?: HomeLatest; continuation?: ReactNode;
  /** The one suggested next step after today's card is revealed (analysis HO-05). */
  nextStep?: { title: string; body: string; cta: string; onPress: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [cardOpened, setCardOpened] = useState(false);
  const [askText, setAskText] = useState("");
  const [topic, setTopic] = useState<HomeTarotTopic>(() => topicForGoal(primaryGoal));
  const copy = brandCopy(language);
  const drawLabel = { vi: "Chạm để mở lá bài hôm nay", en: "Tap to reveal today's card", "zh-Hans": "轻触揭开今日卡牌", ja: "タップして今日のカードをめくる", ko: "탭하여 오늘의 카드 공개" }[language];
  const phase = moonPhaseFor(now);
  const moon = moonPhaseLabel(phase.id, language);
  const dateLabel = now.toLocaleDateString(language === "vi" ? "vi-VN" : language, { weekday: "long", day: "numeric", month: "numeric" });
  const goal = homeTopicSuggestion(topic, language);
  const filledDots = Math.max(0, Math.min(7, streak));
  const streakLabel = copy.streakDays.replace("{n}", String(streak));
  const openCard = () => { setCardOpened(revealed); setOpen(true); };
  const ask = (text: string) => { onAsk(text.trim()); setAskText(""); };
  const nextTopic = () => setTopic(current => topicOrder[(topicOrder.indexOf(current) + 1) % topicOrder.length]);

  return <View style={s.root}>
    <View style={s.header}>
      <Brand variant="horizontal" width={150} />
      <Pressable accessibilityRole="button" accessibilityLabel={notificationLabel(language, unread)} onPress={onNotifications} style={s.bell}>
        <Ionicons name="notifications-outline" size={20} color={colors.ivory} />
        {unread > 0 ? <View style={s.badge}><Text style={s.badgeText}>{unread > 9 ? "9+" : unread}</Text></View> : null}
      </Pressable>
    </View>
    <Text style={s.kicker}>{`${dateLabel} · ${moon.name}`}</Text>
    <Text accessibilityRole="header" style={s.greeting}>{greeting}</Text>
    <Text style={s.subtitle}>{homeSubtitle(now, language)}</Text>

    <Pressable accessibilityRole="button" accessibilityLabel={revealed ? copy.revisitToday : copy.revealToday} onPress={openCard} style={s.hero}>
      <View style={s.fan} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={s.fanBack} />
        <Image source={cardBack} resizeMode="cover" style={s.fanFront} accessible={false} />
      </View>
      <View style={s.heroCopy}>
        <Text style={s.kicker}>{copy.todayCard}</Text>
        <Text style={s.heroTitle}>{copy.todayCardTitle}</Text>
        <Text style={s.heroHint}>{revealed ? copy.todayCardRevealedHint : copy.todayCardHint}</Text>
        <View style={s.heroButton}><Text style={s.primaryText}>{revealed ? copy.revisitToday : copy.revealToday}</Text></View>
        {filledDots > 0 ? <View style={s.streakRow} accessible accessibilityLabel={streakLabel}>
          {Array.from({ length: 7 }, (_, index) => <View key={index} style={[s.dot, index < filledDots && s.dotFilled]} />)}
          <Text style={s.streakText}>{streakLabel}</Text>
        </View> : null}
      </View>
    </Pressable>

    {nextStep ? <Pressable accessibilityRole="button" accessibilityLabel={`${nextStep.title}. ${nextStep.body}`} onPress={nextStep.onPress} style={s.nextStep}>
      <View style={s.flexOne}>
        <Text style={s.kicker}>{language === "vi" ? "Bước tiếp theo" : "Next step"}</Text>
        <Text style={s.nextStepTitle}>{nextStep.title}</Text>
        <Text style={s.tileBody}>{nextStep.body}</Text>
      </View>
      <Text style={s.link}>{`${nextStep.cta} →`}</Text>
    </Pressable> : null}

    <View style={s.tileRow}>
      <View style={s.tile} accessible accessibilityLabel={`${copy.skyToday}: ${moon.name}. ${moon.hint}`}>
        <MoonGlyph phase={phase} />
        <Text style={s.tileKicker}>{copy.skyToday}</Text>
        <Text style={s.tileTitle}>{moon.name}</Text>
        <Text style={s.tileBody}>{moon.hint}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onAstrology} style={[s.tile, s.mediaTile]}>
        <Image source={signVisual(zodiac.hasBirthDate ? zodiac.signId : undefined)} style={s.signImage} resizeMode="cover" accessible={false} />
        <View style={s.mediaCopy}>
          <Text style={s.tileKicker}>{zodiac.hasBirthDate ? copy.signToday.replace("{sign}", zodiac.sign) : copy.yourSky}</Text>
          <Text style={s.tileBodyBright} numberOfLines={4}>{zodiac.hasBirthDate ? zodiac.line : copy.addBirthDate}</Text>
          <Text style={s.link}>{`${copy.openSky} →`}</Text>
        </View>
      </Pressable>
    </View>

    <Text style={[s.kicker, s.sectionGap]}>{copy.askLabel}</Text>
    <View style={s.askRow}>
      <TextInput value={askText} onChangeText={setAskText} placeholder={copy.askPlaceholder} placeholderTextColor="#6B645C" accessibilityLabel={copy.askLabel}
        returnKeyType="send" onSubmitEditing={() => ask(askText)} style={s.askInput} />
      <Pressable accessibilityRole="button" accessibilityLabel={copy.askSend} onPress={() => ask(askText)} style={s.askSend}>
        <Ionicons name="arrow-forward" size={18} color={colors.ivory} />
      </Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
      {goal.asks.map(text => <Pressable key={text} accessibilityRole="button" hitSlop={{ top: 2, bottom: 2 }} onPress={() => ask(text)} style={s.chip}><Text style={s.chipText}>{text}</Text></Pressable>)}
    </ScrollView>

    <View style={[s.sectionHeader, s.sectionGap]}>
      <Text style={s.kicker}>{`${copy.forYou} · ${goal.label}`}</Text>
      <Pressable accessibilityRole="button" onPress={nextTopic} style={s.linkButton}><Text style={s.link}>{copy.changeTopic}</Text></Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${goal.title}. ${goal.detail}`} onPress={() => onGoalSuggestion(goal.topic)} style={s.railCard}>
        <Image source={deckCover ?? getFeatureVisual("tarot")} style={s.railImage} resizeMode="cover" accessible={false} />
        <View style={s.railCopy}><Text style={s.railTitle}>{goal.title}</Text><Text style={s.railBody}>{goal.detail}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${goal.person.title}. ${goal.person.detail}`} onPress={() => onAsk(goal.person.prefill)} style={s.railCard}>
        <Image source={getFeatureVisual("oracle")} style={s.railImage} resizeMode="cover" accessible={false} />
        <View style={s.railCopy}><Text style={s.railTitle}>{goal.person.title}</Text><Text style={s.railBody}>{goal.person.detail}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => onWritePrompt(goal.journalPrompt)} style={[s.railCard, s.railNote]}>
        <Ionicons name="book-outline" size={28} color={colors.rose} accessible={false} />
        <Text style={s.railTitle}>{goal.journalPrompt}</Text>
      </Pressable>
    </ScrollView>

    {continuation}
    <View style={[s.sectionHeader, s.sectionGap]}>
      <Text accessibilityRole="header" style={s.kicker}>{copy.continueReading}</Text>
      <Pressable accessibilityRole="button" onPress={onJournal} style={s.linkButton}><Text style={s.link}>{copy.journal}</Text></Pressable>
    </View>
    {latest ? <Pressable accessibilityRole="button" accessibilityLabel={`${latest.title}. ${latest.meta}`} onPress={() => onOpenRecent ? onOpenRecent(latest.id) : onJournal()} style={s.latest}>
      {latest.thumbs.length ? <View style={s.thumbs} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {latest.thumbs.slice(0, 3).map((thumb, index, list) => <Image key={index} source={thumb} resizeMode="cover" accessible={false}
          style={[s.thumb, { left: index * 15, top: list.length > 1 && index !== 1 ? 4 : 0, transform: [{ rotate: list.length > 1 ? `${(index - 1) * 8}deg` : "0deg" }] }]} />)}
      </View> : <View style={s.latestIcon}><Ionicons name="bookmark-outline" size={22} color={colors.gold} /></View>}
      <View style={{ flex: 1 }}>
        <Text style={s.latestTitle} numberOfLines={2}>{latest.title}</Text>
        <Text style={s.meta}>{latest.meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.moon} />
    </Pressable> : <Text style={s.empty}>{copy.empty}</Text>}

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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  bell: { width: 48, height: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.14)", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 4, right: 2, minWidth: 18, height: 18, borderRadius: radius.pill, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  greeting: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 36, includeFontPadding: false, lineHeight: 42, marginTop: 8 },
  subtitle: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 20 },
  nextStep: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, minHeight: 48, padding: 16, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.08)" },
  nextStepTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 19, lineHeight: 23, marginTop: 4, marginBottom: 2 },
  flexOne: { flex: 1 },
  hero: { flexDirection: "row", gap: 18, alignItems: "center", padding: 18, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.35)", backgroundColor: "#1F1C1E" },
  fan: { width: 108, height: 178 },
  fanBack: { position: "absolute", left: 10, top: 6, width: 96, height: 166, borderRadius: 8, backgroundColor: "#2A2528", borderWidth: 1, borderColor: "rgba(201, 130, 141, 0.35)", transform: [{ rotate: "7deg" }] },
  fanFront: { position: "absolute", left: 0, top: 0, width: 100, height: 172, borderRadius: 8, transform: [{ rotate: "-4deg" }],
    shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  heroCopy: { flex: 1, minWidth: 0, gap: 8 },
  heroTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 25, lineHeight: 29 },
  heroHint: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19 },
  heroButton: { marginTop: 4, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2, flexWrap: "wrap" },
  streakText: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, marginLeft: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.outline },
  dotFilled: { backgroundColor: colors.gold, borderColor: colors.gold },
  tileRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  tile: { flex: 1, minHeight: 48, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.08)", padding: 16, gap: 8 },
  tileKicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase" },
  tileTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 20, lineHeight: 23 },
  tileBody: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19 },
  tileBodyBright: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19 },
  mediaTile: { padding: 0, overflow: "hidden", gap: 0 },
  signImage: { width: "100%", height: 70 },
  mediaCopy: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 6 },
  link: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, lineHeight: 19 },
  linkButton: { minHeight: 48, justifyContent: "center", paddingLeft: 12 },
  sectionGap: { marginTop: 26 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  askRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, minHeight: 56, borderRadius: radius.pill, backgroundColor: colors.ivory, paddingLeft: 20, paddingRight: 4 },
  askInput: { flex: 1, minHeight: 48, color: colors.charcoal, fontFamily: typography.bodyFontFamily, fontSize: 15 },
  askSend: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.charcoal, alignItems: "center", justifyContent: "center" },
  chipRow: { gap: 8, paddingTop: 12 },
  chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)" },
  chipText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13 },
  rail: { gap: 12, paddingTop: 4 },
  railCard: { width: 150, borderRadius: radius.card, overflow: "hidden", backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.08)" },
  railImage: { width: "100%", height: 118 },
  railCopy: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 6 },
  railTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 19, lineHeight: 22 },
  railBody: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 17 },
  railNote: { padding: 16, justifyContent: "space-between", minHeight: 190 },
  latest: { flexDirection: "row", alignItems: "center", gap: 14, padding: 12, marginTop: 4, borderRadius: radius.card, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.08)" },
  thumbs: { width: 62, height: 60 },
  thumb: { position: "absolute", width: 32, height: 54, borderRadius: 4 },
  latestIcon: { width: 48, height: 48, borderRadius: radius.card, backgroundColor: colors.surfaceHigh, alignItems: "center", justifyContent: "center" },
  latestTitle: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 20 },
  meta: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, marginTop: 4 },
  empty: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22, marginTop: 4 },
  primary: { minHeight: 56, backgroundColor: colors.ivory, borderRadius: radius.pill, padding: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, lineHeight: 20, textAlign: "center" },
  secondary: { minHeight: 52, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.pill, padding: 12, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24, textAlign: "center" },
  modal: { flex: 1, backgroundColor: colors.charcoal },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8, maxWidth: 760, width: "100%", alignSelf: "center" },
  modalTitle: { flex: 1, color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 30 },
  modalContent: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 24, gap: 16, paddingBottom: 40 },
  modalFooter: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border }
});
