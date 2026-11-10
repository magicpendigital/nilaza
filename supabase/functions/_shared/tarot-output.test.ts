import { checkTarotOutput, checkTarotOutputText, parseTarotOutput, validateTarotOutput } from "../../../packages/ai-contracts/tarot-output.ts";
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
  assert(checkTarotOutputText(JSON.stringify({ ...output, sections: [{ ...output.sections[0], title: "" }] }), "en", ids).reason === "title");
  assert(checkTarotOutputText(JSON.stringify(output), "vi", ids).reason === "title");
  assert(checkTarotOutputText(JSON.stringify(output), "en", ids).output?.sections.length === 1);
});
Deno.test("a plain-text section title or body counts as the requested locale (QA 2026-11-03)", () => {
  const plain = { ...output, sections: [{ key: "past", title: "Quá khứ · Six of Swords (Sáu Kiếm)", body: "Một đoạn diễn giải.", cardIds: ["major-00-fool"] }] };
  const parsed = validateTarotOutput(plain, "vi", ["major-00-fool"]);
  assert(parsed?.sections[0].title.vi === "Quá khứ · Six of Swords (Sáu Kiếm)" && parsed.sections[0].body.vi === "Một đoạn diễn giải.");
  assert(!validateTarotOutput({ ...plain, sections: [{ ...plain.sections[0], title: "x".repeat(181) }] }, "vi", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...plain, sections: [{ ...plain.sections[0], title: 42 }] }, "vi", ["major-00-fool"]));
});
Deno.test("a missing or malformed section key becomes section_N; duplicate valid keys still fail (QA 2026-11-09)", () => {
  const ids = ["major-00-fool"];
  const body = { en: "Body" };
  const odd = { ...output, sections: [{ key: "Thông điệp chính", title: { en: "A" }, body }, { title: { en: "B" }, body }, { key: 3, title: { en: "C" }, body }] };
  const parsed = validateTarotOutput(odd, "en", ids);
  assert(parsed?.sections.map(s => s.key).join(",") === "section_1,section_2,section_3");
  assert(checkTarotOutput({ ...output, sections: [{ key: "a", title: { en: "A" }, body }, { key: "a", title: { en: "B" }, body }] }, "en", ids).reason === "section_key");
  assert(checkTarotOutput({ ...output, sections: [{ key: "section_2", title: { en: "A" }, body }, { key: "bad key", title: { en: "B" }, body }] }, "en", ids).reason === "section_key");
});
Deno.test("Tarot rejects unknown references, duplicate sections, wrong locale and excess fields", () => {
  assert(!validateTarotOutput(output, "en", ["other-card"]));
  assert(!validateTarotOutput(output, "vi", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, sections: [...output.sections, ...output.sections] }, "en", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, cards: ["invented"] }, "en", ["major-00-fool"]));
  assert(!validateTarotOutput({ ...output, summary: "a".repeat(8001) }, "en", ["major-00-fool"]));
});
