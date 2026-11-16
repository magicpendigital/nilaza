import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";

// Account deletion (Google Play requirement). The person types the phrase themselves; the app then
// sends the machine token. Hidden until the account-delete function and its SQL are deployed.
export const deletePhrase = { vi: "XÓA", en: "DELETE" };

export function DeleteAccountPanel({ language, onDelete, notice }: {
  language: Language;
  onDelete: () => Promise<string | null>;
  /** Optional extra explanation shown under the main text (e.g. the Google Play subscription notice). */
  notice?: ReactNode;
}) {
  const vi = language === "vi";
  const phrase = vi ? deletePhrase.vi : deletePhrase.en;
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = typed.trim().toUpperCase() === phrase && !busy;
  return (
    <View style={s.root}>
      <Text style={s.title} accessibilityRole="header">{vi ? "Xóa tài khoản" : "Delete account"}</Text>
      <Text style={s.body}>
        {vi
          ? "Tài khoản và dữ liệu đã đồng bộ (hồ sơ, Nhật ký, trò chuyện, lá số đã lưu) sẽ bị xóa vĩnh viễn và không khôi phục được. Dữ liệu trên thiết bị này cũng được dọn sạch."
          : "Your account and synced data (profile, Journal, chats, saved charts) will be permanently deleted and cannot be restored. Data on this device is cleared too."}
      </Text>
      {notice}
      <Text style={s.label}>{vi ? `Gõ ${phrase} để xác nhận` : `Type ${phrase} to confirm`}</Text>
      <TextInput value={typed} onChangeText={setTyped} autoCapitalize="characters" accessibilityLabel={vi ? `Gõ ${phrase} để xác nhận` : `Type ${phrase} to confirm`} style={s.input} />
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} style={[s.danger, !ready && s.disabled]}
        onPress={async () => {
          setBusy(true);
          setError("");
          const failure = await onDelete();
          setBusy(false);
          if (failure) setError(failure);
        }}>
        <Text style={s.dangerText}>{busy ? (vi ? "Đang xóa…" : "Deleting…") : vi ? "Xóa vĩnh viễn" : "Delete permanently"}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12, paddingTop: 8 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 28 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22 },
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, marginTop: 6 },
  input: { minHeight: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(231, 183, 190, 0.5)", paddingHorizontal: 18, color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, backgroundColor: "#1F1C1E" },
  error: { color: "#E7B7BE", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  danger: { minHeight: 52, borderRadius: radius.pill, backgroundColor: "#C9828D", alignItems: "center", justifyContent: "center", marginTop: 6 },
  disabled: { opacity: 0.45 },
  dangerText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 }
});
