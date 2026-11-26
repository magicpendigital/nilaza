import type { Language } from "../../types";

/** The guide's reply while it streams, or the partial text kept after the stream broke (never saved). */
export type PersonaStreamingReply = {
  personaId: string;
  text: string;
  status: "streaming" | "interrupted";
  modelTier?: string;
};

export const DEEP_KNOWLEDGE_TIER = "deep_knowledge";

/** Persona chat history limits (docs/contracts/persona-chat-streaming.md section 1). */
export const PERSONA_HISTORY_LIMITS = {
  standard: { turns: 8, chars: 800 },
  deep_knowledge: { turns: 12, chars: 2500 }
} as const;
/** Well under the server's 96 KB body limit, leaving room for the message and context. */
export const PERSONA_HISTORY_MAX_BYTES = 64 * 1024;

function utf8Bytes(text: string) {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) { bytes += 4; index += 1; }
    else bytes += 3;
  }
  return bytes;
}

/**
 * Recent room turns for the model. A guide whose last reply came from the deep_knowledge tier gets the longer
 * memory (12 x 2,500) so "Đào sâu" can see the whole previous answer; the oldest turns are dropped first when
 * the history would make the request body too large.
 */
export function buildPersonaHistory(
  messages: Array<{ role: "user" | "guide"; text: string; uiMetadata?: Record<string, unknown> }>,
  maxBytes = PERSONA_HISTORY_MAX_BYTES
) {
  const lastGuide = [...messages].reverse().find((message) => message.role === "guide");
  const limits = lastGuide?.uiMetadata?.modelTier === DEEP_KNOWLEDGE_TIER ? PERSONA_HISTORY_LIMITS.deep_knowledge : PERSONA_HISTORY_LIMITS.standard;
  const history = messages
    .slice(-limits.turns)
    .map((message) => ({ role: message.role, text: message.text.replace(/\s+/g, " ").trim().slice(0, limits.chars) }))
    .filter((message) => message.text.length > 0);
  // JSON escaping adds a little; count it generously.
  const size = (items: typeof history) => items.reduce((total, item) => total + utf8Bytes(item.text) + 32, 0);
  while (history.length > 1 && size(history) > maxBytes) history.shift();
  return history;
}

/** The follow-up the "Đào sâu" chip sends through the normal send path. */
export function deepenPrompt(language: Language) {
  return language === "vi"
    ? "Hãy đào sâu câu trả lời vừa rồi: mở rộng ý chính, nói rõ ý đó đến từ phần nào nếu bạn chắc chắn, và cho một ví dụ cụ thể."
    : "Please go deeper into your last answer: expand the main idea, say which part it comes from if you are sure, and give a concrete example.";
}

/**
 * Batches streamed text so the room re-renders at most once per interval instead of once per delta.
 * flush() applies the latest pending text now; cancel() drops it (use before replacing with done.text).
 */
export function createThrottledText(apply: (text: string) => void, intervalMs = 80) {
  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (pending !== null) {
      const text = pending;
      pending = null;
      apply(text);
    }
  };
  return {
    push(text: string) {
      pending = text;
      if (!timer) timer = setTimeout(flush, intervalMs);
    },
    flush,
    cancel() {
      if (timer) { clearTimeout(timer); timer = null; }
      pending = null;
    }
  };
}
