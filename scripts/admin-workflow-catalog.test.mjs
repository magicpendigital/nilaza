import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { workflowApi, FEATURE_IDS, validateWorkflowCatalog, normalizedSourceHash } from "./validate-admin-workflow-catalog.mjs";

const { catalog, getGraph, projectTraceEvidence } = workflowApi;
const copy = () => JSON.parse(JSON.stringify(catalog));
const scopes = (featureId = "tarot_reading") => {
  const current = { accountId: "qa-admin-a", target: "https://qa.example.invalid", traceId: "trace_graph", featureId };
  return { current, observed: { ...current } };
};
const detail = (feature = "tarot_reading", spans = [{ span_name: "llm.openrouter.primary", status: "ok" }]) => ({
  run: { feature, trace_id: "trace_graph", redaction_mode: "redacted", status: "completed" }, spans
});
const onlyUnobserved = (value) => {
  assert.ok(Object.values(value.nodes).every((node) => node.status === "not-observed" && node.spans.length === 0));
  assert.ok(Object.values(value.edges).every((edge) => edge === "not-observed"));
};

test("reviewed catalog is fresh, typed and distinct across all eight features", () => {
  const result = validateWorkflowCatalog(catalog);
  assert.equal(result.status, "pass", result.errors.join("\n"));
  assert.equal(result.features, 8);
  assert.equal(result.nodes, 73);
  assert.equal(result.edges, 69);
  // Batch C1 (22/11) adds the Tarot readingGuide output and prompt input ports (205 + 2).
  assert.equal(result.ports, 207);
  // P1-A pins the Tarot draw/handler/store modules (39 + 3).
  // P1-B pins the Astrology handler and lock modules and refreshes index.ts (42 + 2).
  assert.equal(result.sourceDigests, 44);
  assert.deepEqual(catalog.features.map((feature) => feature.id), FEATURE_IDS);
});

test("classic browser UMD and Node API expose the same immutable display contract", () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL("../apps/admin/workflow-catalog.js", import.meta.url), "utf8"), context, { timeout: 1000 });
  assert.equal(context.NilazaWorkflowCatalog.catalog.version, catalog.version);
  assert.equal(context.NilazaWorkflowCatalog.getGraph("oracle_router").sourceState, "candidate-disabled");
  assert.ok(Object.isFrozen(catalog) && Object.isFrozen(catalog.features[0].nodes[0].inputs));
  assert.throws(() => { getGraph("tarot_reading").nodes[0].label.en = "Deployed"; }, TypeError);
  assert.equal(getGraph("unknown"), null);
  assert.equal(getGraph({ id: "tarot_reading" }), null);
});

test("source freshness fails on a changed dependency and ignores only newline representation", () => {
  assert.equal(normalizedSourceHash("a\r\nb\rc\n"), normalizedSourceHash("a\nb\nc\n"));
  const changed = catalog.sourceDigests.find((item) => item.path === "supabase/functions/_shared/model-router.ts").path;
  const result = validateWorkflowCatalog(catalog, { readSource: (path) => {
    const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    return path === changed ? source + "\n// changed route semantics" : source;
  } });
  assert.equal(result.status, "fail");
  assert.ok(result.errors.includes("stale source: " + changed));
});

test("validator rejects path traversal before any source read", () => {
  const altered = copy();
  altered.sourceDigests.push({ path: "../.env", sha256: "a".repeat(64) });
  const reads = [];
  const result = validateWorkflowCatalog(altered, { readSource: (path) => {
    reads.push(path);
    return readFileSync(new URL("../" + path, import.meta.url), "utf8");
  } });
  assert.equal(result.status, "fail");
  assert.ok(!reads.includes("../.env"));
});

test("validator rejects duplicate features, dangling mappings, changed types and unsafe trace bindings", () => {
  for (const mutate of [
    (value) => { value.features[1].id = value.features[0].id; },
    (value) => { value.features.find((feature) => feature.id === "tarot_reading").edges[0].mappings[0].to = "missing_port"; },
    (value) => { value.features.find((feature) => feature.id === "tarot_reading").nodes.find((node) => node.id === "canonical_cards").inputs[0].type = "WrongContract"; },
    (value) => { value.features[0].nodes[0].traceSpanNames.push("llm.private-provider.primary"); },
    (value) => { value.features[0].sourceState = "deployed"; },
    (value) => { value.features[0].nodes[1].x = value.features[0].nodes[0].x; }
  ]) {
    const value = copy(); mutate(value);
    assert.equal(validateWorkflowCatalog(value).status, "fail");
  }
});

test("Tarot inspector exposes actual card/question/channel provenance and degraded branch", () => {
  const graph = getGraph("tarot_reading");
  const cards = graph.nodes.find((node) => node.id === "canonical_cards");
  const selected = cards.inputs.find((port) => port.name === "selectedCards");
  assert.equal(selected.type, "TarotSelection[]");
  assert.equal(selected.source, "request.selectedCards");
  assert.match(cards.outputs.find((port) => port.name === "selectedCards").usage.en, /uprightMeaning.*reversedMeaning.*orientation.*position/);
  const prompt = graph.nodes.find((node) => node.id === "prompt_messages");
  for (const name of ["language", "deck", "topic", "spread", "question", "selectedCards"]) assert.ok(prompt.inputs.some((port) => port.name === name));
  for (const name of ["system", "messages"]) assert.ok(prompt.outputs.some((port) => port.name === name));
  assert.ok(graph.edges.some((edge) => edge.from === "prompt_lookup" && edge.to === "local_prompt" && edge.kind === "control"));
  assert.match(graph.nodes.find((node) => node.id === "parse_output").description.en, /Strict JSON contract/);
  assert.match(graph.nodes.find((node) => node.id === "response").description.en, /receipt ownership/);
});

test("Oracle, Notifications and Face never claim provider execution; candidate/deferred gates remain visible", () => {
  for (const id of ["oracle_router", "notifications", "face_reading"]) {
    const graph = getGraph(id);
    assert.equal(graph.traceFeatures.length, 0);
    assert.ok(graph.nodes.every((node) => node.kind !== "model" && node.traceSpanNames.length === 0));
  }
  const oracle = getGraph("oracle_router");
  assert.equal(oracle.sourceState, "candidate-disabled");
  assert.match(oracle.nodes.find((node) => node.id === "provider_gate").description.en, /providerReady=false/);
  assert.ok(oracle.edges.some((edge) => edge.from === "safety_signal" && edge.to === "static_support"));
  const ports = oracle.nodes.find((node) => node.id === "context_compile").inputs;
  assert.equal(ports.find((port) => port.name === "historyConsent").source, "request.consentFlags.history");
  assert.equal(ports.find((port) => port.name === "profileConsent").source, "request.consentFlags.profile");
  assert.equal(getGraph("face_reading").sourceState, "deferred");
  assert.equal(getGraph("face_reading").nodes.length, 2);
});

test("Council single-generation, Persona session branches and independent Daily/notification flows are explicit", () => {
  assert.equal(getGraph("ai_council").nodes.filter((node) => node.kind === "model").length, 1);
  assert.match(getGraph("ai_council").nodes.find((node) => node.id === "model_call").description.en, /No spawned\/parallel/);
  const persona = getGraph("persona_chat");
  assert.ok(persona.edges.some((edge) => edge.id === "new_session_error" && edge.to === "response"));
  assert.match(persona.edges.find((edge) => edge.id === "new_save").condition.en, /No sessionError/);
  assert.match(persona.nodes.find((node) => node.id === "session_scope").description.en, /safety event.*then check/);
  const daily = getGraph("daily_insight");
  assert.ok(daily.edges.every((edge) => edge.from.startsWith("zodiac") === edge.to.startsWith("zodiac")));
  assert.ok(daily.nodes.filter((node) => node.id.startsWith("zodiac")).every((node) => node.traceSpanNames.length === 0));
  const notifications = getGraph("notifications");
  assert.ok(notifications.edges.every((edge) => edge.from !== "inbox_test" && edge.from !== "preferences"));
  assert.match(notifications.nodes.find((node) => node.id === "delivery_rows").description.en, /not device displayed/);
});

test("model inspector distinguishes primary, sequential fallback rules and attempt metadata", () => {
  for (const feature of catalog.features.filter((graph) => graph.traceFeatures.length)) {
    const model = feature.nodes.find((node) => node.kind === "model");
    for (const name of ["system", "messages", "primaryRoute", "fallbackRoute", "fallbackWhen"]) assert.ok(model.inputs.some((port) => port.name === name));
    assert.match(model.inputs.find((port) => port.name === "fallbackRoute").usage.en, /never in parallel/);
    assert.ok(model.outputs.some((port) => port.name === "attempts"));
    assert.equal(model.traceSpanNames.length, 8);
  }
});

test("canonical protected RPC shape without per-span trace_id observes only Model Call", () => {
  const value = projectTraceEvidence("tarot_reading", detail(), scopes());
  assert.equal(value.status, "observed");
  assert.equal(value.traceId, "trace_graph");
  assert.deepEqual(value.nodes.model_call, { status: "ok", spans: [{ name: "llm.openrouter.primary", status: "ok" }] });
  assert.ok(Object.entries(value.nodes).filter(([id]) => id !== "model_call").every(([, node]) => node.status === "not-observed"));
  assert.ok(Object.values(value.edges).every((edge) => edge === "not-observed"));
});

test("client-authored matching span is shown only as a record with unverified writer origin", () => {
  // No live write: the current own-user INSERT policy permits this shape. The
  // display must not upgrade a matching record into verified execution.
  const forged = detail("tarot_reading", [{ span_name: "llm.openrouter.primary", status: "ok", attributes: { verifiedProviderExecution: true } }]);
  forged.run.root_output = { persisted: true, cloudDeployed: true };
  const value = projectTraceEvidence("tarot_reading", forged, scopes());
  assert.equal(value.status, "observed");
  assert.match(value.note.en, /Recorded span · writer origin unverified/);
  assert.match(value.note.en, /not proof of provider execution\/valid output\/quality\/persistence\/cloud deployment/);
  assert.ok(!JSON.stringify(value).includes("verifiedProviderExecution"));
  assert.ok(Object.values(value.edges).every((edge) => edge === "not-observed"));
  for (const feature of catalog.features.filter((graph) => graph.traceFeatures.length)) {
    assert.match(feature.nodes.find((node) => node.kind === "model").description.en, /writer origin unverified/);
  }
});

test("explicit matching span ID works, explicit conflicting ID fails closed", () => {
  const value = detail("tarot_reading", [{ trace_id: "trace_graph", span_name: "llm.openai.primary", status: "running" }]);
  assert.equal(projectTraceEvidence("tarot_reading", value, scopes()).nodes.model_call.status, "running");
  value.spans[0].trace_id = "different_trace";
  const rejected = projectTraceEvidence("tarot_reading", value, scopes());
  assert.equal(rejected.status, "rejected");
  onlyUnobserved(rejected);
});

test("completed root, route GET and redacted stage claims cannot create execution evidence", () => {
  const value = detail("tarot_reading", [{ span_name: "nilaza.tarot_reading", status: "ok", attributes: { stage: "persist" } }]);
  value.run.root_output = { finalization: { stage: "response", reportStatus: "completed" } };
  value.run.metadata = { routeStatus: "active", promptRead: true, persisted: true };
  const projected = projectTraceEvidence("tarot_reading", value, scopes());
  assert.equal(projected.status, "not-observed");
  onlyUnobserved(projected);
});

test("all scope fields are required and changed account/target/trace/feature rejects stale evidence", () => {
  for (const key of ["accountId", "target", "traceId", "featureId"]) {
    for (const side of ["current", "observed"]) {
      const value = scopes(); delete value[side][key];
      assert.equal(projectTraceEvidence("tarot_reading", detail(), value).status, "rejected");
      const changed = scopes(); changed[side][key] += "-changed";
      assert.equal(projectTraceEvidence("tarot_reading", detail(), changed).status, "rejected");
    }
  }
  assert.equal(projectTraceEvidence("tarot_reading", detail(), {}).status, "rejected");
});

test("run feature/trace ID and exact redacted mode are mandatory", () => {
  for (const changes of [{ feature: "persona_chat" }, { trace_id: "wrong_trace" }, { redaction_mode: "raw" }, { redaction_mode: "redacted " }, { redaction_mode: undefined }]) {
    const value = detail(); Object.assign(value.run, changes);
    const result = projectTraceEvidence("tarot_reading", value, scopes());
    assert.equal(result.status, "rejected");
    onlyUnobserved(result);
  }
});

test("unknown providers/statuses and arbitrary spans stay unobserved", () => {
  const value = detail("tarot_reading", [
    { span_name: "llm.unknown.primary", status: "ok" },
    { span_name: "llm.openrouter.primary.extra", status: "ok" },
    { span_name: "llm.openrouter.primary", status: "completed" },
    { span_name: "save", status: "ok" },
    { span_name: "__proto__", status: "ok" },
    null
  ]);
  const result = projectTraceEvidence("tarot_reading", value, scopes());
  assert.equal(result.status, "not-observed");
  onlyUnobserved(result);
});

test("provider statuses are preserved; mixed primary error/fallback success never turns all stages green", () => {
  for (const status of ["running", "ok", "error", "blocked", "fallback"]) {
    assert.equal(projectTraceEvidence("tarot_reading", detail("tarot_reading", [{ span_name: "llm.gemini.primary", status }]), scopes()).nodes.model_call.status, status);
  }
  const result = projectTraceEvidence("tarot_reading", detail("tarot_reading", [
    { span_name: "llm.openrouter.primary", status: "error" },
    { span_name: "llm.anthropic.fallback", status: "ok" }
  ]), scopes());
  assert.equal(result.nodes.model_call.status, "mixed");
  assert.equal(result.nodes.model_call.spans.length, 2);
  assert.ok(Object.values(result.edges).every((edge) => edge === "not-observed"));
});

test("projector neither reads nor copies private payloads, attributes, metrics or unknown fields", () => {
  const value = detail();
  const sensitive = "DO_NOT_COPY_PRIVATE_JOURNAL_OR_TOKEN";
  value.run.secret = sensitive;
  value.spans[0].unknown = sensitive;
  for (const key of ["root_input", "root_output", "metadata"]) Object.defineProperty(value.run, key, { get() { throw new Error("private field read"); } });
  for (const key of ["input", "output", "attributes"]) Object.defineProperty(value.spans[0], key, { get() { throw new Error("private span read"); } });
  const result = projectTraceEvidence("tarot_reading", value, scopes());
  assert.equal(result.status, "observed");
  assert.ok(!JSON.stringify(result).includes(sensitive));
  assert.deepEqual(Object.keys(result.nodes.model_call.spans[0]), ["name", "status"]);
  assert.ok(Object.isFrozen(result.nodes.model_call.spans));
  assert.ok(!JSON.stringify(result).includes("qa-admin-a"));
});

test("bounded spans reject oversized/invalid detail rather than silently claiming a partial run", () => {
  for (const spans of [null, {}, Array.from({ length: 257 }, () => ({ span_name: "llm.openai.primary", status: "ok" }))]) {
    const result = projectTraceEvidence("tarot_reading", detail("tarot_reading", spans), scopes());
    assert.equal(result.status, "rejected");
    onlyUnobserved(result);
  }
});

test("unsupported and deterministic features cannot borrow another feature's LLM trace", () => {
  for (const id of ["oracle_router", "notifications", "face_reading", "unknown"]) {
    const result = projectTraceEvidence(id, detail(id), scopes(id));
    assert.equal(result.status, "rejected");
    onlyUnobserved(result);
  }
  assert.equal(projectTraceEvidence("daily_insight", detail("daily_zodiac_pulse"), scopes("daily_insight")).status, "rejected");
});

test("Astrology shared legacy trace alias observes only common provider call, never current pipeline validation/save", () => {
  const result = projectTraceEvidence("astrology", detail("astrology_report"), scopes("astrology"));
  assert.equal(result.status, "observed");
  assert.equal(result.nodes.model_call.status, "ok");
  for (const id of ["auth_contract", "active_config", "private_report", "strict_output", "report_complete", "response"]) assert.equal(result.nodes[id].status, "not-observed");
  assert.match(getGraph("astrology").caveats.map((item) => item.en).join("\n"), /Legacy ai-astrology-report was retired.*Both trace as astrology_report/);
});
