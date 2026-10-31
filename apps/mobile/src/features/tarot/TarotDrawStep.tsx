import type { ReactNode } from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";

export type DrawSlot = { label: string; card?: { name: string; image: ImageSourcePropType; reversed: boolean } };

export type TarotDrawStepProps = {
  language: Language;
  question: string;
  slots: DrawSlot[];
  backImage: ImageSourcePropType;
  selectedFanIndex: number | null;
  onSelectFan: (index: number) => void;
  onOpenCard: (index: number) => void;
  busy: boolean;
  status?: string;
  onDrawRest?: () => void;
  onChangeDeck: () => void;
  children?: ReactNode;
};

const fanAngles = [-36, -27, -18, -9, 0, 9, 18, 27, 36];

export function TarotDrawStep({ language, question, slots, backImage, selectedFanIndex, onSelectFan, onOpenCard, busy, status, onDrawRest, onChangeDeck, children }: TarotDrawStepProps) {
  const vi = language === "vi";
  const nextIndex = slots.findIndex((slot) => !slot.card);
  const done = nextIndex === -1;
  const nextLabel = done ? "" : slots[nextIndex].label;
  const remaining = slots.filter((slot) => !slot.card).length;

  return (
    <View style={s.root}>
      {question.trim() ? (
        <View style={s.question}>
          <Ionicons name="sparkles-outline" size={18} color="#E7B7BE" style={s.questionIcon} />
          <Text style={s.questionText}>{question.trim()}</Text>
        </View>
      ) : null}

      <View style={s.slots}>
        {slots.map((slot, index) => {
          const isNext = index === nextIndex;
          return (
            <View key={`${slot.label}-${index}`} style={s.slot}>
              {slot.card ? (
                <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${slot.label}: ${slot.card.name}. ${vi ? "Xem hình lá bài toàn màn hình" : "View full-screen card artwork"}`}
                  onPress={() => onOpenCard(index)} style={s.slotCard}>
                  <Image source={slot.card.image} style={[s.slotImage, slot.card.reversed && s.reversed]} resizeMode="cover" />
                </Pressable>
              ) : (
                <View style={[s.slotEmpty, isNext && s.slotNext]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Text style={[s.slotNumber, isNext && s.slotNumberNext]}>{index + 1}</Text>
                </View>
              )}
              <Text style={[s.slotLabel, isNext && s.slotLabelNext, slot.card && s.slotLabelDone]} numberOfLines={2}>{slot.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={s.prompt} accessibilityLiveRegion="polite">
        {done
          ? vi ? "Các lá đã sẵn sàng. Xem thông điệp khi bạn muốn." : "Your cards are ready. Read the message when you like."
          : <>{vi ? "Hít một hơi chậm. Chọn lá cho vị trí " : "Take a slow breath. Choose a card for "}<Text style={s.promptEm}>{nextLabel}</Text>.</>}
      </Text>
      {status ? <Text style={s.status}>{status}</Text> : null}

      {!done ? (
        <View style={s.fan} accessibilityLabel={vi ? "Quạt bài, chạm để chọn một lá" : "Fanned deck, tap to choose a card"}>
          {fanAngles.map((angle, index) => {
            const selected = selectedFanIndex === index;
            return (
              <Pressable key={angle} disabled={busy} accessibilityRole="button" accessibilityState={{ selected, disabled: busy }}
                accessibilityLabel={vi ? `Lá thứ ${index + 1} trong quạt` : `Card ${index + 1} in the fan`}
                onPress={() => onSelectFan(index)}
                style={[s.fanCard, { transform: [{ rotate: `${angle}deg` }, { translateY: selected ? -30 : 0 }] }, selected && s.fanCardSelected]}>
                <Image source={backImage} style={s.fanImage} resizeMode="cover" />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {children}

      <View style={s.links}>
        {onDrawRest && remaining > 1 ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={onDrawRest} style={s.link}>
            <Text style={s.linkText}>{vi ? `Lật cả ${remaining} lá ngay` : `Reveal all ${remaining} now`}</Text>
          </Pressable>
        ) : <View />}
        <Pressable accessibilityRole="button" onPress={onChangeDeck} style={s.link}>
          <Text style={s.linkMuted}>{vi ? "Đổi bộ bài" : "Change deck"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingTop: 8 },
  question: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 14, borderRadius: 14, backgroundColor: "#1F1C1E" },
  questionIcon: { marginTop: 2 },
  questionText: { flex: 1, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  slots: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 18 },
  slot: { flex: 1, maxWidth: 96, alignItems: "center", gap: 8 },
  slotCard: { width: "100%", aspectRatio: 86 / 148, borderRadius: radius.card, overflow: "hidden" },
  slotImage: { width: "100%", height: "100%" },
  reversed: { transform: [{ rotate: "180deg" }] },
  slotEmpty: { width: "100%", aspectRatio: 86 / 148, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", alignItems: "center", justifyContent: "center" },
  slotNext: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.gold, backgroundColor: "rgba(201, 164, 92, 0.08)", shadowColor: colors.gold, shadowOpacity: 0.3, shadowRadius: 14 },
  slotNumber: { color: "#6E675F", fontFamily: typography.headlineRegularFontFamily, fontSize: 30 },
  slotNumberNext: { color: colors.gold },
  slotLabel: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, textAlign: "center" },
  slotLabelNext: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily },
  slotLabelDone: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily },
  prompt: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 29, textAlign: "center", marginTop: 24, marginHorizontal: 12 },
  promptEm: { color: colors.gold, fontStyle: "italic" },
  status: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, textAlign: "center", marginTop: 8 },
  fan: { height: 230, marginTop: 18, alignItems: "center" },
  fanCard: { position: "absolute", top: 50, width: 68, height: 118, borderRadius: 6, overflow: "hidden", transformOrigin: "50% 320%", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  fanCardSelected: { borderWidth: 2, borderColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.55, shadowRadius: 20 },
  fanImage: { width: "100%", height: "100%" },
  links: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  link: { minHeight: layout.minimumTouchTarget, justifyContent: "center", paddingHorizontal: 8 },
  linkText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  linkMuted: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5 }
});
