// 2026-11-28 (R1): the WhoAmI "Báo cáo đã lưu" row of the Number Map report: "Xem lại" opens the saved text below the
// row, "Xóa" asks once and then empties the key on this device (the server never had a copy).
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography } from "../../theme";
import type { Language } from "../../types";
import { fill } from "./content";
import { formatReportDate, SavedReportBody } from "./NumerologyReport";
import { reportCopyText } from "./reportContent";
import type { SavedNumerologyReport } from "./reportStore";

export function SavedNumerologyReportRow({ report, language, onDelete }: { report: SavedNumerologyReport; language: Language; onDelete: () => Promise<void> | void }) {
  const text = reportCopyText(language);
  const [shown, setShown] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <View testID="whoami-numerology-report-row" style={s.wrap}>
      <View style={s.row}>
        <Ionicons name="document-text-outline" size={19} color={colors.gold} />
        <View style={s.flex}>
          <Text style={s.title}>{text.rowLabel}</Text>
          <Text style={s.detail}>{fill(text.savedAt, { date: formatReportDate(report.createdAt, language) })}</Text>
        </View>
        <Button testID="whoami-numerology-report-view" label={text.view} accessibilityLabel={`${text.view} ${text.rowLabel}`} onPress={() => setShown((value) => !value)} />
        <Button testID="whoami-numerology-report-delete" label={text.delete} accessibilityLabel={`${text.delete} ${text.rowLabel}`} onPress={() => setConfirming(true)} danger />
      </View>
      {confirming ? (
        <View testID="whoami-numerology-report-confirm" style={s.confirm}>
          <Text style={s.title}>{text.deleteTitle}</Text>
          <Text style={s.detail}>{text.deleteBody}</Text>
          <View style={s.pair}>
            <Button testID="whoami-numerology-report-keep" label={text.consentCancel} onPress={() => setConfirming(false)} />
            <Button testID="whoami-numerology-report-confirm-delete" label={text.delete} onPress={() => { setConfirming(false); setShown(false); void onDelete(); }} danger />
          </View>
        </View>
      ) : null}
      {shown ? <SavedReportBody report={report} language={language} /> : null}
    </View>
  );
}

function Button({ testID, label, accessibilityLabel, onPress, danger }: { testID: string; label: string; accessibilityLabel?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} hitSlop={6} style={[s.button, danger && s.danger]}>
      <Text style={[s.buttonText, danger && s.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  title: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  detail: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  confirm: { padding: 12, borderRadius: 12, backgroundColor: "rgba(231, 183, 190, 0.08)", gap: 8 },
  pair: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  button: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.3)", alignItems: "center", justifyContent: "center" },
  buttonText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13 },
  danger: { borderColor: "rgba(231, 140, 140, 0.6)" },
  dangerText: { color: "#E7A0A0" }
});
