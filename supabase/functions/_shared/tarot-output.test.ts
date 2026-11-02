import { checkTarotOutputText, parseTarotOutput, validateTarotOutput } from "../../../packages/ai-contracts/tarot-output.ts";
function assert(value: unknown) { if (!value) throw new Error("assertion failed"); }
const output = { summary: "Reflection", reflection: "A question?", sections: [{ key: "theme", title: { en: "Theme" }, body: { en: "Symbolic interpretation" }, cardIds: ["major-00-fool"] }] };
Deno.test("Tarot accepts only bounded complete JSON, not raw text or partial output", () => {
  assert(parseTarotOutput(JSON.stringify(output), "en", ["major-00-fool"])?.sections.length === 1);
  for (const text of ["A plausible answer", '{"summary":"partial"', JSON.stringify({ summary: "Only summary", reflection: "Question?" }), "```json\n" + JSON.stringify(output) + "\n```"])
    assert(!parseTarotOutput(text, "en", ["major-00-fool"]));
});
Deno.test("a rejected Tarot answer names a content-free reason for the trace", () => {
  const ids = ["major-00-fool"];
  assert(checkTarotOutputText("```json\n" + JSON.stringify(output) + "\n```", "en", ids).reason === "fenced_json");
  assert(checkTarotOutputText("A plausible answer", "en", ids).reason === "not_json");
  assert(checkTarotOutputText(JSON.stringify({ ...output, sections: [{ ...output.sections[0], title: "Theme" }] }), "en", ids).reason === "title");
  assert(checkTarotOutputText(JSON.stringify(output), "vi", ids).reason === "title");
  assert(checkTarotOutputText(JSON.stringify(output), "en", ids).output?.sections.length === 1);
});
Deno.test("Tarot rejects unknown references, duplicate sections, wrong locale and excess fields", () => {
  assert(!validateTarotOutput(output, "en", ["other-card"]));
  assert(!validateTarotOutput(output, "vi", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, sections: [...output.sections, ...output.sections] }, "en", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, cards: ["invented"] }, "en", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, summary: "a".repeat(8001) }, "en", ["major-00-fool"]));
});
