import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { displayValue, percent, selectLocale, validateWaitlistAggregate, viewModel } from "../apps/admin/growth-model.mjs";
import { claimReview, validateGrowthSnapshot } from "../apps/admin/growth-operations-model.mjs";
import { buildAdminGrowthSnapshot } from "./build-admin-growth.mjs";

const fixture = JSON.parse(fs.readFileSync("apps/admin/marketing-automation-sample.json", "utf8"));

test("growth fixture is visibly synthetic and contains no subscriber identifiers", () => {
  assert.equal(fixture.classification, "synthetic_review_fixture");
  assert.match(fixture.label, /not live production data/i);
  assert.doesNotMatch(JSON.stringify(fixture), /@/);
  assert.equal(fixture.deliveryHealth.providerConnected, false);
});

test("growth view model uses explicit denominators and locale segments", () => {
  const vi = viewModel(fixture, "vi");
  assert.equal(vi.segment.requested, 78);
  assert.equal(vi.confirmationRate, percent(61, 78));
  assert.equal(vi.acceptanceRate, percent(10, 16));
  assert.equal(vi.deliveryHealth.queued, 8);
  assert.equal(vi.suppressions.find(item => item.reason === "Unsubscribe").count, 4);
  assert.equal(selectLocale("unexpected"), "all");
});

test("growth view model preserves unavailable metrics instead of inventing zero", () => {
  const live = structuredClone(fixture);
  live.classification = "live_aggregate";
  live.segments.all.engaged = null;
  const model = viewModel(live, "all");
  assert.equal(model.engagementRate, "Unavailable");
  assert.equal(displayValue(model.segment.engaged), "—");
  assert.equal(model.isLive, true);
});

test("growth workspace remains read-only and communicates suppression boundaries", () => {
  const html = fs.readFileSync("apps/admin/growth.html", "utf8");
  const js = fs.readFileSync("apps/admin/growth.js", "utf8");
  assert.match(html, /Loading protected aggregate/);
  assert.match(html, /Review synthetic fixture/);
  assert.match(js, /Campaign is paused by design/);
  assert.match(js, /confirmed, non-suppressed contacts/);
  assert.match(js, /NilazaAdminRpc\("get_growth_waitlist_overview",\s*\{\},\s*"overview\.read"\)/);
  assert.doesNotMatch(js, /NilazaAdminRequest|\.insert\(|\.update\(|\.delete\(/);
  assert.match(js, /reviewFixture\.addEventListener\("click"/);
  assert.match(js, /validateWaitlistAggregate\(live\)/);
});

test("waitlist ratios distinguish missing or zero denominators from measured zero", () => {
  for (const denominator of [null, undefined, 0, -1, NaN, Infinity]) assert.equal(percent(0, denominator), "Unavailable");
  for (const numerator of [null, undefined, -1, NaN, Infinity]) assert.equal(percent(numerator, 10), "Unavailable");
  assert.equal(percent(0, 10), "0.0%");
});

test("malformed waitlist aggregate counts fail before rendering and null signals remain valid", () => {
  assert.equal(validateWaitlistAggregate(fixture), true);
  const nullSignals = structuredClone(fixture);
  nullSignals.segments.vi.engaged = null;
  assert.equal(validateWaitlistAggregate(nullSignals), true);
  for (const value of [-1, "10", Infinity, 1.5]) {
    const invalid = structuredClone(fixture);
    invalid.segments.all.requested = value;
    assert.equal(validateWaitlistAggregate(invalid), false);
  }
  const missing = structuredClone(fixture);
  delete missing.deliveryHealth.en;
  assert.equal(validateWaitlistAggregate(missing), false);
});

const defer = () => {
  let resolve, reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
};
const response = data => ({ ok: true, json: async () => structuredClone(data) });
const liveAggregate = () => ({ ...structuredClone(fixture), classification: "live_aggregate", source: "Synthetic protected-RPC contract response", generatedAt: "2026-09-30T10:00:00Z" });
const escaped = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

class FakeElement {
  constructor(id, dataset = {}) {
    this.id = id; this.dataset = dataset; this.hidden = false; this.disabled = false; this.innerHTML = ""; this.textContent = "";
    this.listeners = new Map(); this.attributes = new Map(); this.classes = new Set();
    this.classList = { toggle: (name, enabled) => { const active = enabled ?? !this.classes.has(name); if (active) this.classes.add(name); else this.classes.delete(name); return active; } };
  }
  addEventListener(name, callback) { const callbacks = this.listeners.get(name) || []; callbacks.push(callback); this.listeners.set(name, callbacks); }
  dispatch(name, target = this) { return Promise.all((this.listeners.get(name) || []).map(callback => callback({ target }))); }
  closest(selector) {
    if (selector === "[data-locale]" && this.dataset.locale) return this;
    if (selector === "[data-growth-route]" && this.dataset.growthRoute) return this;
    return null;
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  replaceChildren() { this.innerHTML = ""; this.textContent = ""; }
}

function growthHarness({ route = "overview", snapshot = buildAdminGrowthSnapshot(), snapshots = [], aggregates = [], fixtures = [], access = true } = {}) {
  const elements = new Map([
    "growth-content", "growth-status", "growth-source-badge", "review-fixture", "refresh-growth", "view-title", "view-description",
    "growth-connection-state", "fixture-source", "fixture-date", "growth-privacy-note"
  ].map(id => [id, new FakeElement(id)]));
  const localeFilter = new FakeElement("locale-filter");
  const localeButtons = ["all", "vi", "en"].map(value => new FakeElement(`locale-${value}`, { locale: value }));
  const document = {
    documentElement: { lang: "vi" },
    querySelector: selector => selector === ".locale-filter" ? localeFilter : elements.get(selector.slice(1)),
    querySelectorAll: selector => selector === "[data-locale]" ? localeButtons : []
  };
  const events = new Map(), requests = [], capabilityCalls = [];
  const next = (queue, fallback) => queue.length ? queue.shift() : fallback;
  const settle = plan => plan instanceof Error ? Promise.reject(plan) : Promise.resolve(typeof plan === "function" ? plan() : plan);
  const window = {
    addEventListener: (name, callback) => { const callbacks = events.get(name) || []; callbacks.push(callback); events.set(name, callbacks); },
    NilazaAdminSessionPromise: Promise.resolve(),
    NilazaRequireCapability: async capability => { capabilityCalls.push(capability); return typeof access === "function" ? access() : access; },
    NilazaAdminRpc: (name, parameters, capability) => {
      requests.push({ kind: "rpc", name, parameters, capability });
      return settle(next(aggregates, new Error("Synthetic RPC unavailable")));
    }
  };
  window.parent = window;
  let currentHash = `#${route}`;
  const location = {};
  Object.defineProperty(location, "hash", {
    get: () => currentHash,
    set: value => { currentHash = value.startsWith("#") ? value : `#${value}`; for (const callback of events.get("hashchange") || []) callback(); }
  });
  const fetch = url => {
    requests.push({ kind: "fetch", url });
    if (url === "./generated/growth-operations.json") return settle(next(snapshots, response(snapshot)));
    if (url === "./marketing-automation-sample.json") return settle(next(fixtures, response(fixture)));
    throw new Error("Unexpected synthetic harness URL");
  };
  const context = vm.createContext({ document, window, location, fetch, displayValue, selectLocale, validateWaitlistAggregate, viewModel, validateGrowthSnapshot, claimReview });
  const source = fs.readFileSync("apps/admin/growth.js", "utf8").replace(/^import [^\n]*;\r?\n/gm, "");
  const boot = new vm.Script(`(async () => {\n${source}\n})()`, { filename: "growth.js" }).runInContext(context);
  const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
  return {
    elements, requests, document, window, snapshot, boot, flush, capabilityCalls,
    get html() { return elements.get("growth-content").innerHTML; },
    get badge() { return elements.get("growth-source-badge"); },
    navigate: value => { location.hash = value; },
    click: id => elements.get(id).dispatch("click"),
    locale: value => localeFilter.dispatch("click", localeButtons.find(button => button.dataset.locale === value)),
    draft: value => { const target = new FakeElement("draft-selector"); target.value = value; return elements.get("growth-content").dispatch("change", target); }
  };
}

test("real Growth UI keeps repository review usable when the protected aggregate fails", async () => {
  const ui = growthHarness(); await ui.boot;
  assert.ok(ui.html.includes(escaped(ui.snapshot.roadmap.summary.vi)));
  assert.match(ui.badge.textContent, /Repository snapshot/);
  assert.equal(ui.elements.get("growth-status").hidden, true);
  assert.equal(ui.requests.filter(request => request.url === "./marketing-automation-sample.json").length, 0);
  ui.navigate("waitlist");
  assert.equal(ui.html, "");
  assert.match(ui.elements.get("growth-status").textContent, /Live aggregate is unavailable/);
  assert.equal(ui.elements.get("review-fixture").hidden, false);
  assert.equal(ui.requests.filter(request => request.url === "./marketing-automation-sample.json").length, 0);
  await ui.click("review-fixture");
  assert.equal(ui.requests.filter(request => request.url === "./marketing-automation-sample.json").length, 1);
  assert.equal(ui.badge.textContent, "Synthetic review fixture");
  assert.match(ui.html, /120/);
});

test("real Growth UI refresh replaces explicitly selected fixture with capability-gated live aggregates", async () => {
  const ui = growthHarness({ route: "waitlist", aggregates: [new Error("Synthetic unavailable"), liveAggregate()] }); await ui.boot;
  await ui.click("review-fixture");
  assert.equal(ui.badge.textContent, "Synthetic review fixture");
  await ui.click("refresh-growth"); await ui.flush();
  assert.equal(ui.badge.textContent, "Live aggregate · no PII");
  assert.equal(ui.badge.classes.has("live"), true);
  assert.equal(ui.elements.get("review-fixture").hidden, true);
  assert.equal(ui.elements.get("fixture-source").textContent, "Synthetic protected-RPC contract response");
  assert.equal(ui.elements.get("refresh-growth").disabled, false);
  assert.ok(ui.capabilityCalls.every(value => value === "overview.read"));
});

test("real Growth UI locale and draft selection show the corresponding canonical copy", async () => {
  const ui = growthHarness({ route: "content-drafts" }); await ui.boot;
  const first = ui.snapshot.assets[0], last = ui.snapshot.assets.at(-1);
  assert.ok(ui.html.includes(escaped(first.copy.vi.headline)));
  assert.ok(ui.html.includes(escaped(first.copy.en.headline)));
  await ui.locale("en");
  assert.equal(ui.document.documentElement.lang, "en");
  assert.ok(ui.html.includes(escaped(first.copy.en.headline)));
  assert.equal(ui.html.includes(escaped(first.copy.vi.headline)), false);
  await ui.draft(last.id);
  assert.ok(ui.html.includes(escaped(last.copy.en.headline)));
  assert.ok(ui.html.includes(`v${escaped(last.version)}`));
  assert.equal(ui.html.includes(escaped(first.copy.en.headline)), false);
  await ui.locale("vi");
  assert.ok(ui.html.includes(escaped(last.copy.vi.headline)));
  assert.equal(ui.html.includes(escaped(last.copy.en.headline)), false);
});

test("real Growth UI shows unavailable ratios when measured denominators are absent", async () => {
  const aggregate = liveAggregate();
  for (const segment of Object.values(aggregate.segments)) Object.assign(segment, { requested: 0, confirmed: 0, engaged: null, invited: 0, accepted: 0 });
  const ui = growthHarness({ route: "waitlist", aggregates: [aggregate] }); await ui.boot; await ui.locale("en");
  assert.match(ui.html, /Unavailable \/ contacts/);
  assert.match(ui.html, /Unavailable \/ invited/);
  assert.equal(ui.html.includes("0.0%"), false);
});

test("real Growth UI escapes provider labels before adding them to campaign markup", async () => {
  const aggregate = liveAggregate();
  aggregate.steps[0].label = '<img src="synthetic" onerror="unexpected()"> & "review"';
  const ui = growthHarness({ route: "campaign-map", aggregates: [aggregate] }); await ui.boot;
  assert.ok(ui.html.includes(escaped(aggregate.steps[0].label)));
  assert.equal(ui.html.includes('<img src="synthetic"'), false);
});

test("real Growth UI does not fetch repository metadata or aggregate data before authorization", async () => {
  const ui = growthHarness({ access: false }); await ui.boot;
  assert.equal(ui.requests.length, 0);
  assert.equal(ui.html, "");
  assert.match(ui.elements.get("growth-status").textContent, /Chưa xác minh quyền Admin/);
  assert.equal(ui.elements.get("review-fixture").hidden, true);
});

test("real Growth UI renders a ready aggregate while the repository source is still loading", async () => {
  const pendingSnapshot = defer();
  const ui = growthHarness({ route: "waitlist", snapshots: [pendingSnapshot.promise], aggregates: [liveAggregate()] });
  await ui.flush();
  assert.equal(ui.badge.textContent, "Live aggregate · no PII");
  assert.match(ui.html, /120/);
  ui.navigate("product-truth");
  assert.equal(ui.html, "");
  assert.match(ui.elements.get("growth-status").textContent, /Đang tải nguồn/);
  assert.equal(ui.elements.get("review-fixture").hidden, true);
  pendingSnapshot.resolve(response(ui.snapshot)); await ui.boot;
  assert.ok(ui.html.includes(escaped(ui.snapshot.productTruth.features.at(-1).claims[0].copy.vi)));
  assert.equal(ui.elements.get("growth-status").hidden, true);
});

test("real Growth UI renders repository evidence while a separate live aggregate remains loading", async () => {
  const pendingAggregate = defer();
  const ui = growthHarness({ aggregates: [pendingAggregate.promise] }); await ui.flush();
  assert.ok(ui.html.includes(escaped(ui.snapshot.roadmap.summary.vi)));
  ui.navigate("waitlist");
  assert.equal(ui.html, "");
  assert.match(ui.elements.get("growth-status").textContent, /Đang tải nguồn/);
  assert.equal(ui.elements.get("review-fixture").hidden, true);
  pendingAggregate.reject(new Error("Synthetic unavailable")); await ui.boot;
  assert.match(ui.elements.get("growth-status").textContent, /Live aggregate is unavailable/);
  assert.equal(ui.elements.get("review-fixture").hidden, false);
  assert.equal(ui.requests.some(request => request.url === "./marketing-automation-sample.json"), false);
});

test("real Growth UI keeps a protected aggregate available when the repository source fails", async () => {
  const ui = growthHarness({ route: "waitlist", snapshots: [new Error("Synthetic snapshot unavailable")], aggregates: [liveAggregate()] }); await ui.boot;
  assert.equal(ui.badge.textContent, "Live aggregate · no PII");
  assert.match(ui.html, /120/);
  ui.navigate("overview");
  assert.equal(ui.html, "");
  assert.match(ui.elements.get("growth-status").textContent, /Snapshot Growth thiếu/);
  assert.equal(ui.elements.get("review-fixture").hidden, true);
  ui.navigate("delivery-health");
  assert.match(ui.html, /Active reason records/);
  assert.equal(ui.elements.get("growth-status").hidden, true);
});

test("real Growth UI ignores an older fixture completion after refresh restores the live source", async () => {
  const pendingFixture = defer();
  const ui = growthHarness({ route: "waitlist", aggregates: [new Error("Synthetic unavailable"), liveAggregate()], fixtures: [pendingFixture.promise] }); await ui.boot;
  const fixtureAttempt = ui.click("review-fixture"); await ui.flush();
  assert.equal(ui.elements.get("review-fixture").disabled, true);
  await ui.click("refresh-growth"); await ui.flush();
  assert.equal(ui.badge.textContent, "Live aggregate · no PII");
  pendingFixture.resolve(response(fixture)); await fixtureAttempt;
  assert.equal(ui.badge.textContent, "Live aggregate · no PII");
  assert.equal(ui.elements.get("fixture-source").textContent, "Synthetic protected-RPC contract response");
  assert.equal(ui.elements.get("review-fixture").hidden, true);
});

test("real Growth UI does not restore pending data after clear-state and a newer authorized refresh", async () => {
  const staleSnapshot = defer(), staleAggregate = defer();
  const latestSnapshot = buildAdminGrowthSnapshot();
  latestSnapshot.roadmap.summary.vi += " Nguồn mới sau khi xác minh lại.";
  const latestAggregate = liveAggregate(); latestAggregate.segments.all.requested = 130;
  const ui = growthHarness({ route: "waitlist", snapshots: [staleSnapshot.promise, response(latestSnapshot)], aggregates: [staleAggregate.promise, latestAggregate] }); await ui.flush();
  ui.window.NilazaClearSensitiveAdminState();
  assert.equal(ui.html, "");
  assert.equal(ui.elements.get("refresh-growth").disabled, false);
  await ui.click("refresh-growth"); await ui.flush();
  assert.equal(ui.badge.textContent, "Live aggregate · no PII");
  assert.match(ui.html, /130/);
  const oldAggregate = liveAggregate(); oldAggregate.segments.all.requested = 999;
  const oldSnapshot = structuredClone(ui.snapshot); oldSnapshot.roadmap.summary.vi += " STALE_SOURCE_MARKER";
  staleSnapshot.resolve(response(oldSnapshot)); staleAggregate.resolve(oldAggregate); await ui.boot;
  assert.match(ui.html, /130/);
  assert.equal(ui.html.includes("999"), false);
  ui.navigate("overview");
  assert.ok(ui.html.includes(escaped(latestSnapshot.roadmap.summary.vi)));
  assert.equal(ui.html.includes("STALE_SOURCE_MARKER"), false);
});

test("real Growth UI drops a pending fixture after clear-state and rechecks access on the next attempt", async () => {
  let allowed = true;
  const pendingFixture = defer();
  const ui = growthHarness({ route: "waitlist", fixtures: [pendingFixture.promise], access: () => allowed }); await ui.boot;
  const fixtureAttempt = ui.click("review-fixture"); await ui.flush();
  const fixtureFetches = ui.requests.filter(request => request.url === "./marketing-automation-sample.json").length;
  ui.window.NilazaClearSensitiveAdminState(); allowed = false;
  pendingFixture.resolve(response(fixture)); await fixtureAttempt;
  assert.equal(ui.html, "");
  assert.equal(ui.badge.textContent, "Live aggregate unavailable");
  assert.equal(ui.elements.get("review-fixture").hidden, true);
  await ui.click("refresh-growth"); await ui.flush();
  assert.equal(ui.requests.filter(request => request.url === "./marketing-automation-sample.json").length, fixtureFetches);
  assert.equal(ui.html, "");
  assert.match(ui.elements.get("growth-status").textContent, /Chưa xác minh quyền Admin/);
  assert.equal(ui.elements.get("review-fixture").hidden, true);
  allowed = true;
  await ui.click("refresh-growth"); await ui.flush();
  assert.equal(ui.elements.get("review-fixture").hidden, false);
  await ui.click("review-fixture");
  assert.equal(ui.badge.textContent, "Synthetic review fixture");
});

test("real Growth UI renders all eight routes from their corresponding source without external approval", async () => {
  const ui = growthHarness({ aggregates: [liveAggregate()] }); await ui.boot; await ui.locale("en");
  const checks = new Map([
    ["overview", () => assert.ok(ui.html.includes(escaped(ui.snapshot.roadmap.summary.en)))],
    ["product-truth", () => {
      for (const feature of ui.snapshot.productTruth.features) assert.ok(ui.html.includes(escaped(feature.claims[0].copy.en)));
      assert.match(ui.html, /not publishing approval/);
    }],
    ["content-drafts", () => { assert.match(ui.html, /id="draft-selector"/); assert.match(ui.html, /None · no execution authority/); }],
    ["measurement", () => {
      for (const event of ui.snapshot.measurement.events) assert.ok(ui.html.includes(escaped(event.id)));
      assert.match(ui.html, /reliable data is unavailable/);
    }],
    ["roadmap", () => { for (const task of ui.snapshot.roadmap.tasks) assert.ok(ui.html.includes(escaped(task.acceptance.en))); }],
    ["waitlist", () => { assert.match(ui.html, /Unique contacts/); assert.match(ui.html, /Send eligibility not established/); }],
    ["campaign-map", () => { assert.match(ui.html, /Campaign is paused by design/); assert.match(ui.html, /Pools below do not establish eligibility/); }],
    ["delivery-health", () => { assert.match(ui.html, /Active reason records/); assert.match(ui.html, /automated email remain inactive/); }]
  ]);
  for (const [route, check] of checks) {
    ui.navigate(route); check();
    assert.equal(ui.elements.get("growth-status").hidden, true, `${route} should be available`);
    assert.equal(ui.badge.textContent, ["waitlist", "campaign-map", "delivery-health"].includes(route) ? "Live aggregate · no PII" : "Repository snapshot · internal review");
  }
  assert.equal(ui.requests.some(request => request.url === "./marketing-automation-sample.json"), false);
});
