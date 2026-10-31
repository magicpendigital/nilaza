export type OracleSafetySignal = "self_harm_signal" | "regulated_request" | null;
export type OracleRuntimeIntent = "reflect" | "tarot_handoff" | "persona_handoff" | "council_handoff" | "astrology_handoff" | "journal_handoff" | "safety_redirect";
export function normalizeOracleText(text: string): string;
export function oracleSafetySignal(value: string): OracleSafetySignal;
export function oracleIntent(value: string): OracleRuntimeIntent;
export function oracleSafetyReply(locale: "vi" | "en" | string, signal: OracleSafetySignal): string;
