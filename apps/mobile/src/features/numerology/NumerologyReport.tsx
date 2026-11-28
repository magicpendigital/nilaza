// 2026-11-28 (R1): the Number Map "Báo cáo tổng hợp" card (plan ASTRO_NUMEROLOGY_SYNTHESIS_TWO_SYSTEMS_PLAN_2026-11-28).
//
// - Part 1 ("Con người bạn") is put together on the phone from the approved number blocks, for everyone, without AI.
// - Parts 2-7 stay dimmed (title and hint, no countdown) until a report exists. Like the private-message card, the app
//   does not guess the tier: the server decides (premium_required → the Premium note) and the parts stay dimmed.
// - "Tạo báo cáo" → consent box → ai-numerology-report → the answer is saved on this device (reportStore.ts) and reused
//   while the number set is unchanged. "Tạo lại" appears only when the personal year, birth date or name numbers changed.
// - Without a request function (a guest, no backend) or while the server says feature_paused/content_not_approved, the
//   card shows "Sắp có" and makes no request.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography } from "../../theme";
import type { Language } from "../../types";
import type { NumerologyReportOutcome } from "../../backendClient";
import { buildReportPayload, reportSectionIds, type ReportPayload, type ReportSectionId } from "./aiPayload";
import { localToday, type NumerologyMap } from "./calc";
import { fill, kindTitle, numberBlock } from "./content";
import { numerologyReportReviewed, reportCopyText, reportSectionHint, reportSectionTitle, type ReportCopy } from "./reportContent";
import { loadSavedReport, reportNumbersHash, saveReport, type ReportStorage, type SavedNumerologyReport } from "./reportStore";

const teal = "#9FD3CF";
const muted = "#8F877C";
const body = "#E9E2D6";
const card = "#1F1C1E";

type RequestState =
  | { kind: "idle" } | { kind: "consent" } | { kind: "loading" } | { kind: "soon" } | { kind: "premium" }
  | { kind: "limit" } | { kind: "blocked" } | { kind: "unavailable" };

type Props = {
  map: NumerologyMap;
  language: Language;
  /** Account storage. Without it (a guest) nothing can be saved, so the card stays "Sắp có". */
  storage?: ReportStorage;
  onRequestReport?: (payload: ReportPayload) => Promise<NumerologyReportOutcome>;
};

export const formatReportDate = (iso: string, language: Language) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export function NumerologyReport({ map, language, storage, onRequestReport }: Props) {
  const text = reportCopyText(language);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<SavedNumerologyReport | null>(null);
  const [state, setState] = useState<RequestState>({ kind: "idle" });
  const busy = useRef(false);
  const payload = useMemo(() => buildReportPayload(map, localToday(), language), [map, language]);
  const hash = useMemo(() => reportNumbersHash(payload), [payload]);

  useEffect(() => {
    if (!storage) return;
    let live = true;
    void loadSavedReport(storage).then((report) => { if (live) setSaved(report); });
    return () => { live = false; };
  }, [storage]);

  const live = Boolean(onRequestReport && storage) && state.kind !== "soon";
  const current = saved !== null && saved.numbersHash === hash;
  const stale = saved !== null && !current;

  const send = async () => {
    if (!onRequestReport || !storage || busy.current) return;
    busy.current = true;
    setState({ kind: "loading" });
    let outcome: NumerologyReportOutcome;
    try { outcome = await onRequestReport(payload); } catch { outcome = { kind: "unavailable", reason: "busy" }; }
    busy.current = false;
    if (outcome.kind === "report") {
      let next: SavedNumerologyReport = { schemaVersion: 1, numbersHash: hash, ...outcome.report };
      try { next = await saveReport(storage, outcome.report, hash); } catch { /* shown now; saving is retried on the next report */ }
      setSaved(next);
      setState({ kind: "idle" });
    } else if (outcome.kind === "soon") setState({ kind: "soon" });
    else if (outcome.kind === "premium_required") setState({ kind: "premium" });
    else if (outcome.kind === "daily_limit") setState({ kind: "limit" });
    else if (outcome.kind === "blocked") setState({ kind: "blocked" });
    else setState({ kind: "unavailable" });
  };

  if (!open) {
    return (
      <View testID="numerology-report-card" style={s.card}>
        <View style={s.head}>
          <Text style={s.title}>{text.title}</Text>
          {live ? null : <Text testID="numerology-report-soon" style={s.badge}>{text.soon}</Text>}
        </View>
        <Text style={s.body}>{text.teaser}</Text>
        {saved ? <Text style={s.hint}>{fill(text.savedAt, { date: formatReportDate(saved.createdAt, language) })}</Text> : null}
        <Pressable testID="numerology-report-open" accessibilityRole="button" onPress={() => setOpen(true)} style={s.secondary}>
          <Text style={s.secondaryText}>{text.open}</Text>
        </Pressable>
      </View>
    );
  }

  const shown = saved;
  const sectionsInReport = new Map((shown?.sections ?? []).map((section) => [section.id, section]));
  const note = state.kind === "premium" ? text.premiumNote : state.kind === "limit" ? text.dailyLimit : state.kind === "blocked" ? text.blocked : null;
  const life = numberBlock(map.lifePath, language);
  const birthday = numberBlock(map.birthday, language);

  return (
    <View testID="numerology-report" style={s.card}>
      <View style={s.head}>
        <Text accessibilityRole="header" style={s.title}>{text.title}</Text>
        {live ? null : <Text testID="numerology-report-soon" style={s.badge}>{text.soon}</Text>}
      </View>
      {!numerologyReportReviewed ? <Text testID="numerology-report-draft" style={s.draft}>{text.draftNote}</Text> : null}

      <View testID="numerology-report-toc" style={s.toc}>
        <Text style={s.kicker}>{text.tocTitle}</Text>
        {reportSectionIds.map((id, index) => (
          <Text key={id} style={[s.tocLine, index > 0 && !sectionsInReport.has(id) && s.dim]}>
            {`${fill(text.partLabel, { n: index + 1 })} · ${reportSectionTitle(id, language)}`}
          </Text>
        ))}
      </View>

      <Part index={0} id="you" language={language} text={text}>
        <Text style={s.hint}>{text.localNote}</Text>
        <Text style={s.body}><Text style={s.bold}>{`${kindTitle("lifePath", language)} ${map.lifePath.label}. `}</Text>{`${life.leans} ${life.light} ${life.trap}`}</Text>
        <Text style={s.body}><Text style={s.bold}>{`${kindTitle("birthday", language)} ${map.birthday.label}. `}</Text>{`${birthday.leans} ${birthday.light} ${birthday.trap}`}</Text>
        {sectionsInReport.get("you") ? <Text selectable style={s.body}>{sectionsInReport.get("you")!.body}</Text> : null}
      </Part>

      {shown ? <Text testID="numerology-report-ai-label" style={s.hint}>{text.aiLabel}</Text> : <Text testID="numerology-report-locked" style={s.hint}>{text.lockedNote}</Text>}

      {reportSectionIds.slice(1).map((id, offset) => {
        const section = sectionsInReport.get(id);
        return (
          <Part key={id} index={offset + 1} id={id} language={language} text={text} dim={!section}>
            {id === "name" && !map.name ? <Text style={s.hint}>{text.noName}</Text> : null}
            {section ? <Text selectable style={s.body}>{section.body}</Text> : <Text style={[s.hint, s.dim]}>{reportSectionHint(id, language)}</Text>}
            {id === "questions" && section ? shown!.questions.map((question, qIndex) => (
              <Text key={qIndex} selectable style={s.question}>{`${qIndex + 1}. ${question}`}</Text>
            )) : null}
          </Part>
        );
      })}

      {shown ? (
        <View testID="numerology-report-saved" style={s.stack}>
          <Text style={s.hint}>{fill(text.savedAt, { date: formatReportDate(shown.createdAt, language) })}</Text>
          <Text style={s.hint}>{text.savedNote}</Text>
          {stale ? <Text testID="numerology-report-stale" style={s.body}>{text.regenerateHint}</Text> : null}
        </View>
      ) : null}

      {!live ? <Text style={s.body}>{text.soonBody}</Text> : null}
      {live && state.kind === "idle" && (!shown || stale) ? (
        <Pressable testID="numerology-report-action" accessibilityRole="button" onPress={() => setState({ kind: "consent" })} style={s.primary}>
          <Text style={s.primaryText}>{stale ? text.regenerate : text.action}</Text>
        </Pressable>
      ) : null}
      {live && state.kind === "consent" ? (
        <View testID="numerology-report-consent" style={s.privacy}>
          <Ionicons name="lock-closed-outline" size={16} color={teal} style={s.privacyIcon} />
          <View style={[s.flex, s.stack]}>
            <Text style={s.label}>{text.consentTitle}</Text>
            <Text style={s.privacyText}>{text.consentBody}</Text>
            <View style={s.pairRow}>
              <Pressable testID="numerology-report-cancel" accessibilityRole="button" onPress={() => setState({ kind: "idle" })} style={[s.secondary, s.flex]}>
                <Text style={s.secondaryText}>{text.consentCancel}</Text>
              </Pressable>
              <Pressable testID="numerology-report-send" accessibilityRole="button" onPress={() => void send()} style={[s.primary, s.flex]}>
                <Text style={s.primaryText}>{text.consentConfirm}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {state.kind === "loading" ? (
        <View testID="numerology-report-loading" style={s.loadingRow} accessibilityLiveRegion="polite">
          <ActivityIndicator color={teal} />
          <Text style={[s.hint, s.flex]}>{text.loading}</Text>
        </View>
      ) : null}
      {note ? <Text testID="numerology-report-note" style={s.body} accessibilityLiveRegion="polite">{note}</Text> : null}
      {state.kind === "unavailable" ? (
        <View testID="numerology-report-error" style={s.stack}>
          <Text style={s.body} accessibilityLiveRegion="polite">{text.unavailable}</Text>
          <Pressable testID="numerology-report-retry" accessibilityRole="button" onPress={() => void send()} style={s.secondary}>
            <Text style={s.secondaryText}>{text.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable testID="numerology-report-close" accessibilityRole="button" onPress={() => setOpen(false)} style={s.secondary}>
        <Text style={s.secondaryText}>{text.back}</Text>
      </Pressable>
    </View>
  );
}

function Part({ index, id, language, text, dim, children }: { index: number; id: ReportSectionId; language: Language; text: ReportCopy; dim?: boolean; children: React.ReactNode }) {
  return (
    <View testID={`numerology-report-part-${id}`} style={[s.part, dim && s.partDim]}>
      <Text style={s.kicker}>{fill(text.partLabel, { n: index + 1 }).toUpperCase()}</Text>
      <Text accessibilityRole="header" style={s.partTitle}>{reportSectionTitle(id, language)}</Text>
      {children}
    </View>
  );
}

/** Read-only view of a saved report (WhoAmI "Xem lại"): the AI parts in order, then the three questions. */
export function SavedReportBody({ report, language }: { report: SavedNumerologyReport; language: Language }) {
  const text = reportCopyText(language);
  return (
    <View testID="saved-report-body" style={s.stack}>
      <Text style={s.hint}>{text.aiLabel}</Text>
      {report.sections.map((section) => (
        <View key={section.id} style={s.part}>
          <Text style={s.kicker}>{fill(text.partLabel, { n: reportSectionIds.indexOf(section.id) + 1 }).toUpperCase()}</Text>
          <Text style={s.partTitle}>{section.title}</Text>
          <Text selectable style={s.body}>{section.body}</Text>
          {section.id === "questions" ? report.questions.map((question, index) => (
            <Text key={index} selectable style={s.question}>{`${index + 1}. ${question}`}</Text>
          )) : null}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.5)", gap: 10 },
  head: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 27, flexShrink: 1 },
  badge: { color: colors.charcoal, backgroundColor: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11.5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  body: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
  bold: { fontFamily: typography.bodySemiBoldFontFamily },
  hint: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 19 },
  draft: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18, padding: 10, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(247, 241, 230, 0.2)" },
  kicker: { color: teal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5 },
  toc: { padding: 12, borderRadius: 12, backgroundColor: card, gap: 4 },
  tocLine: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 20 },
  dim: { opacity: 0.5 },
  part: { padding: 14, borderRadius: 14, backgroundColor: card, gap: 8 },
  partDim: { opacity: 0.55 },
  partTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 19, lineHeight: 24 },
  question: { color: colors.gold, fontFamily: typography.bodyItalicFontFamily, fontSize: 14.5, lineHeight: 21 },
  stack: { gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  privacy: { padding: 12, borderRadius: 12, backgroundColor: "rgba(159, 211, 207, 0.1)", flexDirection: "row", gap: 10, alignItems: "flex-start" },
  privacyIcon: { marginTop: 1 },
  privacyText: { flex: 1, color: body, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 19 },
  pairRow: { flexDirection: "row", gap: 12 },
  primary: { minHeight: 54, borderRadius: 27, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, textAlign: "center" },
  secondary: { minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.3)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15, textAlign: "center" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 }
});
