// The messages ai-persona-chat sends to the model, moved out of index.ts so they can be tested (Owner request 14/11,
// ai_context_configs). With no context policy, or every block on at its cap, the output is byte-identical to the
// code before this change (golden fixtures in _shared/testdata/context-config-golden.json).
// Locked whatever the policy says: the current message is always last and is the router's safetyText; user values
// stay in the labelled data block; the handoff block never carries birth date or place.
import { handoffContextBlock } from "../_shared/chat-handoff.ts";
import { personaUserDataBlock } from "../_shared/persona-prompt-assembler.ts";
import { blockEnabled, blockLimit, type ContextPolicy, userDataPolicy } from "../_shared/context-config.ts";

export const PERSONA_HISTORY_TURNS = 8;
export const PERSONA_HISTORY_CHARS = 800;
/** Upper bounds a model tier may raise history to (packages/agent-config/persona-model-tiers.json bounds). */
export const TIER_HISTORY_TURNS_MAX = 12;
export const TIER_HISTORY_CHARS_MAX = 2500;

export type PersonaHistoryInput = Array<{ role?: "user" | "guide" | string; text?: string }> | undefined | null;
export type ModelMessage = { role: "user" | "assistant"; content: string };

const cap = (value: number | undefined, max: number, min: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : max;

/**
 * Last 8 turns (or fewer), 800 characters each (or fewer); the last user turn is dropped when it repeats the message.
 * A model tier may raise the ceiling (maxTurns/maxChars, deep_knowledge: 12 x 2,500); without one the caps are today's.
 */
export function sanitizeHistory(
  history: PersonaHistoryInput,
  currentText: string,
  limits: { turns?: number; chars?: number; maxTurns?: number; maxChars?: number } = {}
): ModelMessage[] {
  if (!Array.isArray(history)) return [];
  const maxTurns = cap(limits.maxTurns, TIER_HISTORY_TURNS_MAX, PERSONA_HISTORY_TURNS);
  const maxChars = cap(limits.maxChars, TIER_HISTORY_CHARS_MAX, PERSONA_HISTORY_CHARS);
  const turns = cap(limits.turns, limits.maxTurns === undefined ? PERSONA_HISTORY_TURNS : maxTurns, 0);
  const chars = cap(limits.chars, limits.maxChars === undefined ? PERSONA_HISTORY_CHARS : maxChars, 1);
  // slice(-0) would return the whole array.
  if (turns === 0) return [];
  return history
    .slice(-turns)
    .map((turn) => {
      const normalized = typeof turn?.text === "string" ? turn.text.replace(/\s+/g, " ").trim() : "";
      const content = normalized.slice(0, chars);
      const role = turn?.role === "guide" ? "assistant" as const : "user" as const;
      // Whether this turn repeats the message is judged at today's 800-character cut, not at a shortened one: with
      // a lower limit the app's copy of the current message would otherwise survive as a truncated duplicate.
      return content ? { role, content, repeatsMessage: role === "user" && normalized.slice(0, PERSONA_HISTORY_CHARS) === currentText } : null;
    })
    .filter((turn): turn is ModelMessage & { repeatsMessage: boolean } => Boolean(turn))
    .filter((turn, index, turns) => !(index === turns.length - 1 && turn.role === "user" && (turn.content === currentText || turn.repeatsMessage)))
    .map(({ role, content }) => ({ role, content }));
}

/** Tier caps, unless Admin narrowed history below today's 8 x 800 (then the narrower value stays). */
export function historyLimits(
  adminLimits: { turns?: number; chars?: number },
  tierHistory?: { turns: number; chars: number } | null
): { turns?: number; chars?: number; maxTurns?: number; maxChars?: number } {
  if (!tierHistory) return adminLimits;
  const narrowedTurns = typeof adminLimits.turns === "number" && adminLimits.turns < PERSONA_HISTORY_TURNS;
  const narrowedChars = typeof adminLimits.chars === "number" && adminLimits.chars < PERSONA_HISTORY_CHARS;
  const maxTurns = Math.min(TIER_HISTORY_TURNS_MAX, Math.max(PERSONA_HISTORY_TURNS, tierHistory.turns));
  const maxChars = Math.min(TIER_HISTORY_CHARS_MAX, Math.max(PERSONA_HISTORY_CHARS, tierHistory.chars));
  return {
    turns: narrowedTurns ? adminLimits.turns : tierHistory.turns,
    chars: narrowedChars ? adminLimits.chars : tierHistory.chars,
    maxTurns,
    maxChars
  };
}

export function personaModelMessages(input: {
  language: string;
  text: string;
  history: PersonaHistoryInput;
  userContext?: { goals?: unknown; tone?: unknown; nickname?: unknown; handoffContext?: unknown } | null;
  policy?: ContextPolicy;
  now?: Date;
  /** Model tier history caps (persona-model-tiers.ts). An Admin context config that narrowed history still wins. */
  tierHistory?: { turns: number; chars: number } | null;
}): ModelMessage[] {
  const policy = input.policy;
  const lang = input.language === "vi" ? "vi" : "en";
  const adminLimits = policy ? { turns: blockLimit(policy, "history", "turns"), chars: blockLimit(policy, "history", "chars") } : {};
  const history = !policy || blockEnabled(policy, "history")
    ? sanitizeHistory(input.history, input.text, historyLimits(adminLimits, input.tierHistory))
    : [];
  // Analysis CH-06: context brought from Tarot or Astrology rides with each turn as a labelled block.
  const handoff = !policy || blockEnabled(policy, "handoff")
    ? handoffContextBlock(input.userContext?.handoffContext, lang, policy
      ? { questionChars: blockLimit(policy, "handoff", "questionChars"), summaryChars: blockLimit(policy, "handoff", "summaryChars") }
      : {})
    : null;
  // E3 / AI-05: nickname, goals, tone and local time ride in the labelled data block, never in the system prompt.
  const dataBlock = personaUserDataBlock(input.language, input.userContext ?? undefined, input.now, policy ? userDataPolicy(policy) : undefined);
  return [...history, { role: "user", content: [dataBlock, handoff, input.text].filter(Boolean).join("\n\n") }];
}
