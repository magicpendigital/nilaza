import { validateAstrologyAiInvocation } from "../functions/_shared/astrology-ai-insight.ts";
import { astrologyAiOutputGuidance } from "../functions/_shared/astrology-ai-output-guidance.ts";

const fixtureUrl = new URL("../../packages/agent-config/astrology-ai-insight/fixtures/valid-invocation.json", import.meta.url);

async function invocation() {
  return JSON.parse(await Deno.readTextFile(fixtureUrl));
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("Astrology AI invocation requires valid versioned consent and facts", async () => {
  const request = await invocation();
  assert(validateAstrologyAiInvocation(request).length === 0, "Valid fixture should pass");

  request.consent.accepted = false;
  assert(validateAstrologyAiInvocation(request).some((error) => error.includes("consent")), "Missing consent should be rejected");
});

Deno.test("Astrology AI sends crisis prompts to the distinct crisis-support path", async () => {
  const request = await invocation();
  request.userFocus.sanitizedQuestion = "I want to hurt myself";
  const errors = validateAstrologyAiInvocation(request);
  assert(errors.some((error) => error.includes("blocked topic self_harm")), "Self-harm should use crisis support");
  assert(!errors.some((error) => error.includes("blocked topic regulated_advice")), "Self-harm should not be classified as regulated advice");
});

Deno.test("Astrology AI blocks regulated advice without crisis messaging", async () => {
  const request = await invocation();
  request.userFocus.sanitizedQuestion = "Can you give me legal advice?";
  const errors = validateAstrologyAiInvocation(request);
  assert(errors.some((error) => error.includes("blocked topic regulated_advice")), "Legal advice should be rejected");
  assert(!errors.some((error) => error.includes("blocked topic self_harm")), "Legal advice should not use crisis support");
});

Deno.test("Astrology AI model guidance stays aligned with canonical response bounds", () => {
  const guidance = astrologyAiOutputGuidance();
  assert(guidance.includes("headline: string (8–140 characters)"), "Headline bounds should be present");
  assert(guidance.includes("patterns: array (1–5 items)"), "Pattern count should match the response contract");
  assert(guidance.includes("suggestedFollowUps: array (2–5 items)"), "Follow-up count should match the response contract");
  assert(guidance.includes("focusSections[].theme: value (one of \"identity\""), "Focus themes should match the response contract");
  assert(guidance.includes("evidenceFactIds[]: string (5–96 characters; must match ^(placement|aspect|house)"), "Evidence IDs should retain canonical bounds");
});
