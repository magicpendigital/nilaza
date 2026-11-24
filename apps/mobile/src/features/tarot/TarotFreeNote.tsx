import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { CrisisSupportCard } from "../safety/CrisisSupportCard";
import type { TarotNote, TarotNoteExperiment, TarotNoteOutcome } from "./tarotNote";

// Batch C (Owner approved 23/11/2026, artboards TarotFreeNote / TarotNoteStates): the free daily note sits right under
// "Tóm lại". It only ever shows text the AI wrote for this draw; every other state says plainly what happened.

export type TarotNoteViewState =
  | { kind: "writing" }
  | { kind: "note"; note: TarotNote; experiment: TarotNoteExperiment }
  | { kind: "guest" }
  | { kind: "used_today" }
  | { kind: "attempts_today" }
  | { kind: "blocked" }
  /** An opened saved reading: nothing is requested until the person taps "Xem lời nhắn". */
  | { kind: "saved" }
  | { kind: "crisis" }
  | { kind: "error"; reason: "offline" | "busy" | "auth" };

export type TarotNoteFeedback = "yes" | "no";

// One request per draw for this app session: a remount (leaving and coming back) shows the same answer, not a new call.
const settled = new Map<string, TarotNoteOutcome>();
const inFlight = new Map<string, Promise<TarotNoteOutcome>>();

/** Test helper: forget cached answers. */
export function resetTarotNoteCache() {
  settled.clear();
  inFlight.clear();
}

function toView(outcome: TarotNoteOutcome): TarotNoteViewState {
  switch (outcome.kind) {
    case "note": return { kind: "note", note: outcome.note, experiment: outcome.experiment };
    case "used_today": return { kind: "used_today" };
    case "attempts_today": return { kind: "attempts_today" };
    case "blocked": return { kind: "blocked" };
    case "crisis": return { kind: "crisis" };
    case "unavailable": return { kind: "error", reason: outcome.reason };
    default: return { kind: "error", reason: "busy" };
  }
}

/**
 * Asks once after the reveal of a draw made in this session (auto = true) for a signed-in server draw. A saved reading
 * that is only opened again (auto = false) asks nothing until `reveal()` (the "Xem lời nhắn" button). Guests get the
 * sign-in invite; a local draw without a drawId shows nothing (null). Errors are not cached, so "Thử lại" asks again.
 */
export function useTarotFreeNote({ drawId, signedIn, request, auto = true }: {
  drawId?: string;
  signedIn: boolean;
  request: (drawId: string) => Promise<TarotNoteOutcome>;
  auto?: boolean;
}): { state: TarotNoteViewState | null; retry: () => void; reveal: () => void } {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [state, setState] = useState<TarotNoteViewState | null>(() => {
    if (!signedIn) return { kind: "guest" };
    if (!drawId) return null;
    const cached = settled.get(drawId);
    return cached ? toView(cached) : auto ? { kind: "writing" } : { kind: "saved" };
  });
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef(request);
  requestRef.current = request;

  useEffect(() => {
    if (!signedIn) { setState({ kind: "guest" }); return; }
    if (!drawId) { setState(null); return; }
    const cached = settled.get(drawId);
    if (cached) { setState(toView(cached)); return; }
    if (!auto && revealed !== drawId) { setState({ kind: "saved" }); return; }
    let alive = true;
    setState({ kind: "writing" });
    let pending = inFlight.get(drawId);
    if (!pending) {
      pending = requestRef.current(drawId).catch((): TarotNoteOutcome => ({ kind: "unavailable", reason: "busy" }));
      inFlight.set(drawId, pending);
    }
    void pending.then((outcome) => {
      inFlight.delete(drawId);
      if (outcome.kind !== "unavailable" && outcome.kind !== "in_progress") settled.set(drawId, outcome);
      if (alive) setState(toView(outcome));
    });
    return () => { alive = false; };
  }, [drawId, signedIn, attempt, auto, revealed]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const reveal = useCallback(() => setRevealed(drawId ?? null), [drawId]);
  return { state, retry, reveal };
}

export type TarotFreeNoteProps = {
  language: Language;
  state: TarotNoteViewState;
  reduceMotion?: boolean;
  onRetry: () => void;
  onReveal?: () => void;
  onSignIn?: () => void;
  onFeedback?: (value: TarotNoteFeedback) => void;
};

export function TarotFreeNote({ language, state, reduceMotion = false, onRetry, onReveal, onSignIn, onFeedback }: TarotFreeNoteProps) {
  const vi = language === "vi";
  const [feedback, setFeedback] = useState<TarotNoteFeedback | null>(null);

  if (state.kind === "crisis") return <CrisisSupportCard language={language} />;

  const label = vi ? "LỜI NHẮN RIÊNG CHO BẠN" : "A NOTE JUST FOR YOU";
  const badge = vi ? "MIỄN PHÍ HÔM NAY" : "FREE TODAY";

  return (
    <View style={s.box} accessibilityLabel={vi ? "Lời nhắn riêng cho bạn" : "A note just for you"}>
      <View style={s.head}>
        <Text style={s.label} accessibilityRole="header">{label}</Text>
        {state.kind === "note" || state.kind === "writing" ? <Text style={s.badge}>{badge}</Text> : null}
      </View>

      {state.kind === "writing" ? <NoteSkeleton language={language} reduceMotion={reduceMotion} /> : null}

      {state.kind === "note" ? (
        <>
          {state.note.need ? <Text style={s.need}>{state.note.need}</Text> : null}
          {state.note.text.split(/\n{2,}|\r\n\r\n/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph, index) => (
            <Text key={`p-${index}`} style={s.paragraph}>{paragraph}</Text>
          ))}
          {state.note.askThem ? <Text style={s.askThem}>{state.note.askThem}</Text> : null}
          <Text style={s.footnote}>{vi ? "AI viết riêng cho câu hỏi này · gợi ý để soi chiếu, không phải lời phán" : "Written by AI for this question · a prompt to reflect, not a verdict"}</Text>
          {feedback ? (
            <Text accessibilityLiveRegion="polite" style={s.thanks}>{vi ? "Cảm ơn bạn. Nilaza sẽ dùng phản hồi này để viết sát hơn." : "Thank you. Nilaza will use this to write closer to you."}</Text>
          ) : (
            <View style={s.feedbackRow}>
              <Text style={s.feedbackQuestion}>{vi ? "Có nói đúng điều bạn đang nghĩ?" : "Did it say what you were thinking?"}</Text>
              <View style={s.feedbackButtons}>
                {(["yes", "no"] as const).map((value) => (
                  <Pressable key={value} accessibilityRole="button" onPress={() => { setFeedback(value); onFeedback?.(value); }} style={s.feedbackButton}>
                    <Text style={s.feedbackText}>{value === "yes" ? (vi ? "Đúng" : "Yes") : (vi ? "Chưa" : "Not quite")}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </>
      ) : null}

      {state.kind === "guest" ? (
        <>
          <Text style={s.paragraph}>{vi ? "Mỗi ngày một lời nhắn viết riêng cho câu bạn hỏi." : "Every day, one note written for the question you ask."}</Text>
          {onSignIn ? (
            <Pressable accessibilityRole="button" onPress={onSignIn} style={s.primary}>
              <Text style={s.primaryText}>{vi ? "Đăng nhập để nhận lời nhắn" : "Sign in to get your note"}</Text>
            </Pressable>
          ) : null}
          <Text style={s.footnote}>{vi ? "Trải bài này vẫn được giữ nguyên." : "This spread stays as it is."}</Text>
        </>
      ) : null}

      {state.kind === "used_today" ? (
        <Text style={s.paragraph}>{vi
          ? "Lời nhắn mới có lại vào ngày mai. Bài đọc Nilaza ở trên vẫn đầy đủ cho trải bài này."
          : "A new note comes back tomorrow. Nilaza's reading above is still complete for this spread."}</Text>
      ) : null}

      {state.kind === "attempts_today" ? (
        <Text accessibilityLiveRegion="polite" style={s.paragraph}>{vi
          ? "Hôm nay Nilaza chưa viết được lời nhắn sau vài lần thử. Bạn thử lại vào ngày mai nhé."
          : "Nilaza could not write the note after a few tries today. Please try again tomorrow."}</Text>
      ) : null}

      {state.kind === "blocked" ? (
        <Text accessibilityLiveRegion="polite" style={s.paragraph}>{vi
          ? "Nilaza không viết lời nhắn cho câu hỏi này. Bài đọc ở trên vẫn đầy đủ."
          : "Nilaza does not write a note for this question. The reading above is still complete."}</Text>
      ) : null}

      {state.kind === "saved" ? (
        <Pressable accessibilityRole="button" onPress={onReveal} style={s.secondary}>
          <Text style={s.secondaryText}>{vi ? "Xem lời nhắn" : "Show note"}</Text>
        </Pressable>
      ) : null}

      {state.kind === "error" ? (
        <>
          <Text accessibilityLiveRegion="polite" style={s.paragraph}>{state.reason === "offline"
            ? (vi ? "Bạn đang ngoại tuyến nên chưa viết được lời nhắn. Lượt hôm nay vẫn còn nguyên." : "You are offline, so the note could not be written. Today's note is still yours.")
            : (vi ? "Chưa viết được lời nhắn lúc này. Lượt hôm nay vẫn còn nguyên." : "The note could not be written right now. Today's note is still yours.")}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={s.secondary}>
            <Text style={s.secondaryText}>{vi ? "Thử lại" : "Try again"}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function NoteSkeleton({ language, reduceMotion }: { language: Language; reduceMotion: boolean }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} style={s.skeleton}>
      {[0.6, 1, 0.9, 0.75].map((width, index) => (
        <Animated.View key={`line-${index}`} style={[s.skeletonLine, { width: `${width * 100}%`, opacity: reduceMotion ? 0.6 : pulse }]} />
      ))}
      <Text accessibilityLiveRegion="polite" style={s.writing}>{language === "vi" ? "Nilaza đang đọc các lá cùng câu hỏi của bạn…" : "Nilaza is reading the cards with your question…"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginTop: 16, padding: 16, gap: 10, borderRadius: radius.card, backgroundColor: "#1F1B17", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.35)" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  label: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 1.2 },
  badge: { color: colors.ink, backgroundColor: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  need: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 21, lineHeight: 28 },
  paragraph: { color: "#E3DCCF", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 23 },
  askThem: { color: colors.ivory, fontFamily: typography.bodyItalicFontFamily, fontSize: 15, lineHeight: 23 },
  footnote: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  feedbackRow: { gap: 8, borderTopWidth: 1, borderTopColor: "rgba(247, 241, 230, 0.1)", paddingTop: 10 },
  feedbackQuestion: { color: "#D8D0C4", fontFamily: typography.bodyMediumFontFamily, fontSize: 14 },
  feedbackButtons: { flexDirection: "row", gap: 10 },
  feedbackButton: { minHeight: 44, minWidth: 88, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.3)", alignItems: "center", justifyContent: "center" },
  feedbackText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  thanks: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 20 },
  primary: { minHeight: 48, borderRadius: 999, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: colors.ink, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  secondary: { minHeight: 44, alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.3)", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  secondaryText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  skeleton: { gap: 8 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: "rgba(247, 241, 230, 0.14)" },
  writing: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 20, marginTop: 4 }
});
