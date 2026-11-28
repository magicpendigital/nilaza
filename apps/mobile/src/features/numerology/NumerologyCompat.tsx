import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography } from "../../theme";
import type { Language } from "../../types";
import { BirthDateFields } from "../astrology/BirthFields";
import { buildNumerologyMap, type NumerologyMap } from "./calc";
import { compareNumerology, type CompatRelation, type CompatRow } from "./compat";
import { fill, kindTitle, privateMessageCard, relationBadge, relationQuestion, relationshipExtra, relationshipFrame, relationshipLine, relationshipNeed, relationshipPair } from "./content";
import { cleanName, nameMaxLength } from "./store";
import type { NumerologyMessageOutcome } from "../../backendClient";

// Lô 5, lớp 4 "Hợp số" and the "Lời nhắn riêng · Sắp có" card.
//
// PRIVACY: the other person's birth date and name are another person's data. (The on-screen "only on this phone"
// notice was removed at the Owner's request on 26/11/2026; the behaviour described here is unchanged and tested.) They live ONLY in this component's
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

  return (
    <View testID="numerology-compat" style={s.stack}>
      <View style={s.section}>
        <Text style={s.kicker}>{vi ? "HỢP SỐ" : "TWO MAPS"}</Text>
        <Text accessibilityRole="header" style={s.h2}>{vi ? "Bạn và người ấy" : "You and someone close"}</Text>
        <Text style={s.hint}>{relationshipFrame(language)}</Text>
      </View>

      <View style={s.panel}>
        <BirthDateFields language={language} value={otherDate} onChange={(value) => { setOtherDate(value); setRows(null); }} label={vi ? "Ngày sinh người ấy (dương lịch)" : "Their birth date (Gregorian)"} />
        <View style={s.labelRow}>
          <Text style={s.label}>{vi ? "Họ tên khai sinh người ấy" : "Their birth name"}</Text>
          <Text style={s.optional}>{vi ? "Không bắt buộc" : "Optional"}</Text>
        </View>
        <TextInput
          accessibilityLabel={vi ? "Họ tên khai sinh người ấy" : "Their birth name"}
          value={otherName}
          onChangeText={(value) => { setOtherName(cleanName(value)); setRows(null); }}
          maxLength={nameMaxLength}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="off"
          placeholder={vi ? "Thêm tên để so cả số linh hồn và biểu đạt" : "Add a name to compare soul urge and expression too"}
          placeholderTextColor="#6E675F"
          style={s.input}
        />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={compare} style={[s.primary, !ready && s.disabled]}>
          <Text style={s.primaryText}>{vi ? "So hai bản đồ" : "Compare the two maps"}</Text>
        </Pressable>
        {!ready ? <Text style={[s.hint, s.center]}>{vi ? "Cần ngày sinh đúng của người ấy để so." : "Enter their valid birth date to compare."}</Text> : null}
      </View>

      {rows ? (
        <View testID="compat-results" style={s.stack}>
          <Duo rows={rows} language={language} />
          {rows.map((row) => <CompatCard key={row.kind} row={row} language={language} />)}
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

const relationOrder: CompatRelation[] = ["same", "sameParity", "differentParity"];
const relationColor: Record<CompatRelation, string> = { same: colors.gold, sameParity: teal, differentParity: rose };

/** Two circles (you, them) joined by the life-path relation, and a one-line count of the compared pairs. */
function Duo({ rows, language }: { rows: CompatRow[]; language: Language }) {
  const copy = relationshipExtra(language);
  const row = rows[0];
  const items = relationOrder
    .map((relation) => ({ relation, count: rows.filter((r) => r.relation === relation).length }))
    .filter((x) => x.count > 0)
    .map(({ relation, count }) => fill(copy.summaryItem, { count, badge: relationBadge(relation, language).toLocaleLowerCase(language) }))
    .join(", ");
  const tone = relationColor[row.relation];
  return (
    <View testID="compat-duo" style={s.duo}>
      <Text style={[s.who, s.center]}>{kindTitle("lifePath", language)}</Text>
      <View style={s.duoRow}>
        <Person label={copy.you} number={row.a.label} accent={colors.gold} />
        <View style={s.duoLink}>
          <View style={[s.duoLine, { backgroundColor: tone }]} />
          <Text testID="compat-duo-badge" style={[s.badge, { borderColor: tone, color: tone }]}>{relationBadge(row.relation, language)}</Text>
          <View style={[s.duoLine, { backgroundColor: tone }]} />
        </View>
        <Person label={copy.other} number={row.b.label} accent={rose} />
      </View>
      <Text style={[s.panelBody, s.center]}>{fill(copy.summary, { total: rows.length, items })}</Text>
    </View>
  );
}

function Person({ label, number, accent }: { label: string; number: string; accent: string }) {
  return (
    <View style={s.person} accessible accessibilityLabel={`${label}: ${number}`}>
      <View style={[s.circle, { borderColor: accent }]}>
        <Text style={[s.circleNumber, number.length > 2 && s.circleNumberSmall]}>{number}</Text>
      </View>
      <Text style={s.who}>{label}</Text>
    </View>
  );
}

function CompatCard({ row, language }: { row: CompatRow; language: Language }) {
  const vi = language === "vi";
  const copy = relationshipExtra(language);
  const pair = relationshipPair(row.relation, language);
  const title = kindTitle(row.kind, language);
  const tone = relationColor[row.relation];
  return (
    <View testID={`compat-${row.kind}`} style={[s.panel, s.cardAccent, { borderLeftColor: tone }]}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={[s.badge, { borderColor: tone, color: tone }]}>{relationBadge(row.relation, language)}</Text>
      </View>
      <View style={s.pairRow}>
        <View style={s.flex} accessible accessibilityLabel={`${copy.you}: ${title} ${row.a.label}`}>
          <Text style={s.who}>{copy.you}</Text>
          <Text style={s.number}>{row.a.label}</Text>
        </View>
        <View style={s.flex} accessible accessibilityLabel={`${copy.other}: ${title} ${row.b.label}`}>
          <Text style={s.who}>{copy.other}</Text>
          <Text style={s.number}>{row.b.label}</Text>
        </View>
      </View>
      <Text style={s.panelBody}><Text style={s.bold}>{`${copy.you} (${row.a.label}): `}</Text>{relationshipLine(row.a, language)}</Text>
      <Text style={s.panelBody}><Text style={s.bold}>{`${copy.other} (${row.b.label}): `}</Text>{relationshipLine(row.b, language)}</Text>
      <View style={s.needs}>
        <Text style={s.needsTitle}>{copy.needsTitle}</Text>
        <Text style={s.proText}>{relationshipNeed(row.a, language)}</Text>
        {row.a.root !== row.b.root ? <Text style={s.proText}>{relationshipNeed(row.b, language)}</Text> : null}
      </View>
      <View style={s.pro}>
        <Text style={[s.proTitle, { color: teal }]}>{vi ? "Điểm chung" : "Common ground"}</Text>
        <Text style={s.proText}>{pair.common}</Text>
      </View>
      <View style={[s.pro, s.proWatch]}>
        <Text style={[s.proTitle, { color: amber }]}>{vi ? "Còn căng" : "Still tense"}</Text>
        <Text style={s.proText}>{pair.tension}</Text>
      </View>
      <Text style={s.who}>{copy.questionTitle}</Text>
      <Text style={s.question}>{relationQuestion(row.relation, language)}</Text>
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
  question: { color: colors.gold, fontFamily: typography.bodyItalicFontFamily, fontSize: 14.5, lineHeight: 21 },
  cardAccent: { borderLeftWidth: 3 },
  cardHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 20, lineHeight: 25, flexShrink: 1 },
  badge: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, overflow: "hidden", textAlign: "center" },
  needs: { padding: 12, borderRadius: 12, backgroundColor: "rgba(231, 183, 190, 0.1)", gap: 6 },
  needsTitle: { color: rose, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 0.6 },
  duo: { padding: 18, borderRadius: 20, backgroundColor: card, gap: 12 },
  duoRow: { flexDirection: "row", alignItems: "center" },
  duoLink: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", marginBottom: 22 },
  duoLine: { flex: 1, height: 1, opacity: 0.6 },
  person: { alignItems: "center", gap: 6 },
  circle: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201, 164, 92, 0.08)" },
  circleNumber: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 36, lineHeight: 42 },
  circleNumberSmall: { fontSize: 24, lineHeight: 30 },
  soonCard: { marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201, 164, 92, 0.5)", gap: 8 },
  soonHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  soonTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 27, flexShrink: 1 },
  soonBadge: { color: colors.charcoal, backgroundColor: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11.5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: "hidden" }
});
