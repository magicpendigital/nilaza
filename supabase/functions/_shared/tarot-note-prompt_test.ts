import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { assembleTarotNoteSystem, checkTarotNoteText, countWords } from "./tarot-note-prompt.ts";

const words = (n: number) => Array.from({ length: n }, (_, i) => `từ${i}`).join(" ");

Deno.test("a well-formed note passes and askThem may be null", () => {
  const check = checkTarotNoteText(JSON.stringify({ text: words(180), need: "được lắng nghe", askThem: null }));
  assertEquals(check.reason, undefined);
  assertEquals(check.note?.askThem, null);
  assertEquals(countWords(check.note!.text), 180);
  assertEquals(checkTarotNoteText(JSON.stringify({ text: words(200), need: "clarity" })).note?.askThem, null);
});

Deno.test("each malformed note names its failing field", () => {
  const cases: Array<[string, string]> = [
    ["not json", "not_json"],
    ["[]", "not_object"],
    [JSON.stringify({ text: words(180), need: "x", askThem: null, extra: 1 }), "extra_key"],
    [JSON.stringify({ text: "", need: "x" }), "text"],
    [JSON.stringify({ text: words(20), need: "x" }), "text_length"],
    [JSON.stringify({ text: words(500), need: "x" }), "text_length"],
    [JSON.stringify({ text: words(180), need: "" }), "need"],
    [JSON.stringify({ text: words(180), need: "x", askThem: 3 }), "ask_them"],
    ["```json\n{}\n```", "not_json"]
  ];
  for (const [text, reason] of cases) assertEquals(checkTarotNoteText(text).reason, reason, text);
});

Deno.test("system prompt asks for the word range, the need, the positions and the other person's perception", () => {
  const vi = assembleTarotNoteSystem("vi");
  assert(vi.includes("150 to 250 words"));
  assert(vi.includes("askThem is null"));
  assert(vi.includes("perception"));
  assert(vi.includes("accented Vietnamese"));
  assert(assembleTarotNoteSystem("en").includes("natural English"));
});
