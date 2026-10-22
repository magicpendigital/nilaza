import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "../../a2ui/Brand";
import { ChoiceTile, PrimaryButton, SecondaryButton } from "../../a2ui";
import { brandCopy } from "../../brand/copy";
import { colors, spacing, typography } from "../../theme";
import type { Language } from "../../types";

export function GoalsScreen({ language, choices, selected, saving, error, onToggle, onContinue, onSkip }: {
  language: Language; choices: Array<{ id: string; label: string }>; selected: string[]; saving: boolean; error: string;
  onToggle: (id: string) => void; onContinue: () => void; onSkip: () => void;
}) {
  const copy = brandCopy(language);
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Brand variant="horizontal" width={190} />
      <Text accessibilityRole="header" style={styles.title}>{copy.goalsTitle}</Text>
      <Text style={styles.hint}>{copy.goalsHint}</Text>
      <View style={styles.choices} pointerEvents={saving ? "none" : "auto"} accessibilityState={{ disabled: saving }}>
        {choices.map(goal => <ChoiceTile key={goal.id} active={selected.includes(goal.id)} label={goal.label} detail="" onPress={() => onToggle(goal.id)} />)}
      </View>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={saving ? copy.saving : copy.continue} onPress={onContinue} disabled={saving} />
      <SecondaryButton label={copy.skip} onPress={onSkip} disabled={saving} />
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.charcoal },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", padding: spacing.lg, paddingBottom: 40, gap: 16 },
  title: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 34, lineHeight: 42, marginTop: 28 },
  hint: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginVertical: 12 },
  error: { color: colors.rose, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 }
});
