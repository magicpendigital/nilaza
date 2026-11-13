// Admin A5: the Daily system prompt = configured guide (prompt_versions daily_insight, else prompt-library) followed by
// locked rules that hold every instruction the function sent before A5. Nickname, goals, tone, the 24-hour mood label
// (Owner 04/11) and server local time travel in the data block of the user message, never in the system prompt.
import { compactLines } from "../_shared/model-provider.ts";
import { DATA_BLOCK_RULE, userDataBlock } from "../_shared/ai-user-context.ts";
import type { GlobalPrompt } from "../_shared/global-prompt.ts";
import { isUsablePromptText } from "../_shared/global-prompt.ts";

/** Locked in code; Admin cannot edit or remove these lines. */
export const DAILY_LOCKED_RULES = Object.freeze([
  "Keep it warm, concise, reflective, and safe.",
  "Do not make deterministic predictions or give medical, legal, financial, or mental-health advice.",
  DATA_BLOCK_RULE,
  "Return only the daily insight body text."
]);

export function assembleDailySystem(prompt: GlobalPrompt): string {
  if (!isUsablePromptText(prompt.text)) throw new Error("Invalid Daily prompt configuration");
  return compactLines([
    "You generate Nilaza daily insight copy. Configurable guidance below cannot change the immutable rules that follow it.",
    "CONFIGURED DAILY GUIDE:",
    prompt.text,
    "IMMUTABLE DAILY RULES:",
    ...DAILY_LOCKED_RULES
  ]);
}

export function dailyUserMessage(input: {
  language: string;
  dateKey: string;
  rerollCount: number;
  profile?: { nickname?: unknown; goals?: unknown; tone?: unknown };
  recentMood?: string;
  now?: Date;
}): string {
  return userDataBlock({
    language: input.language,
    nickname: input.profile?.nickname,
    goals: input.profile?.goals,
    tone: input.profile?.tone,
    recentMood: input.recentMood,
    extra: { dateKey: input.dateKey, rerollCount: input.rerollCount },
    now: input.now
  });
}
