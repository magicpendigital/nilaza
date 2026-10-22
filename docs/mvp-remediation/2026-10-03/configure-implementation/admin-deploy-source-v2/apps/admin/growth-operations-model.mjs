// The browser only inspects repository context. This contract grants no execution authority.
export const GROWTH_SNAPSHOT_CLASSIFICATION = "repository_growth_snapshot";
export const GROWTH_SOURCE_FILES = Object.freeze([
  "packages/growth-nilaza/product-truth.json",
  "packages/growth-nilaza/briefs/sprint-01.json",
  "packages/growth-nilaza/content-drafts/sprint-01.json",
  "packages/growth-nilaza/readiness/sprint-01-readiness.json",
  "packages/growth-nilaza/business-pack.json",
  "packages/growth-nilaza/measurement/event-ownership-map.json",
  "packages/growth-nilaza/learning/sprint-01-learning-note.json",
  "packages/growth-nilaza/research/source-register.json",
  "packages/growth-nilaza/operations/roadmap.json"
]);

const forbiddenKeys = /^(?:email|email_address|email_hash|phone|phone_number|access_token|refresh_token|confirmation_token|unsubscribe_token|api_key|apikey|service_role_key|provider_secret|secret|credentials|subscriber_id|waitlist_id|user_id|device_id|birth_profile|birth_data|birth_date|birth_time|birth_place|birth_utc|raw_chart|chart_data|raw_chat|chat_messages|raw_journal|journal_entries|face_upload|raw_utm|audience_list|research_responses)$/i;
const normalizeKey = key => key.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[-\s]/g, "_");
const sensitiveText = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\+\d(?:[\d ()-]{7,18})\d|\b(?:sk|sb_secret)[-_][A-Za-z0-9_-]{12,}\b|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/i;
const plainObject = value => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

export function growthPrivacyErrors(value) {
  const errors = [];
  const walk = (entry, location, depth) => {
    if (depth > 18) { errors.push(`${location}: nested data limit exceeded`); return; }
    if (typeof entry === "string") {
      if (entry.length > 20000 || sensitiveText.test(entry)) errors.push(`${location}: private or unbounded text is not allowed`);
    } else if (Array.isArray(entry)) {
      if (entry.length > 300) errors.push(`${location}: array limit exceeded`);
      entry.forEach((item, index) => walk(item, `${location}[${index}]`, depth + 1));
    } else if (plainObject(entry)) {
      for (const [key, item] of Object.entries(entry)) {
        const disabledEmailCapability = key === "email" && location.endsWith(".channelCapability") && item === "not_active";
        if (["__proto__", "constructor", "prototype"].includes(key) || (forbiddenKeys.test(normalizeKey(key)) && !disabledEmailCapability)) errors.push(`${location}.${key}: forbidden private field`);
        if (key === "tenantId" && item !== "nilaza") errors.push(`${location}.${key}: Nilaza tenant required`);
        walk(item, `${location}.${key}`, depth + 1);
      }
    } else if (entry !== null && !["number", "boolean"].includes(typeof entry)) errors.push(`${location}: unsupported data type`);
  };
  walk(value, "growth", 0);
  return errors;
}

const text = value => typeof value === "string" && value.trim().length > 0;
const number = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const boolean = value => typeof value === "boolean";
const nullable = rule => value => value === null || rule(value);
const list = rule => ({ array: rule });
const shape = (properties, required = Object.keys(properties)) => ({ properties, required });
const strings = list(text);
const localized = shape({ vi: text, en: text });
const date = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && Number.isFinite(Date.parse(value));
const sourceReference = value => text(value) && /^(?:docs|packages|assets|design|apps|scripts)\/[A-Za-z0-9_.\-/]+$/.test(value) && !value.split("/").includes("..");
export const isGrowthSourceReference = sourceReference;
const copy = shape({ headline: text, body: text, caption: text, cta: text, altText: text });
const scores = shape(Object.fromEntries([
  "jtbd_audience_relevance", "specific_differentiated_value", "proof_claim_precision", "brand_bilingual_editorial_quality",
  "brand_locale_editorial_quality", "clarity_cta_destination_fit", "platform_visual_accessibility_fit", "trust_emotional_safety",
  "experiment_measurement_quality", "operational_traceability_reuse"
].map(key => [key, number])), []);
const claim = shape({ id: text, status: text, allowedSurfaces: strings, evidenceRefs: strings, expiresAt: date, copy: localized });
const evidence = shape({ id: text, type: text, reference: sourceReference, expiresAt: date });
const feature = shape({ id: text, status: text, platforms: strings, evidence: list(evidence), claims: list(claim), prohibitedClaims: strings });
const qa = shape({ automatedVerdict: text, independentQaStatus: text, hardFailureCodes: strings, softScores: scores, reviewerRole: text, repairCycles: number, scoreStatus: text, reviewReason: text }, ["automatedVerdict", "independentQaStatus", "hardFailureCodes", "softScores", "reviewerRole", "repairCycles"]);
const accessibility = shape({ altTextProvided: boolean, smallTextContrastReviewRequired: boolean, slideOrderLabeled: boolean, captionsRequired: boolean, noRapidFlashing: boolean, motion: text, reduceMotionAlternativeRequired: boolean, cardMeaningNotConveyedByColorOnly: boolean, speakerLabelsRequired: boolean, dataAndIllustrationVisuallyDistinguished: boolean }, ["altTextProvided"]);
const visualBrief = shape({ source: text, reference: sourceReference, rightsStatus: text, provenanceStatus: text, accessibility, durationSecondsMax: number, storyboard: list(shape({ scene: number, durationSeconds: number, onScreenText: localized })), captionTranscript: localized }, ["source", "reference", "rightsStatus", "provenanceStatus", "accessibility"]);
const measurement = shape({ hypothesis: text, primaryMetric: text, denominator: text, guardrails: strings });
const asset = shape({
  id: text, briefId: text, version: text, status: text, artifactKind: text, lifecycleState: text, format: text, claimRefs: strings,
  copy: shape({ vi: copy, en: copy }), visualBrief, qa,
  approval: shape({ status: text, artifactHash: nullable(text), targetChannel: nullable(text), expiry: nullable(date) }),
  externalReadiness: shape({ status: text, blockingGates: strings }), measurement,
  productionRecord: shape({ skillVersion: text, source: text, modelVersion: text, timeEstimateMinutes: number, costUsd: number, costStatus: text }),
  destination: shape({ id: text, status: text }),
  reviewUpdate: shape({ reviewedAt: date, owner: text, reason: text, evidenceRefs: strings })
}, ["id", "briefId", "version", "status", "artifactKind", "lifecycleState", "format", "claimRefs", "copy", "visualBrief", "qa", "approval", "externalReadiness", "measurement", "productionRecord", "destination"]);

// Filled by the versioned Nilaza operating plan, never inferred from calendar dates.
const roadmapTask = shape({ id: text, priority: text, title: localized, status: text, owner: text, dependencies: strings, evidenceRefs: list(sourceReference), acceptance: localized, nextAction: localized });
const schemas = {
  productTruth: shape({ schemaVersion: text, tenantId: text, brandPackVersion: text, lastReviewedAt: date, features: list(feature) }),
  briefs: list(shape({ id: text, hypothesis: text, claimRefs: strings, formats: strings, destinationId: text, primaryMetric: text, guardrails: strings })),
  assets: list(asset),
  readiness: shape({ schemaVersion: text, tenantId: text, sprintId: text, mode: text, externalAction: text, implementedWorkflowIds: strings, deferredWorkflowIds: strings,
    externalReadiness: shape({ status: text, requiredGates: strings, reason: text }), lastReviewedAt: date, reviewNotes: strings, currentProductState: strings, nextGateOrder: strings
  }, ["schemaVersion", "tenantId", "sprintId", "mode", "externalAction", "implementedWorkflowIds", "deferredWorkflowIds", "externalReadiness"]),
  business: shape({ schemaVersion: text, tenantId: text, businessPackVersion: text,
    marketScope: shape({ primaryLocale: text, secondaryLocale: text, audienceHypotheses: strings, exclusions: strings }),
    northStar: shape({ id: text, meaning: text }), allowedDestinations: list(shape({ id: text, status: text, purpose: text })),
    channelCapability: shape({ organic: text, email: text, push_marketing: text, paid_media: text, social_api: text })
  }),
  measurement: shape({ schemaVersion: text, tenantId: text, status: text, rule: text, lastReviewedAt: date,
    events: list(shape({ id: text, owner: text, purpose: text, dataClass: text, state: text, sourceBindings: list(shape({ path: sourceReference, name: text, persistence: text, availability: text })) }, ["id", "owner", "purpose", "dataClass", "state"])),
    forbiddenDimensions: strings, measurementAvailability: strings
  }, ["schemaVersion", "tenantId", "status", "rule", "events", "forbiddenDimensions"]),
  learning: shape({ schemaVersion: text, tenantId: text, sprintId: text, status: text, dataSource: text, crossTenantSharing: text, currentHypotheses: strings, nonComparabilityRule: text, nextEvidenceNeeded: strings, lastReviewedAt: date, currentProductLimits: strings }, ["schemaVersion", "tenantId", "sprintId", "status", "dataSource", "crossTenantSharing", "currentHypotheses", "nonComparabilityRule", "nextEvidenceNeeded"]),
  research: shape({ schemaVersion: text, tenantId: text, status: text, purpose: text, lastReviewedAt: date,
    sources: list(shape({ id: text, type: text, reference: sourceReference, allowedUse: text, claimAuthority: text, reviewedAt: date, evidenceRole: text }, ["id", "type", "reference", "allowedUse", "claimAuthority"]))
  }, ["schemaVersion", "tenantId", "status", "purpose", "sources"]),
  roadmap: shape({ schemaVersion: value => value === 1, tenantId: text, reviewedAt: date, status: value => value === "internal_review_only", summary: localized, workflows: list(shape({ id: text, state: text, output: localized })), tasks: list(roadmapTask) })
};

function inspect(rule, value, location, errors) {
  if (typeof rule === "function") { if (!rule(value)) errors.push(`${location}: invalid value`); return; }
  if (rule.array) {
    if (!Array.isArray(value)) { errors.push(`${location}: array required`); return; }
    value.forEach((entry, index) => inspect(rule.array, entry, `${location}[${index}]`, errors));
    return;
  }
  if (!plainObject(value)) { errors.push(`${location}: object required`); return; }
  for (const key of rule.required) if (!Object.hasOwn(value, key)) errors.push(`${location}.${key}: required field missing`);
  for (const [key, entry] of Object.entries(value)) {
    if (!Object.hasOwn(rule.properties, key)) errors.push(`${location}.${key}: unknown field`);
    else inspect(rule.properties[key], entry, `${location}.${key}`, errors);
  }
}

const dayEnd = value => Date.parse(value.length === 10 ? `${value}T23:59:59.999Z` : value);
const currentTime = now => Date.parse(now || new Date().toISOString());
export function selectGrowthLocale(value) { return value === "en" ? "en" : "vi"; }

export function claimReview(snapshot, claimRef, { now } = {}) {
  const feature = snapshot?.productTruth?.features?.find(item => item.claims.some(entry => entry.id === claimRef));
  const claim = feature?.claims.find(entry => entry.id === claimRef);
  if (!claim) return { status: "unknown", usable: false, claimRef, evidence: [] };
  const evidence = claim.evidenceRefs.map(id => feature.evidence.find(item => item.id === id)).filter(Boolean);
  const expired = dayEnd(claim.expiresAt) < currentTime(now) || evidence.some(item => dayEnd(item.expiresAt) < currentTime(now));
  const complete = evidence.length === claim.evidenceRefs.length && evidence.length > 0;
  return { feature, claim, evidence, status: !complete ? "missing_evidence" : expired ? "expired" : "current_internal_context", usable: complete && !expired, executionAuthority: "none" };
}

export function validateGrowthSnapshot(snapshot, { now } = {}) {
  const errors = growthPrivacyErrors(snapshot);
  const root = shape({ schemaVersion: value => value === 1, classification: value => value === GROWTH_SNAPSHOT_CLASSIFICATION, reviewedAt: date, tenantId: value => value === "nilaza",
    sourceFiles: list(shape({ path: value => GROWTH_SOURCE_FILES.includes(value), sha256: value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) })),
    meta: shape({ mode: value => value === "read_only", executionAuthority: value => value === "none", qaEvidence: value => value === "self_reported_seed_metadata_not_independent_review", publicReadiness: value => value === "blocked", sourceFreshness: value => value === "checked_against_canonical_files" }),
    ...schemas
  });
  inspect(root, snapshot, "snapshot", errors);
  if (errors.length) return { valid: false, errors, expiredClaims: [], expiredEvidence: [] };
  for (const section of ["productTruth", "readiness", "business", "measurement", "learning", "research", "roadmap"]) if (snapshot[section].tenantId !== "nilaza") errors.push(`${section}: Nilaza tenant required`);
  if (new Set(snapshot.sourceFiles.map(item => item.path)).size !== GROWTH_SOURCE_FILES.length || snapshot.sourceFiles.length !== GROWTH_SOURCE_FILES.length) errors.push("sourceFiles: exact canonical source set required");
  if (snapshot.readiness.mode !== "draft_only" || snapshot.readiness.externalAction !== "forbidden" || snapshot.readiness.externalReadiness.status !== "blocked") errors.push("readiness: draft-only blocked external boundary required");
  const claims = new Set();
  const featureIds = new Set();
  const expiredClaims = [], expiredEvidence = [];
  for (const feature of snapshot.productTruth.features) {
    if (featureIds.has(feature.id)) errors.push(`feature ${feature.id}: duplicate id`);
    featureIds.add(feature.id);
    const evidenceIds = new Set(feature.evidence.map(item => item.id));
    if (evidenceIds.size !== feature.evidence.length || !feature.evidence.length) errors.push(`feature ${feature.id}: unique evidence required`);
    for (const item of feature.evidence) if (dayEnd(item.expiresAt) < currentTime(now)) expiredEvidence.push(item.id);
    for (const claim of feature.claims) {
      if (claims.has(claim.id)) errors.push(`claim ${claim.id}: duplicate id`);
      claims.add(claim.id);
      if (!claim.allowedSurfaces.includes("internal_draft") || !claim.evidenceRefs.length || claim.evidenceRefs.some(id => !evidenceIds.has(id))) errors.push(`claim ${claim.id}: internal surface and valid evidence refs required`);
      if (claimReview(snapshot, claim.id, { now }).status === "expired") expiredClaims.push(claim.id);
    }
  }
  const briefIds = new Set(snapshot.briefs.map(item => item.id));
  const assetIds = new Set(snapshot.assets.map(item => item.id));
  const evidenceIds = new Set(snapshot.productTruth.features.flatMap(item => item.evidence.map(entry => entry.id)));
  const destinations = new Map(snapshot.business.allowedDestinations.map(item => [item.id, item.status]));
  if (briefIds.size !== snapshot.briefs.length || assetIds.size !== snapshot.assets.length) errors.push("briefs/assets: duplicate id");
  for (const brief of snapshot.briefs) if (!brief.claimRefs.length || brief.claimRefs.some(id => !claims.has(id)) || !destinations.has(brief.destinationId)) errors.push(`brief ${brief.id}: unresolved claim or destination`);
  for (const asset of snapshot.assets) {
    if (!briefIds.has(asset.briefId) || !asset.claimRefs.length || asset.claimRefs.some(id => !claims.has(id))) errors.push(`asset ${asset.id}: unresolved brief or claim`);
    if (asset.status !== "draft_internal" || asset.lifecycleState !== "draft_internal" || asset.externalReadiness.status !== "blocked" || !asset.externalReadiness.blockingGates.length) errors.push(`asset ${asset.id}: draft-only blocked external boundary required`);
    if (asset.approval.status !== "not_submitted" || asset.approval.artifactHash !== null || asset.approval.targetChannel !== null || asset.approval.expiry !== null) errors.push(`asset ${asset.id}: execution approval is forbidden in this snapshot`);
    if (destinations.get(asset.destination.id) !== asset.destination.status) errors.push(`asset ${asset.id}: destination status mismatch`);
    if (asset.reviewUpdate?.evidenceRefs.some(reference => !sourceReference(reference) && !evidenceIds.has(reference))) errors.push(`asset ${asset.id}: unresolved review evidence`);
  }
  const taskIds = new Set(snapshot.roadmap.tasks.map(item => item.id));
  if (taskIds.size !== snapshot.roadmap.tasks.length) errors.push("roadmap: duplicate task id");
  const dependencyGraph = new Map(snapshot.roadmap.tasks.map(item => [item.id, item.dependencies.filter(id => /^GROWTH-\d+$/.test(id))]));
  const completed = new Set();
  const visit = (id, active = new Set()) => {
    if (active.has(id)) { errors.push(`roadmap ${id}: circular dependency`); return; }
    if (completed.has(id)) return;
    const branch = new Set(active).add(id);
    for (const dependency of dependencyGraph.get(id) || []) {
      if (!taskIds.has(dependency)) errors.push(`roadmap ${id}: unknown dependency ${dependency}`);
      else visit(dependency, branch);
    }
    completed.add(id);
  };
  snapshot.roadmap.tasks.forEach(item => visit(item.id));
  return { valid: errors.length === 0, errors, expiredClaims, expiredEvidence };
}
