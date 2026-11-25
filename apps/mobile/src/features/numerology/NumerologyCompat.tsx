import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography } from "../../theme";
import type { Language } from "../../types";
import { BirthDateFields } from "../astrology/BirthFields";
import { buildNumerologyMap, type NumerologyMap } from "./calc";
import { compareNumerology, type CompatRow } from "./compat";
import { kindTitle, privateMessageCard, relationshipFrame, relationshipLine, relationshipPair, relationshipPrivacyNote } from "./content";
import { cleanName, nameMaxLength } from "./store";
import type { NumerologyMessageOutcome } from "../../backendClient";

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

type MessageState =
  | { kind: "idle" } | { kind: "consent" } | { kind: "loading" }
  | { kind: "message"; message: string } | { kind: "soon" } | { kind: "premium" } | { kind: "limit" } | { kind: "blocked" } | { kind: "unavailable" };

/**
 * "Lời nhắn riêng". Without onRequestMessage (a guest, or no backend) it is the "Sắp có" card and makes no request.
 * With it (a signed-in account), the button opens a consent box first; only after "Gửi" does the screen send the
 * computed numbers and block ids. While the server switch is off or the content is not approved the answer is "soon"
 * and the card goes back to "Sắp có". The message is shown once and kept nowhere.
 */
export function PrivateMessageSoon({ language, onRequestMessage }: { language: Language; onRequestMessage?: () => Promise<NumerologyMessageOutcome> }) {
  const text = privateMessageCard(language);
  const [state, setState] = useState<MessageState>({ kind: "idle" });
  const busy = useRef(false);
  const live = Boolean(onRequestMessage) && state.kind !== "soon";

  const send = async () => {
    if (!onRequestMessage || busy.current) return;
    busy.current = true;
    setState({ kind: "loading" });
    let outcome: NumerologyMessageOutcome;
    try { outcome = await onRequestMessage(); } catch { outcome = { kind: "unavailable", reason: "busy" }; }
    busy.current = false;
    if (outcome.kind === "message") setState({ kind: "message", message: outcome.message });
    else if (outcome.kind === "soon") setState({ kind: "soon" });
    else if (outcome.kind === "premium_required") setState({ kind: "premium" });
    else if (outcome.kind === "daily_limit") setState({ kind: "limit" });
    else if (outcome.kind === "blocked") setState({ kind: "blocked" });
    else setState({ kind: "unavailable" });
  };

  const note = state.kind === "premium" ? text.premiumNote : state.kind === "limit" ? text.dailyLimit : state.kind === "blocked" ? text.blocked : null;
  return (
    <View testID="private-message-card" style={s.soonCard}>
      <View style={s.soonHead} accessible accessibilityLabel={live ? text.title : `${text.title}, ${text.soon}`}>
        <Text style={s.soonTitle}>{text.title}</Text>
        {live ? null : <Text testID="private-message-soon" style={s.soonBadge}>{text.soon}</Text>}
      </View>
      {state.kind === "message" ? (
        <View testID="private-message-result" style={s.panel}>
          <Text style={s.panelKicker}>{text.resultTitle}</Text>
          <Text selectable style={s.panelBody}>{state.message}</Text>
        </View>
      ) : (
        <>
          <Text style={s.panelBody}>{text.body}</Text>
          <Text style={s.hint}>{text.sends}</Text>
        </>
      )}
      {live && state.kind === "idle" ? (
        <Pressable testID="private-message-action" accessibilityRole="button" onPress={() => setState({ kind: "consent" })} style={s.primary}>
          <Text style={s.primaryText}>{text.action}</Text>
        </Pressable>
      ) : null}
      {live && state.kind === "consent" ? (
        <View testID="private-message-consent" style={s.privacy}>
          <Ionicons name="lock-closed-outline" size={16} color={teal} style={s.privacyIcon} />
          <View style={[s.flex, s.stack]}>
            <Text style={s.label}>{text.consentTitle}</Text>
            <Text style={s.privacyText}>{text.consentBody}</Text>
            <View style={s.pairRow}>
              <Pressable testID="private-message-cancel" accessibilityRole="button" onPress={() => setState({ kind: "idle" })} style={[s.secondary, s.flex]}>
                <Text style={s.secondaryText}>{text.consentCancel}</Text>
              </Pressable>
              <Pressable testID="private-message-send" accessibilityRole="button" onPress={() => void send()} style={[s.primary, s.flex]}>
                <Text style={s.primaryText}>{text.consentConfirm}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {state.kind === "loading" ? (
        <View testID="private-message-loading" style={s.loadingRow} accessibilityLiveRegion="polite">
          <ActivityIndicator color={teal} />
          <Text style={s.hint}>{text.loading}</Text>
        </View>
      ) : null}
      {note ? <Text testID="private-message-note" style={s.panelBody} accessibilityLiveRegion="polite">{note}</Text> : null}
      {state.kind === "unavailable" ? (
        <View testID="private-message-error" style={s.stack}>
          <Text style={s.panelBody} accessibilityLiveRegion="polite">{text.unavailable}</Text>
          <Pressable testID="private-message-retry" accessibilityRole="button" onPress={() => void send()} style={s.secondary}>
            <Text style={s.secondaryText}>{text.retry}</Text>
          </Pressable>
        </View>
      ) : null}
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
  secondary: { minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.3)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15, textAlign: "center" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  soonCard: { marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201, 164, 92, 0.5)", gap: 8 },
  soonHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  soonTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 27, flexShrink: 1 },
  soonBadge: { color: colors.charcoal, backgroundColor: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11.5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: "hidden" }
});
