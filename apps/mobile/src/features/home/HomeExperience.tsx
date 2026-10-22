import type { ReactNode } from "react";
import { useState } from "react";
import { Image, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Brand } from "../../a2ui/Brand";
import { brandCopy, notificationLabel } from "../../brand/copy";
import { getFeatureVisual } from "../../visualAssets";
import { colors, typography } from "../../theme";
import type { Language } from "../../types";

type DayPhase = "morning" | "afternoon" | "evening" | "night";

export function HomeExperience({ language, greeting, dayPhase = "morning", revealed, onReveal, onChat, onJournal, onOpenRecent, onNotifications, unread, reflection, cardBack, recent, continuation }: {
  language: Language; greeting: string; revealed: boolean; onReveal: () => void; onChat: () => void; onJournal: () => void;
  onOpenRecent?: (id: string) => void;
  onNotifications: () => void; unread: number; reflection: ReactNode; cardBack: ImageSourcePropType; recent: Array<{ id: string; title: string; date: string }>; continuation?: ReactNode; dayPhase?: DayPhase;
}) {
  const [open, setOpen] = useState(false);
  const [cardOpened, setCardOpened] = useState(false);
  const drawLabel = { vi: "Chạm để mở lá bài hôm nay", en: "Tap to reveal today's card", "zh-Hans": "轻触揭开今日卡牌", ja: "タップして今日のカードをめくる", ko: "탭하여 오늘의 카드 공개" }[language];
  const copy = brandCopy(language);
  const phase = {
    morning: { label: language === "vi" ? "Ánh sáng sớm" : "Morning light", overlay: "rgba(201, 164, 92, 0.10)" },
    afternoon: { label: language === "vi" ? "Khoảng trưa dịu" : "Soft afternoon", overlay: "rgba(14, 90, 90, 0.18)" },
    evening: { label: language === "vi" ? "Chạng vạng" : "Evening hush", overlay: "rgba(201, 130, 141, 0.18)" },
    night: { label: language === "vi" ? "Đêm yên" : "Quiet night", overlay: "rgba(10, 9, 16, 0.40)" }
  }[dayPhase];
  return <View style={s.root}>
    <View style={s.header}>
      <Brand variant="horizontal" width={180} />
      <Pressable accessibilityRole="button" accessibilityLabel={notificationLabel(language, unread)} onPress={onNotifications} style={s.iconButton}>
        <Ionicons name="notifications-outline" size={24} color={colors.ivory} />
        {unread > 0 ? <Text style={s.count}>{unread}</Text> : null}
      </Pressable>
    </View>
    <Text accessibilityRole="header" style={s.greeting}>{greeting}</Text>
    <Text style={s.subtitle}>{copy.today}</Text>
    <View accessibilityLabel={phase.label} style={s.artwork}>
      <Image source={getFeatureVisual("open-reflection-home")} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} resizeMode="cover" accessible={false} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: phase.overlay }]} />
      <View pointerEvents="none" style={s.phaseLabel}><Text style={s.phaseLabelText}>{phase.label}</Text></View>
    </View>
    <Pressable accessibilityRole="button" onPress={() => { setCardOpened(revealed); setOpen(true); }} style={s.primary}>
      <Text style={s.primaryText}>{revealed ? copy.revisitReflection : copy.startReflection}</Text>
    </Pressable>
    <View style={s.secondaryRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.chat} onPress={onChat} style={s.secondary}><Ionicons accessible={false} name="chatbubble-outline" size={21} color={colors.ivory} /><Text style={s.secondaryText}>{copy.chat}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.journal} onPress={onJournal} style={s.secondary}><Ionicons accessible={false} name="book-outline" size={21} color={colors.ivory} /><Text style={s.secondaryText}>{copy.journal}</Text></Pressable>
    </View>
    {continuation}
    <Text accessibilityRole="header" style={s.section}>{copy.recent}</Text>
    {recent.length ? recent.map(entry => <Pressable key={entry.id} accessibilityRole="button" onPress={() => onOpenRecent ? onOpenRecent(entry.id) : onJournal()} style={s.recent}>
      <View style={{ flex: 1 }}><Text style={s.recentTitle}>{entry.title}</Text><Text style={s.meta}>{entry.date}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.moon} />
    </Pressable>) : <Text style={s.empty}>{copy.empty}</Text>}
    <Modal visible={open} animationType="none" onRequestClose={() => setOpen(false)} presentationStyle="fullScreen">
      <SafeAreaView style={s.modal}>
        <View style={s.modalHeader}><Text accessibilityRole="header" style={s.modalTitle}>{copy.reflection}</Text><Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={() => setOpen(false)} style={s.iconButton}><Ionicons name="close" size={28} color={colors.ivory} /></Pressable></View>
        <ScrollView contentContainerStyle={s.modalContent}>
          {cardOpened ? reflection : <View style={{ alignItems: "center", gap: 24 }}>
            <Text style={s.subtitle}>{copy.breath}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={drawLabel} onPress={() => { onReveal(); setCardOpened(true); }} style={{ alignItems: "center", gap: 20, width: "100%" }}>
              <Image source={cardBack} resizeMode="contain" style={{ width: 180, height: 300 }} accessible={false} />
              <View style={[s.primary, { alignSelf: "stretch" }]}><Text style={s.primaryText}>{drawLabel}</Text></View>
            </Pressable>
          </View>}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={[s.secondary, { flex: 0, margin: 20 }]}><Text style={s.secondaryText}>{copy.close}</Text></Pressable>
      </SafeAreaView>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  root: { width: "100%", maxWidth: 760, alignSelf: "center", paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3 },
  count: { color: colors.gold, fontFamily: typography.bodyFontFamily, fontSize: 12 },
  greeting: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 36, includeFontPadding: false, lineHeight: 48, paddingBottom: 4 },
  subtitle: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 17, lineHeight: 25, marginTop: 6, marginBottom: 22 },
  artwork: { width: "100%", aspectRatio: 1.5, borderRadius: 8, overflow: "hidden", marginBottom: 18 },
  phaseLabel: { bottom: 12, left: 14, position: "absolute" },
  phaseLabelText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 0.4, textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  primary: { minHeight: 56, backgroundColor: colors.ivory, borderRadius: 8, padding: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, lineHeight: 24, textAlign: "center" },
  secondaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12, marginBottom: 28 },
  secondary: { flex: 1, minWidth: 130, minHeight: 52, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 8, padding: 12, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center" },
  secondaryText: { flexShrink: 1, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24, textAlign: "center" },
  section: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 25, marginTop: 16, marginBottom: 12 },
  recent: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 64, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  recentTitle: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 23 },
  meta: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 13, marginTop: 4 },
  empty: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 },
  modal: { flex: 1, backgroundColor: colors.charcoal },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8, maxWidth: 760, width: "100%", alignSelf: "center" },
  modalTitle: { flex: 1, color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 30 },
  modalContent: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 24, gap: 16, paddingBottom: 40 }
});
