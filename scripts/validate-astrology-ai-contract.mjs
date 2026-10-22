import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const defaultWorkspaceRoot = path.resolve(scriptDirectory, "..");

const readJson = (workspaceRoot, relativePath) => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
};

const normalizeKey = (value) => String(value).replace(/[^a-z0-9]/gi, "").toLowerCase();

const collectForbiddenKeys = (value, forbiddenKeys, pointer = "$") => {
  const matches = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => matches.push(...collectForbiddenKeys(item, forbiddenKeys, `${pointer}[${index}]`)));
    return matches;
  }
  if (!value || typeof value !== "object") return matches;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(normalizeKey(key))) matches.push(`${pointer}.${key}`);
    matches.push(...collectForbiddenKeys(child, forbiddenKeys, `${pointer}.${key}`));
  }
  return matches;
};

const obviousPrivateTextPatterns = [
  { code: "birth_date", pattern: /\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b|\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2}\b/i },
  { code: "birth_time", pattern: /\b(?:[01]?\d|2[0-3]):[0-5]\d\b|(?:birth time|time of birth|sinh lúc|giờ sinh)/i },
  { code: "birth_place", pattern: /(?:birth place|place of birth|born in|nơi sinh|sinh tại)/i },
  { code: "coordinates", pattern: /[-+]?\d{1,2}\.\d{3,}\s*,\s*[-+]?\d{1,3}\.\d{3,}/ },
  { code: "timezone", pattern: /\b[A-Za-z]+\/[A-Za-z_]+\b|(?:time\s*zone|timezone|múi giờ|utc\s*[+-]\s*\d)/i },
  { code: "journal", pattern: /(?:raw journal|journal entr(?:y|ies)|private journal|nhật ký riêng|nội dung nhật ký)/i },
  { code: "private_chat", pattern: /(?:raw chat|private chat|chat history|lịch sử trò chuyện|đoạn chat riêng)/i }
];

const formatAjvErrors = (label, errors = []) => errors.map((error) => {
  const pointer = error.instancePath || "$";
  return `${label}${pointer}: ${error.message}`;
});

const uniqueValues = (items) => new Set(items).size === items.length;

export const loadAstrologyAiContract = (workspaceRoot = defaultWorkspaceRoot) => {
  const relativePath = "packages/agent-config/astrology-ai-insight/contract.json";
  const contract = readJson(workspaceRoot, relativePath);
  const requestSchema = readJson(workspaceRoot, contract.requestSchema.path);
  const invocationSchema = readJson(workspaceRoot, contract.invocationSchema.path);
  const responseSchema = readJson(workspaceRoot, contract.responseSchema.path);
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addSchema(requestSchema);
  return {
    contract,
    requestSchema,
    invocationSchema,
    responseSchema,
    validateRequestSchema: ajv.compile(requestSchema),
    validateInvocationSchema: ajv.compile(invocationSchema),
    validateResponseSchema: ajv.compile(responseSchema)
  };
};

const getFactCollections = (request) => [
  ["placements", request?.facts?.placements || []],
  ["aspects", request?.facts?.aspects || []],
  ["houses", request?.facts?.houses || []]
];

const getResponseSections = (response) => [
  ...(response?.patterns || []).map((item) => ["patterns", item]),
  ...(response?.tensions || []).map((item) => ["tensions", item]),
  ...(response?.focusSections || []).map((item) => ["focusSections", item])
];

export const validateAstrologyAiRequest = (request, workspaceRoot = defaultWorkspaceRoot) => {
  const loaded = loadAstrologyAiContract(workspaceRoot);
  const errors = [];
  if (!loaded.validateRequestSchema(request)) errors.push(...formatAjvErrors("request", loaded.validateRequestSchema.errors));

  const forbiddenKeys = new Set(loaded.contract.privacyBoundary.forbiddenFieldNames.map(normalizeKey));
  for (const pointer of collectForbiddenKeys(request, forbiddenKeys)) errors.push(`request${pointer.slice(1)}: forbidden privacy field`);

  const factCollections = getFactCollections(request);
  const allFacts = factCollections.flatMap(([, items]) => items);
  const factIds = allFacts.map((fact) => fact.factId).filter(Boolean);
  const factIdSet = new Set(factIds);
  if (!uniqueValues(factIds)) errors.push("request.facts: factId values must be unique across placements, aspects, and houses");

  for (const [collectionName, facts] of factCollections) {
    const expectedPrefix = collectionName === "placements" ? "placement." : collectionName === "aspects" ? "aspect." : "house.";
    for (const fact of facts) {
      if (typeof fact.factId === "string" && !fact.factId.startsWith(expectedPrefix)) {
        errors.push(`request.facts.${collectionName}.${fact.factId}: factId must start with ${expectedPrefix}`);
      }
    }
  }

  for (const selectedFactId of request?.selectedFactIds || []) {
    if (!factIdSet.has(selectedFactId)) errors.push(`request.selectedFactIds: unknown factId ${selectedFactId}`);
  }

  const caveatIds = (request?.caveats || []).map((caveat) => caveat.id).filter(Boolean);
  const caveatIdSet = new Set(caveatIds);
  if (!uniqueValues(caveatIds)) errors.push("request.caveats: caveat id values must be unique");
  for (const fact of allFacts) {
    for (const caveatId of fact?.confidence?.caveatIds || []) {
      if (!caveatIdSet.has(caveatId)) errors.push(`request.facts.${fact.factId}.confidence: unknown caveatId ${caveatId}`);
    }
  }
  for (const caveat of request?.caveats || []) {
    for (const factId of caveat.appliesToFactIds || []) {
      if (!factIdSet.has(factId)) errors.push(`request.caveats.${caveat.id}: unknown factId ${factId}`);
    }
  }

  const focus = request?.userFocus;
  if (focus?.mode === "question" && (typeof focus.sanitizedQuestion !== "string" || !focus.sanitizedQuestion.trim())) {
    errors.push("request.userFocus.sanitizedQuestion: question mode requires sanitized current-turn text");
  }
  if (focus?.mode === "overview" && focus.sanitizedQuestion !== null) {
    errors.push("request.userFocus.sanitizedQuestion: overview mode must use null");
  }
  if (typeof focus?.sanitizedQuestion === "string") {
    for (const { code, pattern } of obviousPrivateTextPatterns) {
      if (pattern.test(focus.sanitizedQuestion)) errors.push(`request.userFocus.sanitizedQuestion: contains possible ${code} data`);
    }
  }

  return [...new Set(errors)];
};

export const validateAstrologyAiInvocation = (invocation, workspaceRoot = defaultWorkspaceRoot) => {
  const loaded = loadAstrologyAiContract(workspaceRoot);
  const errors = [];
  if (!loaded.validateInvocationSchema(invocation)) {
    errors.push(...formatAjvErrors("invocation", loaded.validateInvocationSchema.errors));
  }

  const forbiddenKeys = new Set(loaded.contract.privacyBoundary.forbiddenFieldNames.map(normalizeKey));
  for (const pointer of collectForbiddenKeys(invocation, forbiddenKeys)) errors.push(`invocation${pointer.slice(1)}: forbidden privacy field`);

  if (invocation && typeof invocation === "object" && !Array.isArray(invocation)) {
    const { consent, clientChartId, ...request } = invocation;
    errors.push(...validateAstrologyAiRequest({
      ...request,
      schemaVersion: "nilaza.astrology.ai-insight.request.v1",
      reportId: clientChartId
    }, workspaceRoot));
    if (consent?.accepted !== true) errors.push("invocation.consent.accepted: explicit consent is required");
    if (consent?.version !== "astrology_ai_fact_sharing_v1") errors.push("invocation.consent.version: unsupported consent version");
  }

  return [...new Set(errors)];
};

export const validateAstrologyAiResponse = (response, request, workspaceRoot = defaultWorkspaceRoot) => {
  const loaded = loadAstrologyAiContract(workspaceRoot);
  const errors = [];
  if (!loaded.validateResponseSchema(response)) errors.push(...formatAjvErrors("response", loaded.validateResponseSchema.errors));

  const forbiddenKeys = new Set(loaded.contract.privacyBoundary.forbiddenFieldNames.map(normalizeKey));
  for (const pointer of collectForbiddenKeys(response, forbiddenKeys)) errors.push(`response${pointer.slice(1)}: forbidden privacy field`);

  if (response?.requestId !== request?.requestId) errors.push("response.requestId: must match request.requestId");
  if (response?.reportId !== request?.reportId) errors.push("response.reportId: must match request.reportId");
  if (response?.language !== request?.language) errors.push("response.language: must match request.language");
  if (response?.metadata?.contractId !== loaded.contract.id) errors.push("response.metadata.contractId: must match canonical contract id");
  if (response?.metadata?.contractVersion !== loaded.contract.version) errors.push("response.metadata.contractVersion: must match canonical contract version");
  if (response?.metadata?.responseSchema !== loaded.contract.responseSchema.name) errors.push("response.metadata.responseSchema: must match canonical response schema name");
  if (response?.metadata?.promptVersionId !== loaded.contract.promptVersionId) errors.push("response.metadata.promptVersionId: must match canonical prompt id");
  if (response?.metadata?.promptVersion !== loaded.contract.promptVersion) errors.push("response.metadata.promptVersion: must match canonical prompt version");
  if (response?.metadata?.chartContractVersion !== request?.chart?.contractVersion) errors.push("response.metadata.chartContractVersion: must match request chart contract version");
  if (response?.metadata?.calculationVersion !== request?.chart?.calculationVersion) errors.push("response.metadata.calculationVersion: must match request calculation version");
  if (response?.metadata?.reportRevision !== request?.chart?.reportRevision) errors.push("response.metadata.reportRevision: must match request report revision");

  const selectedFactIds = new Set(request?.selectedFactIds || []);
  const responseEvidenceIds = new Set(response?.evidenceFactIds || []);
  for (const factId of responseEvidenceIds) {
    if (!selectedFactIds.has(factId)) errors.push(`response.evidenceFactIds: unsupported or unselected factId ${factId}`);
  }

  const caveatIds = new Set((request?.caveats || []).map((caveat) => caveat.id));
  const sectionIds = [];
  for (const [collectionName, section] of getResponseSections(response)) {
    sectionIds.push(`${collectionName}:${section.id}`);
    for (const factId of section.evidenceFactIds || []) {
      if (!selectedFactIds.has(factId)) errors.push(`response.${collectionName}.${section.id}: unsupported or unselected factId ${factId}`);
      if (!responseEvidenceIds.has(factId)) errors.push(`response.${collectionName}.${section.id}: factId ${factId} is missing from response.evidenceFactIds`);
    }
    for (const caveatId of section.caveatIds || []) {
      if (!caveatIds.has(caveatId)) errors.push(`response.${collectionName}.${section.id}: unknown caveatId ${caveatId}`);
    }
  }
  if (!uniqueValues(sectionIds)) errors.push("response: interpretation section ids must be unique within each collection");

  const followUpIds = (response?.suggestedFollowUps || []).map((item) => item.id).filter(Boolean);
  if (!uniqueValues(followUpIds)) errors.push("response.suggestedFollowUps: id values must be unique");

  return [...new Set(errors)];
};

export const validateAstrologyAiContractFiles = (workspaceRoot = defaultWorkspaceRoot) => {
  const loaded = loadAstrologyAiContract(workspaceRoot);
  const errors = [];
  const { contract, requestSchema, invocationSchema, responseSchema } = loaded;

  if (contract.id !== "nilaza.astrology.ai-insight") errors.push("contract.id must remain stable");
  if (contract.status !== "runtime_deployed_staging_configuration_pending") errors.push("contract.status must reflect the deployed runtime and pending staging configuration");
  if (contract.entitlement?.enforcementBoundary !== "server") errors.push("contract entitlement must be enforced at the server boundary");
  if (contract.privacyBoundary?.mode !== "allowlist_only") errors.push("contract privacy boundary must be allowlist_only");
  if (requestSchema.$id !== contract.requestSchema.id) errors.push("request schema id does not match contract index");
  if (invocationSchema.$id !== contract.invocationSchema.id) errors.push("invocation schema id does not match contract index");
  if (responseSchema.$id !== contract.responseSchema.id) errors.push("response schema id does not match contract index");
  if (!contract.chartContract.supportedVersions.includes(requestSchema.properties.chart.properties.contractVersion.const)) {
    errors.push("request chart contract version is not supported by the contract index");
  }
  if (!contract.chartContract.supportedCalculationVersions.includes(requestSchema.properties.chart.properties.calculationVersion.const)) {
    errors.push("request calculation version is not supported by the contract index");
  }
  const requiredForbiddenClasses = ["raw_birth_date", "raw_birth_time", "raw_birth_place", "latitude_or_longitude", "timezone_or_utc_offset", "journal_content_or_history"];
  for (const dataClass of requiredForbiddenClasses) {
    if (!contract.privacyBoundary.forbiddenDataClasses.includes(dataClass)) errors.push(`contract privacy boundary must forbid ${dataClass}`);
  }

  const request = readJson(workspaceRoot, contract.fixtures.validRequest);
  const invocation = readJson(workspaceRoot, contract.fixtures.validInvocation);
  const response = readJson(workspaceRoot, contract.fixtures.validResponse);
  errors.push(...validateAstrologyAiRequest(request, workspaceRoot));
  errors.push(...validateAstrologyAiInvocation(invocation, workspaceRoot));
  errors.push(...validateAstrologyAiResponse(response, request, workspaceRoot));
  return [...new Set(errors)];
};

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  const errors = validateAstrologyAiContractFiles(defaultWorkspaceRoot);
  if (errors.length) {
    console.error("Astrology AI contract validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Astrology AI insight contract passed schema, privacy, evidence, caveat, and version checks.");
  }
}
