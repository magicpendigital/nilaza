import Ajv from "https://esm.sh/ajv@8.17.1";
import {
  ASTROLOGY_AI_CONTRACT,
  ASTROLOGY_AI_INVOCATION_SCHEMA,
  ASTROLOGY_AI_REQUEST_SCHEMA,
  ASTROLOGY_AI_RESPONSE_SCHEMA
} from "./astrology-ai-insight-contract.ts";

export { ASTROLOGY_AI_CONTRACT };

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(ASTROLOGY_AI_REQUEST_SCHEMA);
const validateInvocationSchema = ajv.compile(ASTROLOGY_AI_INVOCATION_SCHEMA);
const validateResponseSchema = ajv.compile(ASTROLOGY_AI_RESPONSE_SCHEMA);

export type AstrologyAiInvocation = {
  schemaVersion: string;
  requestId: string;
  clientChartId: string;
  language: "vi" | "en";
  chart: {
    contractId: string;
    contractVersion: string;
    calculationVersion: string;
    reportRevision: number;
    calculationStatus: string;
  };
  selectedFactIds: string[];
  facts: { placements: any[]; aspects: any[]; houses: any[] };
  caveats: any[];
  userFocus: {
    mode: "overview" | "question";
    theme: string;
    sanitizedQuestion: string | null;
    consentScope: string;
    contextDisclosure: string;
  };
  consent: { accepted: true; version: string };
};

const normalizeKey = (value: unknown) => String(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
const forbiddenKeys = new Set<string>(ASTROLOGY_AI_CONTRACT.privacyBoundary.forbiddenFieldNames.map(normalizeKey));

function collectForbiddenKeys(value: unknown, pointer = "$", out: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectForbiddenKeys(child, `${pointer}[${index}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(normalizeKey(key))) out.push(`${pointer}.${key}`);
      collectForbiddenKeys(child, `${pointer}.${key}`, out);
    }
  }
  return out;
}

const focusPatterns = [
  /\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b|\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2}\b/i,
  /\b(?:[01]?\d|2[0-3]):[0-5]\d\b|(?:birth time|time of birth|sinh lúc|giờ sinh)/i,
  /(?:birth place|place of birth|born in|nơi sinh|sinh tại)/i,
  /[-+]?\d{1,2}\.\d{3,}\s*,\s*[-+]?\d{1,3}\.\d{3,}/,
  /\b[A-Za-z]+\/[A-Za-z_]+\b|(?:time\s*zone|timezone|múi giờ|utc\s*[+-]\s*\d)/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d ()-]{8,}\d)/
];

const unsafeFocusPatterns = [
  { code: "self_harm", pattern: /(?:suicid|kill myself|hurt myself|harm myself|end my life|want to die|tự sát|tự tử|muốn chết|tự làm đau|làm hại bản thân)/i },
  { code: "regulated_advice", pattern: /(?:diagnos|medication|prescription|thuốc điều trị|chẩn đoán|legal advice|lawyer|tư vấn pháp lý|financial advice|investment advice|tư vấn tài chính|đầu tư nên mua|nên mua cổ phiếu)/i }
];

function summarizeAjvErrors(errors: any[] | null | undefined, label: string) {
  return (errors ?? []).map((error) => `${label}${error.instancePath || "$"}: ${error.message}`);
}

function factCollections(request: any) {
  return [
    ["placements", request?.facts?.placements ?? []],
    ["aspects", request?.facts?.aspects ?? []],
    ["houses", request?.facts?.houses ?? []]
  ] as const;
}

export function validateAstrologyAiInvocation(input: unknown) {
  const errors: string[] = [];
  if (!validateInvocationSchema(input)) errors.push(...summarizeAjvErrors(validateInvocationSchema.errors, "invocation"));
  errors.push(...collectForbiddenKeys(input).map((pointer) => `invocation${pointer.slice(1)}: forbidden privacy field`));
  if (!input || typeof input !== "object" || Array.isArray(input)) return [...new Set(errors)];

  const invocation = input as any;
  const request = {
    ...invocation,
    schemaVersion: "nilaza.astrology.ai-insight.request.v1",
    reportId: invocation.clientChartId
  };
  delete request.consent;
  delete request.clientChartId;
  delete request.userFocus?.consentScope;
  delete request.userFocus?.contextDisclosure;
  // Restore the server-owned disclosure values before validating the model contract.
  request.userFocus = {
    ...invocation.userFocus,
    consentScope: "current_focus_only",
    contextDisclosure: "chart_facts_and_current_focus_only"
  };

  const factSets = factCollections(request);
  const facts = factSets.flatMap(([, rows]) => rows);
  const factIds = facts.map((fact) => fact?.factId).filter((id): id is string => typeof id === "string");
  if (new Set(factIds).size !== factIds.length) errors.push("invocation.facts: fact IDs must be unique");
  const factIdSet = new Set(factIds);
  for (const selected of request.selectedFactIds ?? []) {
    if (!factIdSet.has(selected)) errors.push(`invocation.selectedFactIds: unknown factId ${selected}`);
  }
  for (const [kind, rows] of factSets) {
    const prefix = kind === "placements" ? "placement." : kind === "aspects" ? "aspect." : "house.";
    for (const fact of rows) if (typeof fact?.factId === "string" && !fact.factId.startsWith(prefix)) errors.push(`invocation.facts.${kind}: invalid factId prefix`);
  }

  const caveatIds = (request.caveats ?? []).map((caveat: any) => caveat?.id).filter((id: unknown): id is string => typeof id === "string");
  if (new Set(caveatIds).size !== caveatIds.length) errors.push("invocation.caveats: caveat IDs must be unique");
  const caveatSet = new Set(caveatIds);
  for (const fact of facts) for (const caveatId of fact?.confidence?.caveatIds ?? []) if (!caveatSet.has(caveatId)) errors.push(`invocation.facts.${fact.factId}: unknown caveat ID`);
  for (const caveat of request.caveats ?? []) for (const factId of caveat.appliesToFactIds ?? []) if (!factIdSet.has(factId)) errors.push(`invocation.caveats.${caveat.id}: unknown fact ID`);

  if (invocation.consent?.accepted !== true) errors.push("invocation.consent.accepted: explicit consent is required");
  if (invocation.consent?.version !== "astrology_ai_fact_sharing_v1") errors.push("invocation.consent.version: unsupported consent version");
  const question = request.userFocus?.sanitizedQuestion;
  if (typeof question === "string") {
    for (const pattern of focusPatterns) if (pattern.test(question)) errors.push("invocation.userFocus.sanitizedQuestion: contains disallowed personal context");
    for (const { code, pattern } of unsafeFocusPatterns) if (pattern.test(question)) errors.push(`invocation.userFocus.sanitizedQuestion: blocked topic ${code}`);
  }
  return [...new Set(errors)];
}

export function toAstrologyAiRequest(invocation: AstrologyAiInvocation, reportId: string) {
  return {
    schemaVersion: "nilaza.astrology.ai-insight.request.v1",
    requestId: invocation.requestId,
    reportId,
    language: invocation.language,
    chart: invocation.chart,
    selectedFactIds: invocation.selectedFactIds,
    facts: invocation.facts,
    caveats: invocation.caveats,
    userFocus: {
      mode: invocation.userFocus.mode,
      theme: invocation.userFocus.theme,
      sanitizedQuestion: invocation.userFocus.sanitizedQuestion,
      consentScope: "current_focus_only",
      contextDisclosure: "chart_facts_and_current_focus_only"
    }
  };
}

export function selectAstrologyAiFacts(request: ReturnType<typeof toAstrologyAiRequest>) {
  const selected = new Set(request.selectedFactIds);
  return {
    placements: request.facts.placements.filter((fact: any) => selected.has(fact.factId)),
    aspects: request.facts.aspects.filter((fact: any) => selected.has(fact.factId)),
    houses: request.facts.houses.filter((fact: any) => selected.has(fact.factId))
  };
}

export function validateAstrologyAiResponse(response: unknown, request: ReturnType<typeof toAstrologyAiRequest>) {
  const errors: string[] = [];
  if (!validateResponseSchema(response)) errors.push(...summarizeAjvErrors(validateResponseSchema.errors, "response"));
  errors.push(...collectForbiddenKeys(response).map((pointer) => `response${pointer.slice(1)}: forbidden privacy field`));
  const value = response as any;
  if (value?.requestId !== request.requestId) errors.push("response.requestId mismatch");
  if (value?.reportId !== request.reportId) errors.push("response.reportId mismatch");
  if (value?.language !== request.language) errors.push("response.language mismatch");
  if (value?.metadata?.promptVersionId !== ASTROLOGY_AI_CONTRACT.promptVersionId) errors.push("response.promptVersionId mismatch");
  if (typeof value?.metadata?.promptVersion !== "string" || !value.metadata.promptVersion.trim()) errors.push("response.promptVersion missing");
  const selected = new Set(request.selectedFactIds);
  const responseEvidence = new Set<string>(Array.isArray(value?.evidenceFactIds)
    ? value.evidenceFactIds.filter((factId: unknown): factId is string => typeof factId === "string")
    : []);
  for (const factId of responseEvidence) if (!selected.has(factId)) errors.push(`response uses unselected evidence ${factId}`);
  const caveats = new Set(request.caveats.map((caveat: any) => caveat.id));
  const sections = [
    ...(value?.patterns ?? []).map((item: any) => ["patterns", item]),
    ...(value?.tensions ?? []).map((item: any) => ["tensions", item]),
    ...(value?.focusSections ?? []).map((item: any) => ["focusSections", item])
  ] as Array<[string, any]>;
  const sectionIds = new Set<string>();
  for (const [kind, item] of sections) {
    const id = `${kind}:${item.id}`;
    if (sectionIds.has(id)) errors.push(`response has duplicate section ${id}`);
    sectionIds.add(id);
    for (const factId of item.evidenceFactIds ?? []) {
      if (!selected.has(factId) || !responseEvidence.has(factId)) errors.push(`response section ${item.id} has unsupported evidence`);
    }
    for (const caveatId of item.caveatIds ?? []) if (!caveats.has(caveatId)) errors.push(`response section ${item.id} has unknown caveat`);
  }
  return [...new Set(errors)];
}

export function makeAstrologyAiResponseEnvelope(input: {
  modelOutput: unknown;
  request: ReturnType<typeof toAstrologyAiRequest>;
  reportId: string;
  promptVersion: string;
  providerMode: "staging" | "live";
}) {
  if (!input.modelOutput || typeof input.modelOutput !== "object" || Array.isArray(input.modelOutput)) throw new Error("invalid_model_json");
  const raw = input.modelOutput as Record<string, unknown>;
  const allowed = ["headline", "synthesis", "evidenceFactIds", "patterns", "tensions", "focusSections", "reflectionQuestions", "suggestedFollowUps"];
  const response: Record<string, unknown> = Object.fromEntries(allowed.filter((key) => Object.hasOwn(raw, key)).map((key) => [key, raw[key]]));
  response.schemaVersion = "nilaza.astrology.ai-insight.response.v1";
  response.requestId = input.request.requestId;
  response.reportId = input.reportId;
  response.language = input.request.language;
  response.metadata = {
    contractId: ASTROLOGY_AI_CONTRACT.id,
    contractVersion: ASTROLOGY_AI_CONTRACT.version,
    responseSchema: ASTROLOGY_AI_CONTRACT.responseSchema.name,
    promptVersionId: ASTROLOGY_AI_CONTRACT.promptVersionId,
    promptVersion: input.promptVersion,
    chartContractVersion: input.request.chart.contractVersion,
    calculationVersion: input.request.chart.calculationVersion,
    reportRevision: input.request.chart.reportRevision,
    interpretationMode: "evidence_bound_reflection",
    moderationStatus: "passed",
    providerMode: input.providerMode,
    disclaimerKey: ASTROLOGY_AI_CONTRACT.safetyPolicy.requiredDisclaimerKey,
    generatedAt: new Date().toISOString()
  };
  return response;
}

export async function hashAstrologyAiInput(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
