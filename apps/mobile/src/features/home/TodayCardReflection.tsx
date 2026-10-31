import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { brandCopy } from "../../brand/copy";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

export function TodayCardReflection({ language, cardImage, cardName, cardMeta, deckName, keywords, meaning, question, microAction, guidance, moods, selectedMood, onMood, onAnotherGuidance, disclaimer, note, onNoteChange, savedNote }: {
  language: Language; cardImage: ImageSourcePropType; cardName: string; cardMeta?: string; deckName: string; keywords: string[]; meaning: string; question: string;
  microAction: string; guidance?: string; moods: Array<{ id: string; label: string }>; selectedMood?: string; onMood: (id: string) => void;
  onAnotherGuidance?: () => void; disclaimer: string;
  /** Answer to the question, saved with the card (analysis HO-03); savedNote shows it read-only after saving. */
  note?: string; onNoteChange?: (value: string) => void; savedNote?: string;
}) {
  const vi = language === "vi";
  const copy = brandCopy(language);
  return <View style={s.root}>
    <Image source={cardImage} resizeMode="contain" style={s.card} accessibilityLabel={cardName} />
    <View style={s.center}>
      <Text accessibilityRole="header" style={s.title}>{cardName}</Text>
      {cardMeta ? <Text style={s.meta}>{cardMeta}</Text> : null}
      <Text style={s.deck}>{deckName}</Text>
      {keywords.length ? <View style={s.keywords}>{keywords.map(word => <Text key={word} style={s.keyword}>{word}</Text>)}</View> : null}
    </View>
    <View style={s.message}>
      <Text style={s.kicker}>{copy.yourMessage}</Text>
      <Text style={s.messageText}>{meaning}</Text>
      <Text style={s.question}>{question}</Text>
      {savedNote !== undefined ? (
        savedNote ? <Text style={s.savedNote}>{savedNote}</Text> : null
      ) : onNoteChange ? (
        <TextInput
          accessibilityLabel={vi ? "Trả lời câu hỏi hôm nay" : "Answer today's question"}
          value={note ?? ""}
          onChangeText={onNoteChange}
          placeholder={vi ? "Hôm nay mình cần…" : "Today I need…"}
          placeholderTextColor={colors.moon}
          maxLength={500}
          multiline
          style={s.noteInput}
        />
      ) : null}
    </View>
    <View style={s.panel}>
      <Text style={s.kicker}>{copy.smallStep}</Text>
      <Text style={s.body}>{microAction}</Text>
    </View>
    <Text style={s.label}>{copy.currentMood}</Text>
    <View style={s.moods}>
      {moods.map(mood => {
        const selected = mood.id === selectedMood;
        return <Pressable key={mood.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onMood(mood.id)} style={[s.mood, selected && s.moodSelected]}>
          {selected ? <Ionicons name="checkmark" size={16} color={colors.charcoal} /> : null}
          <Text style={[s.moodText, selected && s.moodTextSelected]}>{mood.label}</Text>
        </Pressable>;
      })}
    </View>
    {guidance ? <View style={s.panel}>
      <Text style={s.kicker}>{copy.guidance}</Text>
      <Text style={s.body}>{guidance}</Text>
      {onAnotherGuidance ? <Pressable accessibilityRole="button" onPress={onAnotherGuidance} style={s.linkButton}><Text style={s.link}>{copy.anotherGuidance}</Text></Pressable> : null}
    </View> : null}
    <Text style={s.disclaimer}>{disclaimer}</Text>
  </View>;
}

export function TodayCardActions({ language, saved, onSave, onAskDeeper, onShare }: {
  language: Language; saved: boolean; onSave: () => void; onAskDeeper: () => void; onShare: () => void;
}) {
  const copy = brandCopy(language);
  return <View style={s.actions}>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: saved }} disabled={saved} onPress={onSave} style={[s.primary, saved && s.primarySaved]}>
      {saved ? <Ionicons name="checkmark" size={18} color={colors.ivory} /> : null}
      <Text style={[s.primaryText, saved && s.primaryTextSaved]}>{saved ? copy.savedToday : copy.saveToday}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={onAskDeeper} style={s.secondary}><Text style={s.secondaryText}>{copy.askDeeper}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={copy.share} onPress={onShare} style={s.iconButton}><Ionicons name="share-outline" size={22} color={colors.ivory} /></Pressable>
  </View>;
}

const s = StyleSheet.create({
  root: { gap: 16 },
  card: { width: 190, height: 320, alignSelf: "center" },
  center: { alignItems: "center", gap: 6 },
  title: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 32, lineHeight: 38, textAlign: "center" },
  meta: { color: colors.gold, fontFamily: typography.bodyMediumFontFamily, fontSize: 13, letterSpacing: 0.4, textAlign: "center" },
  deck: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 14 },
  keywords: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 6 },
  keyword: { color: "#E7B7BE", backgroundColor: "rgba(201, 130, 141, 0.16)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, fontFamily: typography.bodyFontFamily, fontSize: 13 },
  message: { borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.38)", backgroundColor: colors.surfaceContainer, padding: 18, gap: 10 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
  messageText: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21, lineHeight: 29 },
  question: { color: colors.onSurface, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 },
  noteInput: { marginTop: 10, minHeight: 48, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.35)", paddingHorizontal: 12, paddingVertical: 10, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 21 },
  savedNote: { marginTop: 10, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 21, fontStyle: "italic" },
  panel: { borderRadius: radius.card, backgroundColor: colors.surfaceContainer, padding: 16, gap: 8 },
  body: { color: colors.onSurface, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 },
  label: { color: colors.ivory, fontFamily: typography.bodyMediumFontFamily, fontSize: 15 },
  moods: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mood: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  moodSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
  moodText: { color: colors.onSurface, fontFamily: typography.bodyFontFamily, fontSize: 15 },
  moodTextSelected: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  linkButton: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  disclaimer: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19, textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, alignItems: "center" },
  primary: { flex: 1, minHeight: 52, flexDirection: "row", gap: 6, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  primarySaved: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.outlineVariant },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15, textAlign: "center" },
  primaryTextSaved: { color: colors.ivory },
  secondary: { flex: 1, minHeight: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.6)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  secondaryText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15, textAlign: "center" },
  iconButton: { width: 52, height: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }
});
