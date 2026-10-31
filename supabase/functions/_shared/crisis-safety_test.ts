import { safetyRedirectFor } from "./crisis-safety.ts";
function assertEquals(actual: unknown, expected: unknown, label = "") { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

Deno.test("crisis phrases the old filter missed get the 115 support reply", () => {
  for (const message of ["Mình muốn chết", "tôi muốn tự sát", "toi khong muon song nua", "I want to die"]) {
    const redirect = safetyRedirectFor(message, "vi");
    assertEquals(redirect?.safety, "crisis", message);
    assertEquals(redirect?.text.includes("115"), true, message);
  }
});

Deno.test("ordinary messages pass, including accentless names", () => {
  for (const message of ["tu tuong Lao Tu la gi", "Hôm nay mình hơi mệt", "cười muốn chết luôn"]) {
    assertEquals(safetyRedirectFor(message, "vi"), null, message);
  }
});

Deno.test("regulated requests get a boundary reply, not the crisis card", () => {
  assertEquals(safetyRedirectFor("chẩn đoán giúp mình bệnh gì", "vi")?.safety, "boundary");
});
