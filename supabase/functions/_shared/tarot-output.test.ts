import { parseTarotOutput, validateTarotOutput } from "../../../packages/ai-contracts/tarot-output.ts";
function assert(value: unknown) { if (!value) throw new Error("assertion failed"); }
const output = { summary: "Reflection", reflection: "A question?", sections: [{ key: "theme", title: { en: "Theme" }, body: { en: "Symbolic interpretation" }, cardIds: ["major-00-fool"] }] };
Deno.test("Tarot accepts only bounded complete JSON, not raw text or partial output", () => {
  assert(parseTarotOutput(JSON.stringify(output), "en", ["major-00-fool"])?.sections.length === 1);
  for (const text of ["A plausible answer", '{"summary":"partial"', JSON.stringify({ summary: "Only summary", reflection: "Question?" }), "```json\n" + JSON.stringify(output) + "\n```"])
    assert(!parseTarotOutput(text, "en", ["major-00-fool"]));
});
Deno.test("Tarot rejects unknown references, duplicate sections, wrong locale and excess fields", () => {
  assert(!validateTarotOutput(output, "en", ["other-card"]));
  assert(!validateTarotOutput(output, "vi", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, sections: [...output.sections, ...output.sections] }, "en", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, cards: ["invented"] }, "en", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, summary: "a".repeat(8001) }, "en", ["major-00-fool"]));
});
