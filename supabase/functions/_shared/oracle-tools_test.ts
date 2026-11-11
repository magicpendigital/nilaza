import { ORACLE_MAX_REPLY_CHARS, oracleActionsFromTools, oracleToolInstructions, parseOracleToolOutput, type OracleHandoff } from "./oracle-tools.ts";

function equal(a: unknown, b: unknown) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`mismatch: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); }
function assert(value: unknown, reason: string) { if (!value) throw new Error(reason); }

const heuristic: OracleHandoff = {
  sourceType: "oracle", sourceId: "s1", userMessage: "Mình rối chuyện tình cảm", safeSummary: "Mình rối chuyện tình cảm",
  suggestedPersonaSlug: "the-mystic", suggestedCouncilTemplateId: "overthinking", suggestedTarotTopic: "self",
  suggestedTarotSpread: "past-present-future", suggestedAstrologyFocus: "soul"
};

Deno.test("parses a fenced JSON answer and keeps at most two known tools", () => {
  const text = "```json\n" + JSON.stringify({
    reply: "Mình nghe thấy bạn đang rối.",
    tools: [
      { tool: "draw_tarot", topic: "love", question: "Mình nên hiểu người ấy thế nào?" },
      { tool: "draw_tarot" },
      { tool: "delete_account" },
      { tool: "ask_guide", guide: "the-love-oracle" },
      { tool: "open_council", template: "love_confusion" }
    ]
  }) + "\n```";
  const { output, reason } = parseOracleToolOutput(text);
  equal(reason, undefined);
  equal(output!.tools.map(tool => tool.tool), ["draw_tarot", "ask_guide"]);
  equal(output!.tools[0].topic, "love");
  equal(output!.tools[1].guide, "the-love-oracle");
});

Deno.test("drops parameters outside the allowlists", () => {
  const { output } = parseOracleToolOutput(JSON.stringify({
    reply: "Ok.", tools: [{ tool: "ask_guide", guide: "real-person" }, { tool: "open_council", template: "anything" }]
  }));
  equal(output!.tools, [{ tool: "ask_guide" }, { tool: "open_council" }]);
});

Deno.test("rejects unusable answers with a content-free code", () => {
  equal(parseOracleToolOutput("Just text").reason, "no_json");
  equal(parseOracleToolOutput("{not json}").reason, "invalid_json");
  equal(parseOracleToolOutput(JSON.stringify({ tools: [] })).reason, "missing_reply");
  equal(parseOracleToolOutput(JSON.stringify({ reply: "{\"tools\": []}" })).reason, "reply_is_json");
});

Deno.test("bounds the reply and accepts an answer with no tools", () => {
  const { output } = parseOracleToolOutput(JSON.stringify({ reply: "a".repeat(2000) }));
  equal(output!.reply.length, ORACLE_MAX_REPLY_CHARS);
  equal(output!.tools, []);
});

Deno.test("tool parameters refine the handoff and build catalog cards", () => {
  const built = oracleActionsFromTools([{ tool: "draw_tarot", topic: "love", question: "Q?" }, { tool: "ask_guide", guide: "the-love-oracle" }], heuristic);
  equal(built.intent, "tarot_handoff");
  equal(built.actionCards.map(card => card.kind), ["draw_tarot", "ask_guide"]);
  equal(built.handoffContext.suggestedTarotTopic, "love");
  equal(built.handoffContext.suggestedTarotSpread, "situation-challenge-advice");
  equal(built.handoffContext.suggestedPersonaSlug, "the-love-oracle");
  equal(built.handoffContext.userMessage, "Q?");
  assert(built.actionCards[0].label.vi.length > 0, "card label missing");
  equal(oracleActionsFromTools([], heuristic).intent, "reflect");
});

Deno.test("instructions name the reply language and the JSON contract", () => {
  assert(oracleToolInstructions("vi").includes("Vietnamese"), "vi language missing");
  assert(oracleToolInstructions("en").includes("\"tools\""), "contract missing");
});
