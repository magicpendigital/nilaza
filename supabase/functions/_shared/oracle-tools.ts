// Oracle tool contract (oracle-ai-tools-2026-11-11). The model writes a short reply and may pick up to two
// tools from the enabled catalog; the server validates every tool and parameter before the app sees it.
import catalog from "../../../packages/agent-config/oracle-actions.json" with { type: "json" };

export type OracleToolKind = "reflect_here" | "draw_tarot" | "ask_guide" | "open_council" | "cast_astrology" | "save_journal";
export type OracleLocale = "vi" | "en";
export type OracleTool = {
  tool: OracleToolKind;
  question?: string;
  topic?: string;
  guide?: string;
  template?: string;
  focus?: string;
};
export type OracleToolOutput = { reply: string; tools: OracleTool[] };
export type OracleHandoff = {
  sourceType: "oracle";
  sourceId: string;
  userMessage: string;
  safeSummary: string;
  suggestedPersonaSlug: string;
  suggestedCouncilTemplateId: string;
  suggestedTarotTopic: string;
  suggestedTarotSpread: string;
  suggestedAstrologyFocus: string;
};

type CatalogAction = {
  id: string; kind: string; target: string; icon: string; enabled: boolean;
  label: { vi: string; en: string }; detail: { vi: string; en: string };
};

export const ORACLE_MAX_TOOLS = 2;
export const ORACLE_MAX_REPLY_CHARS = 700;
export const ORACLE_TOOL_CONTRACT_VERSION = "oracle-tools-2026-11-11";

/** Guides the model may suggest, with a short reason to pick each one. */
export const ORACLE_GUIDES: Record<string, string> = {
  "the-mystic": "Tarot and intuition",
  "the-love-oracle": "love, boundaries and self-respect",
  "inner-child-healer": "hurt feelings and self-care",
  "the-shadow-mirror": "avoided feelings and patterns",
  "the-clear-strategist": "decisions and consequences",
  "the-star-weaver": "dreams, identity and direction",
  "the-astrologer": "timing and the sky",
  "communication-mentor": "what to say and how",
  "calm-living-mentor": "calm and daily balance",
  "aristotle": "reason and practical virtue",
  "laozi": "slowing down and letting go",
  "marcus-aurelius": "calm under pressure"
};
export const ORACLE_COUNCIL_TEMPLATES = ["love_confusion", "career_fog", "overthinking", "big_decision"] as const;
export const ORACLE_TAROT_TOPICS = ["love", "career", "self", "decision"] as const;
export const ORACLE_ASTROLOGY_FOCUS = ["love", "career", "soul"] as const;

const actions = (catalog as { actions: CatalogAction[] }).actions;
const KINDS = new Set<OracleToolKind>(["reflect_here", "draw_tarot", "ask_guide", "open_council", "cast_astrology", "save_journal"]);

export function enabledOracleTools(): CatalogAction[] {
  return actions.filter(action => action.enabled && KINDS.has(action.kind as OracleToolKind));
}

/**
 * Placed before the pinned Oracle bundle. It overrides the bundle line saying the application handles
 * action cards: in this version Oracle picks them. oracleToolReminder repeats the format after the bundle.
 */
export function oracleToolInstructions(locale: OracleLocale): string {
  const tools = enabledOracleTools().map(action => `- ${action.kind}: ${action.detail.en}`).join("\n");
  const guides = Object.entries(ORACLE_GUIDES).map(([slug, about]) => `${slug} (${about})`).join(", ");
  return [
    `[tools: ${ORACLE_TOOL_CONTRACT_VERSION}]`,
    "This section overrides any later line saying that the application classifies intent or chooses action cards: in this version you choose which next steps to offer, and the application only validates and displays them.",
    "Offer a tool only when it clearly helps with the current message; many replies need none. Never offer more than two.",
    "Available tools:",
    tools,
    "Optional parameters: draw_tarot may carry \"question\" (the user's question rephrased in at most 140 characters) and \"topic\" (one of love, career, self, decision); ask_guide carries \"guide\" (one of: " + guides + "); open_council may carry \"template\" (one of love_confusion, career_fog, overthinking, big_decision); cast_astrology may carry \"focus\" (one of love, career, soul).",
    "Answer with JSON only, no other text: {\"reply\": \"<2-4 short sentences in " + (locale === "vi" ? "Vietnamese" : "English") + ">\", \"tools\": [{\"tool\": \"<tool>\", ...}]}.",
    "The reply must not list the tools or say that you opened anything; the app shows the tools as buttons under your reply."
  ].join("\n");
}

/** Repeated after the pinned bundle so the output format is the last instruction the model reads. */
export function oracleToolReminder(locale: OracleLocale): string {
  return `[format: ${ORACLE_TOOL_CONTRACT_VERSION}] Output exactly one JSON object and nothing else: {"reply": "<2-4 short sentences in ${locale === "vi" ? "Vietnamese" : "English"}>", "tools": []} with 0-2 tool objects such as {"tool": "draw_tarot", "topic": "love"}.`;
}

const REPLY_KEYS = ["reply", "response", "answer", "message", "text"];
const TOOL_LIST_KEYS = ["tools", "actions", "suggestions", "tool_calls"];
const TOOL_NAME_KEYS = ["tool", "kind", "name", "type", "action", "id"];

function firstString(item: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (typeof item[key] === "string") return item[key];
  return undefined;
}

function firstArray(item: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) if (Array.isArray(item[key])) return item[key] as unknown[];
  return [];
}

function jsonCandidate(text: string): string | undefined {
  const unfenced = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  return start >= 0 && end > start ? unfenced.slice(start, end + 1) : undefined;
}

function shortText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : undefined;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : undefined;
}

/**
 * Tolerant parse of the model answer. Returns a content-free rejection code when the answer is unusable,
 * so the router can try the fallback model once. Unknown or disabled tools are dropped, not rejected.
 */
export function parseOracleToolOutput(text: string): { output?: OracleToolOutput; reason?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { reason: "empty" };
  const candidate = jsonCandidate(trimmed);
  const looksLikeJson = /^(?:```|\{)/.test(trimmed);
  // Plain prose is still a usable AI reply; it just offers no tools.
  const prose = () => {
    const reply = shortText(trimmed, ORACLE_MAX_REPLY_CHARS);
    return reply ? { output: { reply, tools: [] } } : { reason: "empty" };
  };
  if (!candidate) return looksLikeJson ? { reason: "no_json" } : prose();
  let parsed: unknown;
  try { parsed = JSON.parse(candidate); } catch { return looksLikeJson ? { reason: "invalid_json" } : prose(); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return looksLikeJson ? { reason: "not_object" } : prose();
  const body = parsed as Record<string, unknown>;
  const reply = shortText(firstString(body, REPLY_KEYS), ORACLE_MAX_REPLY_CHARS);
  if (!reply) return { reason: "missing_reply" };
  if (reply.startsWith("{") || /"tools"\s*:/.test(reply)) return { reason: "reply_is_json" };
  const enabled = new Set(enabledOracleTools().map(action => action.kind));
  const tools: OracleTool[] = [];
  for (const raw of firstArray(body, TOOL_LIST_KEYS)) {
    const item = (typeof raw === "string" ? { tool: raw } : raw) as Record<string, unknown> | null;
    if (!item || typeof item !== "object") continue;
    const named = firstString(item, TOOL_NAME_KEYS);
    const kind = typeof named === "string" ? named.trim().toLowerCase() : undefined;
    if (!kind || !KINDS.has(kind as OracleToolKind) || !enabled.has(kind)) continue;
    if (tools.some(tool => tool.tool === kind)) continue;
    const tool: OracleTool = { tool: kind as OracleToolKind };
    if (kind === "draw_tarot") {
      const question = shortText(item.question, 140);
      const topic = oneOf(item.topic, ORACLE_TAROT_TOPICS);
      if (question) tool.question = question;
      if (topic) tool.topic = topic;
    }
    if (kind === "ask_guide") {
      const guide = oneOf(item.guide, Object.keys(ORACLE_GUIDES));
      if (guide) tool.guide = guide;
    }
    if (kind === "open_council") {
      const template = oneOf(item.template, ORACLE_COUNCIL_TEMPLATES);
      if (template) tool.template = template;
    }
    if (kind === "cast_astrology") {
      const focus = oneOf(item.focus, ORACLE_ASTROLOGY_FOCUS);
      if (focus) tool.focus = focus;
    }
    tools.push(tool);
    if (tools.length >= ORACLE_MAX_TOOLS) break;
  }
  return { output: { reply, tools } };
}

const INTENT_BY_TOOL: Record<OracleToolKind, string> = {
  reflect_here: "reflect",
  draw_tarot: "tarot_handoff",
  ask_guide: "persona_handoff",
  open_council: "council_handoff",
  cast_astrology: "astrology_handoff",
  save_journal: "journal_handoff"
};

/** Turns validated tools into the action cards the app already renders; model parameters refine the heuristic handoff. */
export function oracleActionsFromTools(tools: OracleTool[], heuristic: OracleHandoff) {
  const handoffContext: OracleHandoff = { ...heuristic };
  for (const tool of tools) {
    if (tool.question) handoffContext.userMessage = tool.question;
    if (tool.topic) {
      handoffContext.suggestedTarotTopic = tool.topic;
      handoffContext.suggestedTarotSpread = tool.topic === "self" ? "past-present-future" : "situation-challenge-advice";
    }
    if (tool.guide) handoffContext.suggestedPersonaSlug = tool.guide;
    if (tool.template) handoffContext.suggestedCouncilTemplateId = tool.template;
    if (tool.focus) handoffContext.suggestedAstrologyFocus = tool.focus;
  }
  const byKind = new Map(enabledOracleTools().map(action => [action.kind, action]));
  const actionCards = tools.flatMap(tool => {
    const action = byKind.get(tool.tool);
    return action ? [{
      id: action.id, kind: action.kind, target: action.target, icon: action.icon, enabled: true,
      label: action.label, detail: action.detail, handoffContext
    }] : [];
  });
  const intent = tools[0] ? INTENT_BY_TOOL[tools[0].tool] : "reflect";
  return { actionCards, handoffContext, intent };
}
