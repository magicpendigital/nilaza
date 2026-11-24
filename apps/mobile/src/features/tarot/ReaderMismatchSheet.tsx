import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Batch C (Owner approved 23/11/2026, artboard ReaderMismatch): a gentle, non-blocking reminder shown at most once
// per spread when the chosen reader usually works another domain. Both buttons continue; closing keeps the choice.

// Once per spread for this app session, even if the result screen is left and opened again.
const nudged = new Set<string>();
export function readerMismatchAlreadyShown(readingId: string) { return nudged.has(readingId); }
export function markReaderMismatchShown(readingId: string) { nudged.add(readingId); }
/** Test helper. */
export function resetReaderMismatchState() { nudged.clear(); }

export type ReaderMismatchSheetProps = {
  visible: boolean;
  language: Language;
  chosenName: string;
  /** e.g. "công việc và quyết định" (readerDomainPhrase). */
  chosenDomain: string;
  /** e.g. "tình cảm" (readerTopicPhrase). */
  topicPhrase: string;
  suggestedName: string;
  onKeep: () => void;
  onSwitch: () => void;
  /** Android Back / outside close: just closes, the person stays on the result. */
  onDismiss?: () => void;
};

export function ReaderMismatchSheet({ visible, language, chosenName, chosenDomain, topicPhrase, suggestedName, onKeep, onSwitch, onDismiss }: ReaderMismatchSheetProps) {
  const vi = language === "vi";
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss ?? onKeep}>
      <View style={s.backdrop}>
        <View style={s.sheet} accessibilityViewIsModal>
          <Text style={s.title} accessibilityRole="header">{vi ? "Một góc nhìn khác có thể hợp hơn" : "Another lens may fit better"}</Text>
          <Text style={s.body}>{vi
            ? `${chosenName} thường dẫn chuyện ${chosenDomain}. Câu bạn hỏi là chuyện ${topicPhrase}. ${suggestedName} có thể đi sát câu hỏi hơn, nhưng góc nhìn khác cũng có giá trị riêng. Bạn muốn góc nhìn nào?`
            : `${chosenName} usually guides ${chosenDomain}. Your question is about ${topicPhrase}. ${suggestedName} may stay closer to it, but another lens has its own value. Which would you like?`}</Text>
          <Pressable accessibilityRole="button" onPress={onSwitch} style={s.primary}>
            <Text style={s.primaryText}>{vi ? `Đổi sang ${suggestedName}` : `Switch to ${suggestedName}`}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onKeep} style={s.secondary}>
            <Text style={s.secondaryText}>{vi ? `Vẫn hỏi ${chosenName}` : `Keep ${chosenName}`}</Text>
          </Pressable>
          <Text style={s.note}>{vi ? "Chỉ nhắc một lần mỗi trải bài. Không chặn lựa chọn của bạn." : "Shown once per spread. Your choice is never blocked."}</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.55)" },
  sheet: { padding: 20, gap: 12, borderTopLeftRadius: radius.card * 2, borderTopRightRadius: radius.card * 2, backgroundColor: "#1F1B17", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.35)" },
  title: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 22, lineHeight: 28 },
  body: { color: "#E3DCCF", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22 },
  primary: { minHeight: 48, borderRadius: 999, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: colors.ink, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  secondary: { minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.3)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18, textAlign: "center" }
});
