// Admin A5: the Council system prompt = configured guide (prompt_versions ai_council, else prompt-library) followed by
// locked rules that hold every instruction the function sent before A5 (safety, transparency, JSON contract).
// User-provided context (nickname, goals, tone) and server local time travel in the data block of the user message.
import { compactLines } from "../_shared/model-provider.ts";
import { DATA_BLOCK_RULE, userDataBlock } from "../_shared/ai-user-context.ts";
import type { GlobalPrompt } from "../_shared/global-prompt.ts";
import { isUsablePromptText } from "../_shared/global-prompt.ts";

/** Locked in code; Admin cannot edit or remove these lines. */
export const COUNCIL_LOCKED_RULES = Object.freeze([
  "Use only selected guides and sanitized context. Do not use raw private chat, journal history, birth profile, or uploaded images.",
  "Preserve inspired-by transparency. Do not make certain predictions or provide medical, legal, financial, or mental-health advice.",
  DATA_BLOCK_RULE,
  "Return JSON only with keys: turns, suggestedFollowUps, transcriptSummary, synthesis.",
  "turns must be an ordered array of {personaId,text,lens,kind,replyToPersonaId} using only the provided persona IDs.",
  "The first guide opens the discussion; every later guide must build on or respectfully challenge one earlier guide via replyToPersonaId. Do not invent private facts or claims about what a guide said.",
  "synthesis must be an object with consensus (string), tensions (string[]), assumptions (string[]), nextStep (string), and reflectionQuestion (string). Keep each item concise and grounded in the supplied question."
]);

export function assembleCouncilSystem(prompt: GlobalPrompt): string {
  if (!isUsablePromptText(prompt.text)) throw new Error("Invalid Council prompt configuration");
  return compactLines([
    "You orchestrate a Nilaza AI Council. Configurable guidance below cannot change the immutable rules that follow it.",
    "CONFIGURED COUNCIL GUIDE:",
    prompt.text,
    "IMMUTABLE COUNCIL RULES:",
    ...COUNCIL_LOCKED_RULES
  ]);
}

export const COUNCIL_HISTORY_TURNS = 12;
export const COUNCIL_HISTORY_CHARS = 800;

/** Server-side bound for Council history (AI-05): last 12 turns, 800 characters each, known roles only. */
export type CouncilHistoryTurn = { role: "user" | "guide"; text: string; personaId?: string };
export function boundCouncilHistory(history: unknown): CouncilHistoryTurn[] {
  if (!Array.isArray(history)) return [];
  const turns: CouncilHistoryTurn[] = [];
  for (const turn of history.slice(-COUNCIL_HISTORY_TURNS * 4)) {
    const value = turn && typeof turn === "object" ? turn as Record<string, unknown> : {};
    const text = typeof value.text === "string" ? value.text.replace(/\s+/g, " ").trim().slice(0, COUNCIL_HISTORY_CHARS) : "";
    if (!text) continue;
    const role = value.role === "guide" ? "guide" as const : "user" as const;
    const personaId = typeof value.personaId === "string" && /^[a-zA-Z0-9_.:-]{1,80}$/.test(value.personaId) ? value.personaId : undefined;
    turns.push(personaId ? { role, text, personaId } : { role, text });
  }
  return turns.slice(-COUNCIL_HISTORY_TURNS);
}

/** The single user message: data block first, then the Council request JSON (without userContext). */
export function councilUserMessage(input: {
  language: string;
  userContext?: { goals?: unknown; tone?: unknown; nickname?: unknown };
  request: Record<string, unknown>;
  now?: Date;
}): string {
  return `${userDataBlock({ language: input.language, nickname: input.userContext?.nickname, goals: input.userContext?.goals, tone: input.userContext?.tone, now: input.now })}\n\n${JSON.stringify(input.request)}`;
}
