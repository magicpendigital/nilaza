import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  containsSensitiveData,
  hasText,
  lintCandidate,
  requiredSoftDimensions,
  validateContractInstance,
  validateGrowthFramework
} from "./growth-framework-validator.mjs";

const modulePath = fileURLToPath(import.meta.url);
const requiredCopyFields = ["headline", "body", "caption", "cta", "altText"];

const readJson = (workspaceRoot, relativePath, errors) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: cannot read valid JSON (${error.message})`);
    return null;
  }
};

const isDateCurrent = (value) => hasText(value) && !Number.isNaN(Date.parse(value)) && Date.parse(value) >= Date.now();
const unique = (values) => new Set(values).size === values.length;

const collectAgentIds = (workspaceRoot, errors) => {
  const productAgents = readJson(workspaceRoot, "packages/agent-config/product-agents.json", errors) || [];
  const codingAgents = readJson(workspaceRoot, "packages/agent-config/coding-agents.json", errors) || [];
  return new Set([...productAgents, ...codingAgents].map((agent) => agent.id).filter(hasText));
};

const validateReadinessArtifacts = ({ readiness, sourceRegister, interviewKit, eventMap, learningNote }, errors) => {
  if (readiness.mode !== "draft_only" || readiness.externalAction !== "forbidden") {
    errors.push("Nilaza readiness must remain draft_only with external action forbidden");
  }
  const implemented = readiness.implementedWorkflowIds || [];
  const deferred = readiness.deferredWorkflowIds || [];
  if (implemented.join(",") !== "W0_readiness,W1_research_to_plan,W2_content_factory,W6_learning_to_product") {
    errors.push("Nilaza readiness must declare W0, W1, W2 and W6 as the only implemented Sprint 01 workflows");
  }
  if (deferred.join(",") !== "W3_distribution_orchestration,W4_controlled_publishing,W5_paid_media") {
    errors.push("Nilaza readiness must keep W3, W4 and W5 deferred");
  }
  if (!Array.isArray(readiness.identityBoundary?.ownBrandTokens) || readiness.identityBoundary.ownBrandTokens.length === 0) {
    errors.push("Nilaza readiness needs its own identity-boundary tokens");
  }
  if (!Array.isArray(readiness.identityBoundary?.knownForeignBrandTokens) || readiness.identityBoundary.knownForeignBrandTokens.length === 0) {
    errors.push("Nilaza readiness needs foreign-tenant boundary tokens for negative tests");
  }
  if (sourceRegister.status !== "prepared_internal" || !Array.isArray(sourceRegister.sources) || sourceRegister.sources.length < 4) {
    errors.push("Nilaza source register must contain at least four internal planning sources");
  }
  if (interviewKit.status !== "not_recruited" || interviewKit.minimumParticipantAge !== 18 || !Array.isArray(interviewKit.questions) || interviewKit.questions.length < 8) {
    errors.push("Nilaza interview kit must remain un-recruited, adult-only and contain at least eight questions");
  }
  if (eventMap.status !== "definition_only" || !Array.isArray(eventMap.events) || eventMap.events.length < 7) {
    errors.push("Nilaza event ownership map must remain definition-only and contain the canonical journey events");
  }
  if (learningNote.dataSource !== "synthetic_only" || learningNote.crossTenantSharing !== "aggregate_learning_export_only") {
    errors.push("Nilaza Sprint 01 learning note must remain synthetic and aggregate-only");
  }
};

const validateNilazaTenant = (workspaceRoot, errors) => {
  const productTruth = readJson(workspaceRoot, "packages/growth-nilaza/product-truth.json", errors);
  const roleMapping = readJson(workspaceRoot, "packages/growth-nilaza/role-mapping.json", errors);
  const briefs = readJson(workspaceRoot, "packages/growth-nilaza/briefs/sprint-01.json", errors);
  const draftLibrary = readJson(workspaceRoot, "packages/growth-nilaza/content-drafts/sprint-01.json", errors);
  const businessPack = readJson(workspaceRoot, "packages/growth-nilaza/business-pack.json", errors);
  const brandPack = readJson(workspaceRoot, "packages/growth-nilaza/brand-pack.json", errors);
  const readiness = readJson(workspaceRoot, "packages/growth-nilaza/readiness/sprint-01-readiness.json", errors);
  const sourceRegister = readJson(workspaceRoot, "packages/growth-nilaza/research/source-register.json", errors);
  const interviewKit = readJson(workspaceRoot, "packages/growth-nilaza/research/interview-kit.json", errors);
  const eventMap = readJson(workspaceRoot, "packages/growth-nilaza/measurement/event-ownership-map.json", errors);
  const learningNote = readJson(workspaceRoot, "packages/growth-nilaza/learning/sprint-01-learning-note.json", errors);
  if (![productTruth, roleMapping, briefs, draftLibrary, businessPack, brandPack, readiness, sourceRegister, interviewKit, eventMap, learningNote].every(Boolean)) {
    return { assetCount: 0, blockedAssetCount: 0 };
  }

  errors.push(...validateContractInstance(workspaceRoot, "schemas/product-truth.schema.json", productTruth, "Nilaza ProductTruth"));
  for (const brief of briefs.briefs || []) {
    errors.push(...validateContractInstance(workspaceRoot, "schemas/content-brief.schema.json", { ...brief, tenantId: briefs.tenantId }, `Nilaza brief ${brief.id || "unknown"}`));
  }
  for (const asset of draftLibrary.assetPackages || []) {
    errors.push(...validateContractInstance(workspaceRoot, "schemas/asset-package.schema.json", asset, `Nilaza asset ${asset.id || "unknown"}`));
  }

  if (productTruth.tenantId !== "nilaza" || draftLibrary.tenantId !== "nilaza" || briefs.tenantId !== "nilaza") {
    errors.push("Nilaza tenant files must use tenantId nilaza");
  }
  if (draftLibrary.artifactKind !== "concept_copy_library" || draftLibrary.status !== "internal_draft_library") {
    errors.push("Nilaza Sprint 01 library must be explicitly labeled an internal concept/copy library");
  }
  if (!hasText(brandPack.brandPackVersion) || !hasText(businessPack.businessPackVersion)) {
    errors.push("Nilaza BrandPack and BusinessPack require versions");
  }
  if (roleMapping.externalExecutionAuthority !== "none") errors.push("Sprint 01 Nilaza role mapping cannot grant external execution authority");
  validateReadinessArtifacts({ readiness, sourceRegister, interviewKit, eventMap, learningNote }, errors);

  const knownAgentIds = collectAgentIds(workspaceRoot, errors);
  for (const [capability, agentId] of Object.entries(roleMapping.mappings || {})) {
    if (!knownAgentIds.has(agentId)) errors.push(`role mapping ${capability} references an unknown Nilaza delivery agent: ${agentId}`);
  }

  const template = readJson(workspaceRoot, "packages/growth-fixtures/tenant-template/business-pack.json", errors);
  const templateText = JSON.stringify(template || {}).toLowerCase();
  for (const token of readiness.identityBoundary?.ownBrandTokens || []) {
    if (templateText.includes(String(token).toLowerCase())) errors.push("second-tenant template leaks a Nilaza identity token");
  }

  const featureIds = new Set();
  const claims = new Map();
  for (const feature of productTruth.features || []) {
    if (!hasText(feature.id) || featureIds.has(feature.id)) errors.push(`ProductTruth feature id is missing or duplicated: ${feature.id || "unknown"}`);
    featureIds.add(feature.id);
    const evidenceIds = new Set();
    for (const evidence of feature.evidence || []) {
      if (!hasText(evidence.id) || evidenceIds.has(evidence.id)) errors.push(`feature ${feature.id} has a missing or duplicate evidence id`);
      evidenceIds.add(evidence.id);
      if (!isDateCurrent(evidence.expiresAt)) errors.push(`feature ${feature.id} has expired or invalid evidence ${evidence.id}`);
    }
    for (const claim of feature.claims || []) {
      if (!hasText(claim.id) || claims.has(claim.id)) errors.push(`ProductTruth claim id is missing or duplicated: ${claim.id || "unknown"}`);
      claims.set(claim.id, { claim, evidenceIds });
      if (!isDateCurrent(claim.expiresAt)) errors.push(`claim ${claim.id} is expired or has invalid expiry`);
      for (const evidenceRef of claim.evidenceRefs || []) if (!evidenceIds.has(evidenceRef)) errors.push(`claim ${claim.id} references unknown evidence ${evidenceRef}`);
    }
  }

  const destinations = new Map((businessPack.allowedDestinations || []).map((destination) => [destination.id, destination]));
  const briefIds = new Set();
  for (const brief of briefs.briefs || []) {
    if (!hasText(brief.id) || briefIds.has(brief.id)) errors.push(`Sprint 01 brief id is missing or duplicated: ${brief.id || "unknown"}`);
    briefIds.add(brief.id);
    if (!claims.has((brief.claimRefs || [])[0])) errors.push(`brief ${brief.id} has an unknown ProductTruth claim`);
    if (!destinations.has(brief.destinationId)) errors.push(`brief ${brief.id} has an unknown destination`);
  }
  if (briefIds.size !== 6) errors.push("Sprint 01 requires six unique Nilaza briefs");

  const assetIds = new Set();
  let blockedAssetCount = 0;
  for (const asset of draftLibrary.assetPackages || []) {
    if (!hasText(asset.id) || assetIds.has(asset.id)) errors.push(`asset id is missing or duplicated: ${asset.id || "unknown"}`);
    assetIds.add(asset.id);
    if (asset.tenantId !== "nilaza") errors.push(`asset ${asset.id} has a cross-tenant id`);
    if (asset.artifactKind !== "concept_copy_package") errors.push(`asset ${asset.id} must be a concept/copy package until a rendered creative is verified`);
    if (asset.status !== "draft_internal" || asset.lifecycleState !== "draft_internal") errors.push(`asset ${asset.id} must remain draft_internal in Sprint 01`);
    if (!briefIds.has(asset.briefId)) errors.push(`asset ${asset.id} references an unknown brief ${asset.briefId}`);
    if (!Array.isArray(asset.claimRefs) || asset.claimRefs.length === 0) errors.push(`asset ${asset.id} needs claimRefs`);
    for (const claimRef of asset.claimRefs || []) {
      const resolved = claims.get(claimRef);
      if (!resolved) errors.push(`asset ${asset.id} references unknown claim ${claimRef}`);
      else if (!resolved.claim.allowedSurfaces.includes("internal_draft")) errors.push(`asset ${asset.id} uses claim ${claimRef} outside internal_draft`);
    }
    for (const locale of ["vi", "en"]) {
      for (const field of requiredCopyFields) if (!hasText(asset.copy?.[locale]?.[field])) errors.push(`asset ${asset.id} requires ${locale}.${field}`);
    }
    const userText = ["vi", "en"].flatMap((locale) => requiredCopyFields.map((field) => asset.copy?.[locale]?.[field] || "")).join(" ");
    const copyCodes = lintCandidate({
      tenantId: "nilaza",
      surface: "internal_draft",
      claimStatus: "internal_only",
      evidenceVerified: true,
      text: userText,
      hasVi: true,
      hasEn: true,
      knownForeignBrandTokens: readiness.identityBoundary?.knownForeignBrandTokens || []
    });
    if (copyCodes.length) errors.push(`asset ${asset.id} has prohibited copy: ${copyCodes.join(", ")}`);
    if (containsSensitiveData(userText)) errors.push(`asset ${asset.id} exposes a personal-data pattern in copy`);
    if (!destinations.has(asset.destination?.id) || destinations.get(asset.destination?.id)?.status !== asset.destination?.status) {
      errors.push(`asset ${asset.id} must resolve to its declared BusinessPack destination`);
    }
    if (!hasText(asset.visualBrief?.source) || !hasText(asset.visualBrief?.reference) || !["approved_brand_reference", "draft_visual_direction_only"].includes(asset.visualBrief?.rightsStatus)) {
      errors.push(`asset ${asset.id} lacks a known visual-rights reference`);
    }
    if (asset.visualBrief?.provenanceStatus !== "draft_not_public" || asset.visualBrief?.accessibility?.altTextProvided !== true) {
      errors.push(`asset ${asset.id} must retain draft provenance and alt text`);
    }
    if (asset.format === "short_video") {
      const storyboard = asset.visualBrief?.storyboard || [];
      if (typeof asset.visualBrief?.durationSecondsMax !== "number" || asset.visualBrief.durationSecondsMax > 30 || storyboard.length !== 3) {
        errors.push(`short video ${asset.id} requires a maximum duration and a three-scene storyboard`);
      }
      if (!["vi", "en"].every((locale) => hasText(asset.visualBrief?.captionTranscript?.[locale]))) {
        errors.push(`short video ${asset.id} requires bilingual caption transcripts`);
      }
    }
    for (const field of ["hypothesis", "primaryMetric", "denominator"]) if (!hasText(asset.measurement?.[field])) errors.push(`asset ${asset.id} requires measurement.${field}`);
    if (!Array.isArray(asset.measurement?.guardrails) || asset.measurement.guardrails.length === 0) errors.push(`asset ${asset.id} requires measurement guardrails`);
    if (!hasText(asset.productionRecord?.skillVersion) || !hasText(asset.productionRecord?.source) || typeof asset.productionRecord?.timeEstimateMinutes !== "number") {
      errors.push(`asset ${asset.id} requires a transparent production record`);
    }
    if (asset.qa?.automatedVerdict !== "pass" || !["pass_pending_human", "human_review_required"].includes(asset.qa?.independentQaStatus)) {
      errors.push(`asset ${asset.id} must remain automation-passed and pending human review`);
    }
    if (!Array.isArray(asset.qa?.hardFailureCodes) || asset.qa.hardFailureCodes.length !== 0) errors.push(`asset ${asset.id} contains a hard failure`);
    // Existing Nilaza Sprint 01 records predate the portable locale-aware key.
    // Keep that historical library readable while every portable tenant uses the
    // canonical `brand_locale_editorial_quality` dimension.
    const softScores = { ...(asset.qa?.softScores || {}) };
    if (
      !Object.hasOwn(softScores, "brand_locale_editorial_quality") &&
      typeof softScores.brand_bilingual_editorial_quality === "number"
    ) {
      softScores.brand_locale_editorial_quality = softScores.brand_bilingual_editorial_quality;
    }
    const scoreValues = [];
    for (const dimension of requiredSoftDimensions) {
      const score = softScores[dimension];
      if (typeof score !== "number" || score < 3 || score > 4) errors.push(`asset ${asset.id} has invalid ${dimension} score`);
      else scoreValues.push(score);
    }
    if (scoreValues.length === requiredSoftDimensions.length) {
      const mean = scoreValues.reduce((total, score) => total + score, 0) / scoreValues.length;
      if (mean < 3.25) errors.push(`asset ${asset.id} does not meet the internal quality threshold (${mean.toFixed(2)})`);
    }
    if (asset.qa?.repairCycles > 2) errors.push(`asset ${asset.id} exceeded repair-cycle budget`);
    if (asset.approval?.status !== "not_submitted" || asset.approval?.artifactHash !== null || asset.approval?.targetChannel !== null || asset.approval?.expiry !== null) {
      errors.push(`asset ${asset.id} cannot have an execution approval in Sprint 01`);
    }
    if (asset.externalReadiness?.status !== "blocked" || !Array.isArray(asset.externalReadiness?.blockingGates) || asset.externalReadiness.blockingGates.length === 0) {
      errors.push(`asset ${asset.id} must explicitly block external readiness`);
    } else {
      blockedAssetCount += 1;
    }
  }
  if (assetIds.size !== 12) errors.push("Sprint 01 requires exactly twelve Nilaza internal concept/copy packages");
  return { assetCount: assetIds.size, blockedAssetCount };
};

export const validateGrowthPilot = (workspaceRoot = process.cwd()) => {
  const frameworkResult = validateGrowthFramework(workspaceRoot);
  const errors = [...frameworkResult.errors];
  const tenantResult = validateNilazaTenant(workspaceRoot, errors);
  return {
    errors,
    summary: {
      frameworkIntegrity: frameworkResult.errors.length === 0 ? "pass" : "fail",
      nilazaInternalDraftLibrary: errors.length === 0 ? "automation_pass_pending_human_review" : "fail",
      nilazaExternalMarketing: "blocked_by_product_and_execution_gates",
      nilazaAssetCount: tenantResult.assetCount,
      externallyBlockedAssetCount: tenantResult.blockedAssetCount,
      adversarialFixtureCount: 17,
      secondBusiness: "synthetic_template_only_not_a_live_business"
    }
  };
};

const runAsCli = () => {
  const workspaceFlagIndex = process.argv.indexOf("--workspace");
  const workspaceRoot = workspaceFlagIndex >= 0 ? path.resolve(process.argv[workspaceFlagIndex + 1] || process.cwd()) : process.cwd();
  const result = validateGrowthPilot(workspaceRoot);
  if (result.errors.length) {
    console.error("Growth pilot validation failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Growth pilot validation passed (${result.summary.nilazaAssetCount} Nilaza concept/copy packages, ${result.summary.adversarialFixtureCount} adversarial fixtures).`);
  console.log("Framework integrity: pass. Nilaza draft library: automation pass; human review still required.");
  console.log("External marketing: blocked by product and execution gates; no publishing, sending or paid spend is authorized.");
  console.log("Second business: synthetic onboarding template only; no live tenant data is present.");
};

if (path.resolve(process.argv[1] || "") === path.resolve(modulePath)) runAsCli();
