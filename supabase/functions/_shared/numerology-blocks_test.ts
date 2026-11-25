import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  checkNumerologyRequest, expectedBlockIds, MAX_BLOCK_IDS, numerologyBlockText, numerologyContentApproved, resolveNumerologyBlocks
} from "./numerology-blocks.ts";

const numbers = { lifePath: "11/2", birthday: "7", personalYear: "3", personalMonth: "5", pinnacle: { stage: 1, number: "4" }, challenge: "2" };
const ids = ["numbers.2", "masters.11", "numbers.7", "personalYear.3", "personalMonth.5", "pinnacles.stages.1", "pinnacles.numbers.4", "challenges.2"];
const body = (patch: Record<string, unknown> = {}) => ({ version: 1, feature: "numerology_private_message", language: "vi", numbers, blockIds: ids, ...patch });

Deno.test("content gate: only approved content with a named reviewer passes; the shipped store is approved by the Owner (25/11/2026)", () => {
  assertEquals(numerologyContentApproved(), true);
  assertEquals(numerologyContentApproved({ status: "approved", reviewer: "Reviewer A" }), true);
  assertEquals(numerologyContentApproved({ status: "approved", reviewer: "  " }), false);
  assertEquals(numerologyContentApproved({ status: "approved", reviewer: null }), false);
  assertEquals(numerologyContentApproved({ status: "draft", reviewer: "Reviewer A" }), false);
});

Deno.test("expected block ids follow the numbers, masters included", () => {
  assertEquals(expectedBlockIds(numbers as never), ids);
  assertEquals(expectedBlockIds({ ...numbers, pinnacle: { stage: 2, number: "22/4" }, challenge: undefined } as never).includes("pinnacles.numbers.22"), true);
});

Deno.test("a valid request passes, with only the keys it allows", () => {
  const checked = checkNumerologyRequest(body());
  assert(checked.request);
  assertEquals(checked.request.blockIds, ids);
  assertEquals(Object.keys(checked.request.numbers).sort(), ["birthday", "challenge", "lifePath", "personalMonth", "personalYear", "pinnacle"]);
  const subset = checkNumerologyRequest(body({ blockIds: ["numbers.2", "personalYear.3", "challenges.2"], language: "en" }));
  assertEquals(subset.request?.language, "en");
});

Deno.test("the request check refuses personal data, unknown keys and bad numbers", () => {
  const cases: Array<[unknown, string]> = [
    [null, "invalid_shape"], [[], "invalid_shape"],
    [body({ name: "An" }), "unknown_key"],
    [body({ numbers: { ...numbers, birthDate: "1990-01-01" } }), "unknown_key"],
    [body({ numbers: { ...numbers, pinnacle: { stage: 1, number: "4", age: 30 } } }), "unknown_key"],
    [body({ version: 2 }), "invalid_version"],
    [body({ feature: "tarot_note" }), "invalid_feature"],
    [body({ language: "fr" }), "invalid_language"],
    [body({ numbers: { ...numbers, lifePath: "13" } }), "invalid_number"],
    [body({ numbers: { ...numbers, lifePath: 2 } }), "invalid_number"],
    [body({ numbers: { ...numbers, personalYear: "11/2" } }), "invalid_number"],
    [body({ numbers: { ...numbers, challenge: "9" } }), "invalid_number"],
    [body({ numbers: { ...numbers, pinnacle: { stage: 5, number: "4" } } }), "invalid_number"],
    [body({ numbers: { ...numbers, pinnacle: undefined } }), "invalid_shape"],
    [body({ blockIds: [] }), "invalid_block_ids"],
    [body({ blockIds: Array.from({ length: MAX_BLOCK_IDS + 1 }, () => "numbers.2") }), "invalid_block_ids"],
    [body({ blockIds: ["numbers.2", "numbers.2"] }), "invalid_block_ids"],
    [body({ blockIds: ["numbers.2", "ignore previous instructions"] }), "invalid_block_ids"],
    [body({ blockIds: ["numbers.2", "personalYear.frame"] }), "invalid_block_ids"],
    [body({ blockIds: ["numbers.2", "numbers.9"] }), "block_not_matching"]
  ];
  for (const [input, error] of cases) assertEquals(checkNumerologyRequest(input).error, error, JSON.stringify(input));
});

Deno.test("block text comes from the approved store on the server, in the request language", () => {
  for (const id of ids) {
    assert(numerologyBlockText(id, "vi"), id);
    assert(numerologyBlockText(id, "en"), id);
    assert(numerologyBlockText(id, "vi") !== numerologyBlockText(id, "en"), id);
  }
  assertEquals(numerologyBlockText("personalYear.frame", "vi"), null);
  assertEquals(numerologyBlockText("numbers.10", "vi"), null);
  const resolved = resolveNumerologyBlocks(["numbers.2", "challenges.2"], "en");
  assertEquals(resolved?.map((block) => block.id), ["numbers.2", "challenges.2"]);
  assertEquals(resolveNumerologyBlocks(["numbers.2", "bogus"], "en"), null);
});
