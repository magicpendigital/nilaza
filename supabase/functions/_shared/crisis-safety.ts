import { oracleSafetyReply, oracleSafetySignal } from "../../../packages/ai-contracts/oracle-safety.mjs";

export type SafetyRedirect = {
  signal: "self_harm_signal" | "regulated_request";
  /** "crisis" lets the app show the 115 support card. */
  safety: "crisis" | "boundary";
  text: string;
};

/**
 * One safety check for persona chat and AI Council (Owner decision 2026-10-31), the same bounded
 * phrase policy as Oracle: accent-insensitive, word boundaries, and only the person's current
 * message, so an earlier message never blocks the rest of a session. It runs before the daily
 * allowance and the model call, so a safety reply never uses a turn.
 */
export function safetyRedirectFor(currentMessage: string, language: string): SafetyRedirect | null {
  const signal = oracleSafetySignal(currentMessage);
  if (!signal) return null;
  return { signal, safety: signal === "self_harm_signal" ? "crisis" : "boundary", text: oracleSafetyReply(language, signal) };
}
