import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  defaultWorkspaceRoot,
  loadAstrologyAiContract,
  validateAstrologyAiContractFiles,
  validateAstrologyAiInvocation,
  validateAstrologyAiRequest,
  validateAstrologyAiResponse
} from "./validate-astrology-ai-contract.mjs";

const clone = (value) => JSON.parse(JSON.stringify(value));
const readFixturePair = () => {
  const { contract } = loadAstrologyAiContract(defaultWorkspaceRoot);
  return {
    request: JSON.parse(fs.readFileSync(path.join(defaultWorkspaceRoot, contract.fixtures.validRequest), "utf8")),
    response: JSON.parse(fs.readFileSync(path.join(defaultWorkspaceRoot, contract.fixtures.validResponse), "utf8"))
  };
};

test("canonical Astrology AI contract and fixtures validate", () => {
  assert.deepEqual(validateAstrologyAiContractFiles(defaultWorkspaceRoot), []);
});

test("authenticated invocation requires versioned explicit consent", () => {
  const { contract } = loadAstrologyAiContract(defaultWorkspaceRoot);
  const invocation = JSON.parse(fs.readFileSync(path.join(defaultWorkspaceRoot, contract.fixtures.validInvocation), "utf8"));
  assert.deepEqual(validateAstrologyAiInvocation(invocation, defaultWorkspaceRoot), []);
  invocation.consent.accepted = false;
  assert(validateAstrologyAiInvocation(invocation, defaultWorkspaceRoot).some((error) => error.includes("consent.accepted")));
});

test("authenticated invocation rejects private birth fields", () => {
  const { contract } = loadAstrologyAiContract(defaultWorkspaceRoot);
  const invocation = JSON.parse(fs.readFileSync(path.join(defaultWorkspaceRoot, contract.fixtures.validInvocation), "utf8"));
  invocation.chart.birthDate = "1998-08-12";
  const errors = validateAstrologyAiInvocation(invocation, defaultWorkspaceRoot);
  assert(errors.some((error) => error.includes("birthDate") && error.includes("forbidden privacy field")));
});

test("request rejects raw birth and journal fields even when nested", () => {
  const { request } = readFixturePair();
  request.userFocus.birthDate = "2000-01-01";
  request.facts.journalEntries = ["private text"];
  const errors = validateAstrologyAiRequest(request, defaultWorkspaceRoot);
  assert(errors.some((error) => error.includes("birthDate") && error.includes("forbidden privacy field")));
  assert(errors.some((error) => error.includes("journalEntries") && error.includes("forbidden privacy field")));
});

test("request rejects birth time, place, coordinates, timezone, and journal payload keys", () => {
  const forbiddenCases = {
    birthTime: "08:30",
    birthPlace: "Hanoi",
    coordinates: [21.02, 105.83],
    timezone: "Asia/Bangkok",
    journalEntry: "private text"
  };
  for (const [key, value] of Object.entries(forbiddenCases)) {
    const { request } = readFixturePair();
    request.userFocus[key] = value;
    const errors = validateAstrologyAiRequest(request, defaultWorkspaceRoot);
    assert(errors.some((error) => error.includes(key) && error.includes("forbidden privacy field")), `${key} should be rejected`);
  }
});

test("request rejects an unknown selected fact", () => {
  const { request } = readFixturePair();
  request.selectedFactIds.push("placement.venus");
  const errors = validateAstrologyAiRequest(request, defaultWorkspaceRoot);
  assert(errors.some((error) => error.includes("unknown factId placement.venus")));
});

test("request rejects obvious raw birth context in the sanitized question", () => {
  const { request } = readFixturePair();
  request.userFocus.sanitizedQuestion = "Tôi sinh lúc 08:30 ngày 20/01/2000 và muốn hiểu công việc.";
  const errors = validateAstrologyAiRequest(request, defaultWorkspaceRoot);
  assert(errors.some((error) => error.includes("possible birth_date data")));
  assert(errors.some((error) => error.includes("possible birth_time data")));
});

test("response rejects invented or unselected evidence", () => {
  const { request, response } = readFixturePair();
  response.evidenceFactIds.push("placement.venus");
  response.patterns[0].evidenceFactIds.push("placement.venus");
  const errors = validateAstrologyAiResponse(response, request, defaultWorkspaceRoot);
  assert(errors.some((error) => error.includes("unsupported or unselected factId placement.venus")));
});

test("response rejects unknown caveats", () => {
  const { request, response } = readFixturePair();
  response.focusSections[0].caveatIds = ["caveat.invented"];
  const errors = validateAstrologyAiResponse(response, request, defaultWorkspaceRoot);
  assert(errors.some((error) => error.includes("unknown caveatId caveat.invented")));
});

test("response rejects mismatched calculation audit versions", () => {
  const { request, response } = readFixturePair();
  const alteredRequest = clone(request);
  alteredRequest.chart.calculationVersion = "nilaza-future-calculation";
  alteredRequest.chart.reportRevision = 2;
  const errors = validateAstrologyAiResponse(response, alteredRequest, defaultWorkspaceRoot);
  assert(errors.some((error) => error.includes("calculationVersion: must match request calculation version")));
  assert(errors.some((error) => error.includes("reportRevision: must match request report revision")));
});

test("overview mode cannot smuggle a current question", () => {
  const { request } = readFixturePair();
  request.userFocus.mode = "overview";
  const errors = validateAstrologyAiRequest(request, defaultWorkspaceRoot);
  assert(errors.some((error) => error.includes("overview mode must use null")));
});
