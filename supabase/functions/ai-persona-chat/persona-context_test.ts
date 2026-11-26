// Persona chat history caps: today's 8 turns x 800 characters, raised by a model tier (deep_knowledge: 12 x 2,500).
import { PERSONA_HISTORY_CHARS, PERSONA_HISTORY_TURNS, historyLimits, personaModelMessages, sanitizeHistory } from "./persona-context.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

const history = Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? "guide" : "user", text: `${index}:` + "a".repeat(3000) }));
const now = new Date("2026-11-25T03:00:00Z");

Deno.test("history: without a tier the caps stay 8 x 800", () => {
  const turns = sanitizeHistory(history, "câu hỏi");
  assert(turns.length === PERSONA_HISTORY_TURNS && turns.every((turn) => turn.content.length === PERSONA_HISTORY_CHARS), "8 x 800");
  const messages = personaModelMessages({ language: "vi", text: "câu hỏi", history, now });
  assert(messages.length === PERSONA_HISTORY_TURNS + 1, "8 history turns plus the message");
});

Deno.test("history: the deep_knowledge tier keeps 12 turns of up to 2,500 characters", () => {
  const messages = personaModelMessages({ language: "vi", text: "câu hỏi", history, now, tierHistory: { turns: 12, chars: 2500 } });
  const past = messages.slice(0, -1);
  assert(past.length === 12 && past.every((turn) => turn.content.length === 2500), "12 x 2,500");
  assert(past[0].content.startsWith("8:") && past[11].content.startsWith("19:"), "the most recent turns");
  equal(past.slice(0, 2).map((turn) => turn.role), ["user", "assistant"], "roles kept");
});

Deno.test("history: tier values are clamped and an Admin narrowing still wins", () => {
  equal(historyLimits({}, { turns: 99, chars: 99_999 }), { turns: 99, chars: 99_999, maxTurns: 12, maxChars: 2500 }, "ceilings");
  const clamped = sanitizeHistory(history, "x", historyLimits({}, { turns: 99, chars: 99_999 }));
  assert(clamped.length === 12 && clamped.every((turn) => turn.content.length === 2500), "never above 12 x 2,500");
  const narrowed = sanitizeHistory(history, "x", historyLimits({ turns: 4, chars: 300 }, { turns: 12, chars: 2500 }));
  assert(narrowed.length === 4 && narrowed.every((turn) => turn.content.length === 300), "Admin 4 x 300 stays");
  equal(historyLimits({ turns: 6 }, null), { turns: 6 }, "no tier: Admin limits unchanged");
});

Deno.test("history: the repeated current message is still dropped at the raised cap", () => {
  const text = "b".repeat(1200);
  const turns = sanitizeHistory([{ role: "guide", text: "chào" }, { role: "user", text }], text.slice(0, 800), historyLimits({}, { turns: 12, chars: 2500 }));
  equal(turns.map((turn) => turn.role), ["assistant"], "duplicate user turn dropped");
});
