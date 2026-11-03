import { astrologyDiagnosticFieldCode } from "./astrology-ai-insight.ts";
import { redactTraceValue } from "./ai-trace.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

Deno.test("Astrology field code names the field and rule without indexes or IDs", () => {
  assertEquals(astrologyDiagnosticFieldCode("response/patterns/0/body: must NOT have more than 240 characters"), "patterns.body:maxLength", "length");
  assertEquals(astrologyDiagnosticFieldCode("response/reflectionQuestions: must NOT have fewer than 2 items"), "reflectionQuestions:minItems", "items");
  assertEquals(astrologyDiagnosticFieldCode("response/focusSections/1: must have required property 'title'"), "focusSections:required", "required");
  assertEquals(astrologyDiagnosticFieldCode("response$: must NOT have additional properties"), "root:additionalProperties", "root");
  assertEquals(astrologyDiagnosticFieldCode("response/tensions/0/tone: must be equal to one of the allowed values"), "tensions.tone:enum", "enum");
  assertEquals(astrologyDiagnosticFieldCode("response uses unselected evidence placement:sun"), "root:evidence", "evidence drops the fact ID");
  assertEquals(astrologyDiagnosticFieldCode("response.language mismatch"), "root:metadata", "metadata");
});

Deno.test("Astrology field code survives trace redaction; the raw message does not", () => {
  const message = "response/patterns/0/body: must NOT have more than 240 characters";
  const result = redactTraceValue({ validationDiagnostics: [{ path: "response", code: "schema_constraint", field_code: astrologyDiagnosticFieldCode(message), message }] }, "redacted") as { validationDiagnostics: Array<Record<string, unknown>> };
  assertEquals(result.validationDiagnostics[0].field_code, "patterns.body:maxLength", "field code kept");
  assertEquals(result.validationDiagnostics[0].message === message, false, "raw message redacted");
});
