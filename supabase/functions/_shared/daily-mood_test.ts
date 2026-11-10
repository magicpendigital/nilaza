import { boundedMood, recentMoodFor } from "./daily-mood.ts";
function assertEquals(actual: unknown, expected: unknown, label = "") { if (actual !== expected) throw new Error(`${label} expected ${expected}, got ${actual}`); }

const now = new Date("2026-11-11T10:00:00Z");

Deno.test("recentMood: the new field wins and is one bounded line", () => {
  assertEquals(recentMoodFor({ recentMood: "  calm\nand  open " }, now), "calm and open", "direct");
  assertEquals((boundedMood("x".repeat(80)) ?? "").length, 32, "bounded");
  assertEquals(boundedMood("   "), undefined, "empty");
});

Deno.test("recentMood: older builds use only the newest mood within 24 hours, never titles", () => {
  const entries = [
    { title: "Private title", mood: "tired", createdAt: "2026-11-10T09:59:00Z" },
    { title: "Another", mood: "hopeful", createdAt: "2026-11-11T08:00:00Z" },
    { title: "Old", mood: "sad", createdAt: "2026-11-09T08:00:00Z" }
  ];
  assertEquals(recentMoodFor({ recentEntries: entries }, now), "hopeful", "newest within 24h");
  assertEquals(recentMoodFor({ recentEntries: [entries[0], entries[2]] }, now), undefined, "older than 24h is dropped");
  assertEquals(recentMoodFor({ recentEntries: [{ mood: "x", createdAt: "not a date" }] }, now), undefined, "bad date dropped");
  assertEquals(recentMoodFor({}, now), undefined, "nothing");
});
