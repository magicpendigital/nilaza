import { readFileSync } from "fs";
import { join } from "path";
import {
  defaultFeatureAccessConfig,
  evaluateLimit,
  FEATURE_ACCESS_SPEC,
  FEATURE_IDS,
  parseFeatureAccessConfig,
  parsePublishedFeatureAccess,
  resolveFeatureAccess,
  type FeatureAccessConfig
} from "../featureAccessConfig";

const canonical = JSON.parse(readFileSync(join(__dirname, "../../../../../../packages/agent-config/feature-access.json"), "utf8"));

function withRule(featureId: keyof FeatureAccessConfig["features"], rule: Partial<FeatureAccessConfig["features"]["book_quote"]>) {
  const config = defaultFeatureAccessConfig();
  config.features[featureId] = { ...config.features[featureId], ...rule } as FeatureAccessConfig["features"]["book_quote"];
  return config;
}

test("built-in defaults equal the shared spec and keep all five features free (v1)", () => {
  for (const key of ["refreshMinutes", "dayOffsetMinutes", "limitKinds", "bounds", "editableFeatures", "allowedKinds", "defaults"] as const) {
    expect(JSON.parse(JSON.stringify(FEATURE_ACCESS_SPEC[key]))).toEqual(canonical[key]);
  }
  const config = defaultFeatureAccessConfig();
  expect(FEATURE_IDS.every((id) => config.features[id].tier === "free")).toBe(true);
  expect(config.features.book_quote.free).toEqual({ kind: "per_item_per_day", count: 1 });
  expect(config.features.boi_kieu.free).toEqual({ kind: "per_day", count: 1 });
  expect(config.features.rune_draw.free).toEqual({ kind: "per_day", count: 1 });
  expect(config.features.big_five.free).toEqual({ kind: "retake_after_days", days: 30 });
  expect(config.features.enneagram.free).toEqual({ kind: "retake_after_days", days: 30 });
  expect(parseFeatureAccessConfig(config)).toEqual(config);
});

test("the parser rejects anything the server validator would reject", () => {
  const good = defaultFeatureAccessConfig();
  const broken: unknown[] = [
    null, [], {}, { features: [] }, { ...good, extra: 1 },
    { features: { ...good.features, tarot_ai: good.features.boi_kieu } },
    { features: { ...good.features, rune_draw: undefined } },
    withRule("rune_draw", { tier: "gold" as never }),
    withRule("rune_draw", { free: { kind: "retake_after_days", days: 3 } }),
    withRule("rune_draw", { free: { kind: "per_day", count: 0 } }),
    withRule("rune_draw", { free: { kind: "per_day", count: 101 } }),
    withRule("rune_draw", { free: { kind: "per_day", count: 1.5 } }),
    withRule("big_five", { premium: { kind: "retake_after_days", days: 366 } }),
    withRule("boi_kieu", { free: { kind: "unlimited", count: 1 } as never }),
    { features: { ...good.features, boi_kieu: { ...good.features.boi_kieu, note: "x" } } }
  ];
  for (const value of broken) expect(parseFeatureAccessConfig(JSON.parse(JSON.stringify(value ?? null)))).toBeNull();
  expect(parseFeatureAccessConfig(withRule("rune_draw", { tier: "premium", free: { kind: "unlimited" } }))).not.toBeNull();
});

test("published answer: version and config both checked", () => {
  const config = defaultFeatureAccessConfig();
  expect(parsePublishedFeatureAccess({ version: 3, publishedAt: "2026-11-27T01:00:00Z", config }))
    .toEqual({ version: 3, publishedAt: "2026-11-27T01:00:00Z", config });
  expect(parsePublishedFeatureAccess({ version: 0, config })).toBeNull();
  expect(parsePublishedFeatureAccess({ version: "3", config })).toBeNull();
  expect(parsePublishedFeatureAccess({ version: 3, config: { features: {} } })).toBeNull();
  expect(parsePublishedFeatureAccess(null)).toBeNull();
});

test("off always wins, Premium keeps access, locked only for accounts without Premium, saved stays viewable", () => {
  const premiumRune = withRule("rune_draw", { tier: "premium", free: { kind: "per_day", count: 1 }, premium: { kind: "unlimited" } });
  const off = resolveFeatureAccess({ featureId: "rune_draw", config: premiumRune, isPremium: true, switchedOff: true });
  expect(off).toMatchObject({ state: "off", limit: null, canViewSaved: true });
  const paid = resolveFeatureAccess({ featureId: "rune_draw", config: premiumRune, isPremium: true, configVersion: 4, source: "remote" });
  expect(paid).toMatchObject({ state: "open", tier: "premium", premiumLabel: true, limit: { kind: "unlimited" }, configVersion: 4, source: "remote" });
  const free = resolveFeatureAccess({ featureId: "rune_draw", config: premiumRune, isPremium: false });
  expect(free).toMatchObject({ state: "locked", premiumLabel: true, limit: null, canViewSaved: true, source: "default" });
  const freeFeature = resolveFeatureAccess({ featureId: "boi_kieu", config: premiumRune, isPremium: false });
  expect(freeFeature).toMatchObject({ state: "open", premiumLabel: false, limit: { kind: "per_day", count: 1 } });
});

describe("evaluateLimit", () => {
  // 2026-11-27 10:00 in Vietnam (UTC+7) = 03:00 UTC.
  const now = new Date("2026-11-27T03:00:00Z");

  test("per_day counts from 00:00 Vietnam time and reopens at the next local midnight", () => {
    const limit = { kind: "per_day", count: 1 } as const;
    expect(evaluateLimit(limit, [], now)).toEqual({ allowed: true, remaining: 1, nextAvailableAt: null });
    // 23:30 the evening before (Vietnam) does not count today.
    expect(evaluateLimit(limit, [{ at: "2026-11-26T16:30:00Z" }], now).allowed).toBe(true);
    // 07:30 today (Vietnam) counts.
    const used = evaluateLimit(limit, [{ at: "2026-11-27T00:30:00Z" }], now);
    expect(used).toEqual({ allowed: false, remaining: 0, nextAvailableAt: new Date("2026-11-27T17:00:00Z") });
    expect(evaluateLimit({ kind: "per_day", count: 3 }, [{ at: now.getTime() - 1000 }], now).remaining).toBe(2);
  });

  test("per_item_per_day counts each book separately", () => {
    const limit = { kind: "per_item_per_day", count: 1 } as const;
    const uses = [{ at: "2026-11-27T01:00:00Z", itemId: "book-a" }];
    expect(evaluateLimit(limit, uses, now, "book-a").allowed).toBe(false);
    expect(evaluateLimit(limit, uses, now, "book-b").allowed).toBe(true);
  });

  test("retake_after_days waits full days from the last attempt; unlimited never blocks", () => {
    const limit = { kind: "retake_after_days", days: 30 } as const;
    const last = new Date("2026-11-01T03:00:00Z");
    expect(evaluateLimit(limit, [{ at: last }], now)).toEqual({ allowed: false, remaining: 0, nextAvailableAt: new Date("2026-12-01T03:00:00Z") });
    expect(evaluateLimit(limit, [{ at: "2026-10-28T03:00:00Z" }], now).allowed).toBe(true);
    expect(evaluateLimit({ kind: "unlimited" }, [{ at: now }, { at: now }], now)).toEqual({ allowed: true, remaining: null, nextAvailableAt: null });
  });

  test("uses with bad or future timestamps are ignored", () => {
    const limit = { kind: "per_day", count: 1 } as const;
    expect(evaluateLimit(limit, [{ at: "not a date" }, { at: "2026-11-28T03:00:00Z" }], now).allowed).toBe(true);
  });
});
