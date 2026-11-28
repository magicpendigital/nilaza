import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "../../theme";
import type { Language } from "../../types";
import { BirthDateFields } from "../astrology/BirthFields";

// Onboarding (design canvas Onboarding, Owner decisions 2026-10-31): up to three goals and an
// optional birth date that shows the sign. The account step comes first, so this is step 2/2.
const signGlyphs: Record<string, string> = {
  aries: "♈︎", taurus: "♉︎", gemini: "♊︎", cancer: "♋︎", leo: "♌︎", virgo: "♍︎",
  libra: "♎︎", scorpio: "♏︎", sagittarius: "♐︎", capricorn: "♑︎", aquarius: "♒︎", pisces: "♓︎"
};

export function GoalsScreen({ language, choices, selected, saving, error, onToggle, onContinue, onSkip, birthDate, onBirthDateChange, sign }: {
  language: Language; choices: Array<{ id: string; label: string }>; selected: string[]; saving: boolean; error: string;
  onToggle: (id: string) => void; onContinue: () => void; onSkip: () => void;
  birthDate: string; onBirthDateChange: (value: string) => void; sign?: { id: string; label: string };
}) {
  const vi = language === "vi";
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.step}>{vi ? "Bước 2/2" : "Step 2 of 2"}</Text>
      <Text accessibilityRole="header" style={styles.title}>{vi ? "Điều gì đang ở trong lòng bạn?" : "What is on your mind?"}</Text>
      <Text style={styles.hint}>{vi ? "Chọn tối đa 3. Trang Hôm nay sẽ ưu tiên những điều này." : "Choose up to 3. Today will put these first."}</Text>
      <View style={styles.choices} pointerEvents={saving ? "none" : "auto"} accessibilityState={{ disabled: saving }}>
        {choices.map((goal) => {
          const active = selected.includes(goal.id);
          return (
            <Pressable key={goal.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => onToggle(goal.id)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{goal.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.birth}>
        <Text style={styles.label}>{vi ? "Ngày sinh " : "Birth date "}<Text style={styles.optional}>{vi ? "(không bắt buộc)" : "(optional)"}</Text></Text>
        <BirthDateFields language={language} value={birthDate} onChange={onBirthDateChange} label={false} />
        {sign ? (
          <View style={styles.sign}>
            <Text style={styles.glyph}>{signGlyphs[sign.id] ?? "✧"}</Text>
            <Text style={styles.signText}>
              {vi ? "Bạn thuộc cung " : "Your sign is "}<Text style={styles.signName}>{sign.label}</Text>
              {vi ? ". Mỗi sáng Nilaza chuẩn bị một lời nhắn theo cung của bạn." : ". Each morning Nilaza prepares a note for your sign."}
            </Text>
          </View>
        ) : null}
        <Text style={styles.privacy}>{vi ? "Lưu trên máy bạn; xóa bất cứ lúc nào trong mục Tôi." : "Saved on your device; delete it anytime in Me."}</Text>
      </View>

      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={onContinue} style={[styles.primary, saving && styles.disabled]}>
        <Text style={styles.primaryText}>{saving ? (vi ? "Đang lưu…" : "Saving…") : vi ? "Vào Nilaza" : "Enter Nilaza"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={onSkip} style={styles.secondary}>
        <Text style={styles.secondaryText}>{vi ? "Để sau" : "Later"}</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.charcoal },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", padding: spacing.lg, paddingBottom: 40, gap: 16 },
  step: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 24 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 38 },
  hint: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 4 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.18)", justifyContent: "center" },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15 },
  chipTextActive: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  birth: { gap: 10, padding: 16, borderRadius: radius.card, backgroundColor: "#1F1C1E" },
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  optional: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 13 },
  sign: { flexDirection: "row", alignItems: "center", gap: 12 },
  glyph: { color: colors.gold, fontSize: 28 },
  signText: { flex: 1, color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  signName: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily },
  privacy: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5 },
  error: { color: colors.rose, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22 },
  primary: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15.5 },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#B8B0A4", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  disabled: { opacity: 0.5 }
});
