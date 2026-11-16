import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Tarot v2 pack 1: shown on Home after sign-in when the person drew a card while signed out the same Vietnam day. Opening it asks
// the server for the same cards (same device id) and shows the reading, so only the AI analysis is left to run.
export function GuestCarryCard({ language, cardName, image, reversed, busy, onPress }: {
  language: Language; cardName: string; image: ImageSourcePropType; reversed: boolean; busy: boolean; onPress: () => void;
}) {
  const vi = language === "vi";
  const title = vi ? "Lá bạn đã rút khi chưa đăng nhập" : "The card you drew before signing in";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${cardName}`} accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={onPress} style={[s.card, busy && s.busy]}>
      <Image source={image} resizeMode="cover" accessible={false} style={[s.image, reversed && s.reversed]} />
      <View style={s.copy}>
        <Text style={s.kicker}>{vi ? "LÁ ĐANG CHỜ BẠN" : "A CARD IS WAITING"}</Text>
        <Text style={s.title}>{cardName}</Text>
        <Text style={s.body}>{busy ? (vi ? "Đang mở bài đọc..." : "Opening your reading...") : (vi ? "Mở bài đọc đúng lá này →" : "Open the reading of this very card →")}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 96, marginTop: 14, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.5)", backgroundColor: "#1F1C1E" },
  busy: { opacity: 0.6 },
  image: { width: 52, height: 90, borderRadius: 6 },
  reversed: { transform: [{ rotate: "180deg" }] },
  copy: { flex: 1, gap: 2 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.4 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 26 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 19 }
});
