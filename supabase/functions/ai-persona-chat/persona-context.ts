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

export type PersonaHistoryInput = Array<{ role?: "user" | "guide" | string; text?: string }> | undefined | null;
export type ModelMessage = { role: "user" | "assistant"; content: string };

const cap = (value: number | undefined, max: number, min: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : max;

/** Last 8 turns (or fewer), 800 characters each (or fewer); the last user turn is dropped when it repeats the message. */
export function sanitizeHistory(
  history: PersonaHistoryInput,
  currentText: string,
  limits: { turns?: number; chars?: number } = {}
): ModelMessage[] {
  if (!Array.isArray(history)) return [];
  const turns = cap(limits.turns, PERSONA_HISTORY_TURNS, 0);
  const chars = cap(limits.chars, PERSONA_HISTORY_CHARS, 1);
  // slice(-0) would return the whole array.
  if (turns === 0) return [];
  return history
    .slice(-turns)
    .map((turn) => {
      const content = typeof turn?.text === "string" ? turn.text.replace(/\s+/g, " ").trim().slice(0, chars) : "";
      const role = turn?.role === "guide" ? "assistant" as const : "user" as const;
      return content ? { role, content } : null;
    })
    .filter((turn): turn is ModelMessage => Boolean(turn))
    .filter((turn, index, turns) => !(index === turns.length - 1 && turn.role === "user" && turn.content === currentText));
}

export function personaModelMessages(input: {
  language: string;
  text: string;
  history: PersonaHistoryInput;
  userContext?: { goals?: unknown; tone?: unknown; nickname?: unknown; handoffContext?: unknown } | null;
  policy?: ContextPolicy;
  now?: Date;
}): ModelMessage[] {
  const policy = input.policy;
  const lang = input.language === "vi" ? "vi" : "en";
  const history = !policy || blockEnabled(policy, "history")
    ? sanitizeHistory(input.history, input.text, policy ? { turns: blockLimit(policy, "history", "turns"), chars: blockLimit(policy, "history", "chars") } : {})
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
