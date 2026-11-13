// Owner decision 2026-11-04 (Admin screens spec, recentMood): Daily Insight may send only the mood label of
// the latest journal entry written in the last 24 hours. Journal titles and text are never forwarded.
const DAY_MS = 24 * 60 * 60 * 1000;

export function boundedMood(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 32).trim();
  return cleaned || undefined;
}

/** The mood to send: the new recentMood field, or for older app builds the newest entry mood within 24 hours. */
export function recentMoodFor(
  input: { recentMood?: unknown; recentEntries?: Array<{ mood?: unknown; createdAt?: unknown }> },
  now = new Date()
): string | undefined {
  const direct = boundedMood(input.recentMood);
  if (direct) return direct;
  const recent = (Array.isArray(input.recentEntries) ? input.recentEntries : [])
    .map((entry) => ({ mood: boundedMood(entry?.mood), at: typeof entry?.createdAt === "string" ? Date.parse(entry.createdAt) : Number.NaN }))
    .filter((entry) => entry.mood && Number.isFinite(entry.at) && entry.at <= now.getTime() + 60_000 && now.getTime() - entry.at <= DAY_MS)
    .sort((a, b) => b.at - a.at);
  return recent[0]?.mood;
}
