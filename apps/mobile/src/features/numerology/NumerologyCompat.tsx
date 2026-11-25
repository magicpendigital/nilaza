import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography } from "../../theme";
import type { Language } from "../../types";
import { BirthDateFields } from "../astrology/BirthFields";
import { buildNumerologyMap, type NumerologyMap } from "./calc";
import { compareNumerology, type CompatRow } from "./compat";
import { kindTitle, privateMessageCard, relationshipFrame, relationshipLine, relationshipPair, relationshipPrivacyNote } from "./content";
import { cleanName, nameMaxLength } from "./store";

// Lô 5, lớp 4 "Hợp số" and the "Lời nhắn riêng · Sắp có" card.
//
// PRIVACY: the other person's birth date and name are another person's data. They live ONLY in this component's
// state: never passed to storage, an event, a share card, a link or a request. Leaving the result (or the screen)
// unmounts this component and drops them. The event below carries no metadata at all.

const teal = "#9FD3CF";
const amber = "#E3B583";
const rose = "#E7B7BE";
const muted = "#8F877C";
const body = "#E9E2D6";
const card = "#1F1C1E";

type Props = { map: NumerologyMap; language: Language; onCompared?: () => void };

export function NumerologyCompat({ map, language, onCompared }: Props) {
  const vi = language === "vi";
  const [otherDate, setOtherDate] = useState("");
  const [otherName, setOtherName] = useState("");
  const [rows, setRows] = useState<CompatRow[] | null>(null);
  const ready = Boolean(buildNumerologyMap(otherDate));

  const compare = () => {
    const other = buildNumerologyMap(otherDate, otherName);
    if (!other) return;
    setRows(compareNumerology(map, other));
    onCompared?.();
  };
  const youLabel = vi ? "Bạn" : "You";
  const otherLabel = vi ? "Người kia" : "The other person";

  return (
    <View testID="numerology-compat" style={s.stack}>
      <View style={s.section}>
        <Text style={s.kicker}>{vi ? "HỢP SỐ" : "TWO MAPS"}</Text>
        <Text accessibilityRole="header" style={s.h2}>{vi ? "Hợp số" : "Two maps side by side"}</Text>
        <Text style={s.hint}>{relationshipFrame(language)}</Text>
      </View>

      <View style={s.panel}>
        <BirthDateFields language={language} value={otherDate} onChange={(value) => { setOtherDate(value); setRows(null); }} label={vi ? "Ngày sinh người kia (dương lịch)" : "The other person's birth date (Gregorian)"} />
        <View style={s.labelRow}>
          <Text style={s.label}>{vi ? "Họ tên khai sinh người kia" : "The other person's birth name"}</Text>
          <Text style={s.optional}>{vi ? "Không bắt buộc" : "Optional"}</Text>
        </View>
        <TextInput
          accessibilityLabel={vi ? "Họ tên khai sinh người kia" : "The other person's birth name"}
          value={otherName}
          onChangeText={(value) => { setOtherName(cleanName(value)); setRows(null); }}
          maxLength={nameMaxLength}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="off"
          placeholder={vi ? "Để trống thì chỉ so số chủ đạo" : "Leave empty to compare the life path only"}
          placeholderTextColor="#6E675F"
          style={s.input}
        />
        <View style={s.privacy}>
          <Ionicons name="lock-closed-outline" size={18} color={teal} style={s.privacyIcon} />
          <Text testID="compat-privacy" style={s.privacyText}>{relationshipPrivacyNote(language)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={compare} style={[s.primary, !ready && s.disabled]}>
          <Text style={s.primaryText}>{vi ? "So hai bản đồ" : "Compare the two maps"}</Text>
        </Pressable>
        {!ready ? <Text style={[s.hint, s.center]}>{vi ? "Cần ngày sinh đúng của người kia để so." : "Enter the other person's valid birth date to compare."}</Text> : null}
      </View>

      {rows ? (
        <View testID="compat-results" style={s.stack}>
          {rows.map((row) => {
            const pair = relationshipPair(row.relation, language);
            const title = kindTitle(row.kind, language);
            return (
              <View key={row.kind} testID={`compat-${row.kind}`} style={s.panel}>
                <Text style={s.panelKicker}>{title}</Text>
                <View style={s.pairRow}>
                  <View style={s.flex} accessible accessibilityLabel={`${youLabel}: ${title} ${row.a.label}`}>
                    <Text style={s.who}>{youLabel}</Text>
                    <Text style={s.number}>{row.a.label}</Text>
                  </View>
                  <View style={s.flex} accessible accessibilityLabel={`${otherLabel}: ${title} ${row.b.label}`}>
                    <Text style={s.who}>{otherLabel}</Text>
                    <Text style={s.number}>{row.b.label}</Text>
                  </View>
                </View>
                <Text style={s.panelBody}><Text style={s.bold}>{`${youLabel} (${row.a.label}): `}</Text>{relationshipLine(row.a, language)}</Text>
                <Text style={s.panelBody}><Text style={s.bold}>{`${otherLabel} (${row.b.label}): `}</Text>{relationshipLine(row.b, language)}</Text>
                <View style={s.pro}>
                  <Text style={[s.proTitle, { color: teal }]}>{vi ? "Điểm chung" : "Common ground"}</Text>
                  <Text style={s.proText}>{pair.common}</Text>
                </View>
                <View style={[s.pro, s.proWatch]}>
                  <Text style={[s.proTitle, { color: amber }]}>{vi ? "Còn căng" : "Still tense"}</Text>
                  <Text style={s.proText}>{pair.tension}</Text>
                </View>
              </View>
            );
          })}
          {!(map.name && rows.length > 1) ? (
            <Text style={s.hint}>
              {vi
                ? "Số linh hồn và số biểu đạt chỉ được so khi cả hai người có họ tên khai sinh."
                : "Soul urge and expression are compared only when both people have a birth name."}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** "Lời nhắn riêng": a visible "Sắp có" card. No AI call is made from the app yet. */
export function PrivateMessageSoon({ language }: { language: Language }) {
  const text = privateMessageCard(language);
  return (
    <View testID="private-message-card" accessible accessibilityLabel={`${text.title}, ${text.soon}. ${text.body} ${text.sends}`} style={s.soonCard}>
      <View style={s.soonHead}>
        <Text style={s.soonTitle}>{text.title}</Text>
        <Text testID="private-message-soon" style={s.soonBadge}>{text.soon}</Text>
      </View>
      <Text style={s.panelBody}>{text.body}</Text>
      <Text style={s.hint}>{text.sends}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: 12 },
  section: { marginTop: 12, gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: "center" },
  kicker: { color: teal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5 },
  h2: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 26, lineHeight: 31 },
  hint: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 19 },
  labelRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 8 },
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  optional: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 12 },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", paddingHorizontal: 16, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 17, backgroundColor: "#171517" },
  privacy: { padding: 12, borderRadius: 12, backgroundColor: "rgba(159, 211, 207, 0.1)", flexDirection: "row", gap: 10, alignItems: "flex-start" },
  privacyIcon: { marginTop: 1 },
  privacyText: { flex: 1, color: body, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 19 },
  primary: { minHeight: 54, borderRadius: 27, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, textAlign: "center" },
  disabled: { opacity: 0.45 },
  panel: { padding: 16, borderRadius: 16, backgroundColor: card, gap: 10 },
  panelKicker: { color: rose, fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 17 },
  panelBody: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
  bold: { fontFamily: typography.bodySemiBoldFontFamily },
  pairRow: { flexDirection: "row", gap: 12 },
  who: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 12 },
  number: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 38 },
  pro: { padding: 12, borderRadius: 12, backgroundColor: "rgba(127, 181, 167, 0.12)", gap: 4 },
  proWatch: { backgroundColor: "rgba(217, 160, 102, 0.12)" },
  proTitle: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 0.6 },
  proText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 20 },
  soonCard: { marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201, 164, 92, 0.5)", gap: 8 },
  soonHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  soonTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 27, flexShrink: 1 },
  soonBadge: { color: colors.charcoal, backgroundColor: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11.5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: "hidden" }
});
