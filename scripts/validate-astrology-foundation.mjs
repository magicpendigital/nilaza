import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const visualSystemPath = path.join(repoRoot, "packages", "content", "data", "astrology-visual-system.json");
const fixturesPath = path.join(repoRoot, "packages", "content", "data", "astrology-chart-fixtures.json");
const contractPath = path.join(repoRoot, "docs", "A1_ASTROLOGY_CHART_CONTRACT_2026-09-20.json");

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${label}: cannot parse JSON (${error.message})`);
    return null;
  }
}

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const expectedSigns = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];
const supportedBodies = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const supportedAngles = ["ascendant", "midheaven"];
const supportedAspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const fixtureOnlyStatus = "fixture_only_not_calculation_verified";
const mojibakePattern = /[\u00c2\u00c3]|\u00e1[\u00ba\u00bb]|[\u00c4\u00c6]/;

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function assertLocalized(value, label) {
  assert(value && hasText(value.vi), `${label}: missing Vietnamese text`);
  assert(value && hasText(value.en), `${label}: missing English text`);
}

function scanStrings(value, label) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanStrings(item, `${label}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => scanStrings(item, `${label}.${key}`));
    return;
  }
  if (typeof value === "string" && mojibakePattern.test(value)) errors.push(`${label}: appears to contain mojibake`);
}

function signForLongitude(longitude) {
  return expectedSigns[Math.floor(longitude / 30) % 12];
}

function circularDistance(left, right) {
  const difference = Math.abs(left - right) % 360;
  return Math.min(difference, 360 - difference);
}

function expectedAspectSeparation(type) {
  return {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180
  }[type];
}

function validateVisualSystem(system, contract) {
  if (!system) return;

  assert(system.schemaVersion === "nilaza.astrology.visual-system.v1", "visual system: unsupported schemaVersion");
  assert(["device_review_candidate"].includes(system.status), "visual system: must stay a non-production foundation");
  assertLocalized(system.title, "visual system.title");
  assertLocalized(system.purpose, "visual system.purpose");
  assertLocalized(system.chartLanguage?.primaryTerm, "visual system.chartLanguage.primaryTerm");
  assertLocalized(system.chartLanguage?.zodiacBoundary, "visual system.chartLanguage.zodiacBoundary");

  assert(system.canonicalChart?.contractId === contract?.contractId, "visual system: contractId must match canonical chart draft");
  assert(system.canonicalChart?.contractVersion === currentSchema?.properties?.contractVersion?.const, "visual system: contractVersion must match canonical chart draft");
  assert(system.canonicalChart?.requiresCalculationStatus === true, "visual system: renderer must require calculationStatus");
  assert(system.canonicalChart?.requiresProvenance === true, "visual system: renderer must require provenance");
  assert(Array.isArray(system.canonicalChart?.allowedRendererInputs) && system.canonicalChart.allowedRendererInputs.length >= 5, "visual system: renderer inputs are incomplete");

  assert(system.factAndArtBoundary?.artworkCannotOverrideFacts === true, "visual system: artworkCannotOverrideFacts must be true");
  assert(system.factAndArtBoundary?.noAiArtworkAsAstronomicalFacts === true, "visual system: noAiArtworkAsAstronomicalFacts must be true");
  assert(Array.isArray(system.factAndArtBoundary?.rules) && system.factAndArtBoundary.rules.length >= 3, "visual system: fact/art rules are incomplete");
  for (const rule of system.factAndArtBoundary?.rules || []) {
    assert(hasText(rule.id), "visual system: fact/art rule id is required");
    assertLocalized(rule, `visual system.factAndArtBoundary.${rule.id || "unknown"}`);
  }

  assert(system.visualGate?.status === "pending_owner_native_and_cloud_review", "visual system: Visual Gate must remain blocked");
  assertLocalized(system.visualGate, "visual system.visualGate");
  const gateIds = new Set((system.visualGate?.requirements || []).map((requirement) => requirement.id));
  for (const requirement of ["g-a3-canonical-facts", "approved-storyboard", "licensed-art-layer", "renderer-spike", "native-accessibility-performance"]) {
    assert(gateIds.has(requirement), `visual system: missing Visual Gate requirement ${requirement}`);
  }
  for (const requirement of system.visualGate?.requirements || []) {
    assertLocalized(requirement, `visual system.visualGate.${requirement.id || "unknown"}`);
  }

  assert(Array.isArray(system.interactionBlueprint) && system.interactionBlueprint.length === 3, "visual system: exactly three storyboard interactions are required");
  for (const interaction of system.interactionBlueprint || []) {
    assert(hasText(interaction.id), "visual system: interaction id is required");
    assert(interaction.status === "implemented_pending_native_review", `visual system: ${interaction.id || "unknown"} must record implemented interactions awaiting native review`);
    assertLocalized(interaction, `visual system.interaction.${interaction.id || "unknown"}`);
  }

  for (const requiredKey of ["reducedMotionRequired", "screenReaderLabelsRequired", "largeTextListFallbackRequired", "semanticPositionMustNotDependOnMotion"]) {
    assert(system.accessibility?.[requiredKey] === true, `visual system.accessibility.${requiredKey} must be true`);
  }

  const sourceIds = new Set();
  for (const source of system.sourceRegistry || []) {
    assert(hasText(source.id), "visual system: source id is required");
    assert(!sourceIds.has(source.id), `visual system: duplicate source id ${source.id}`);
    sourceIds.add(source.id);
    assert(hasText(source.title), `visual system: ${source.id || "source"} title is required`);
    assert(/^https:\/\//.test(source.url || ""), `visual system: ${source.id || "source"} must use an https source URL`);
    assertLocalized(source.usage, `visual system.source.${source.id || "unknown"}.usage`);
    assert(hasText(source.rightsStatus), `visual system: ${source.id || "source"} rightsStatus is required`);
    assert(hasText(source.reviewStatus), `visual system: ${source.id || "source"} reviewStatus is required`);
  }
  assert(sourceIds.size >= 2, "visual system: at least two provenance sources are required");

  const signIds = new Set();
  const chapterIds = new Set();
  for (const [index, sign] of (system.signRegistry || []).entries()) {
    assert(sign.id === expectedSigns[index], `visual system: sign at order ${index + 1} must be ${expectedSigns[index]}`);
    assert(sign.order === index + 1, `visual system: ${sign.id || "sign"} has the wrong order`);
    assert(!signIds.has(sign.id), `visual system: duplicate sign id ${sign.id}`);
    signIds.add(sign.id);
    assert(hasText(sign.glyph), `visual system: ${sign.id || "sign"} glyph is required`);
    assertLocalized(sign.name, `visual system.sign.${sign.id || "unknown"}.name`);
    assert(hasText(sign.chapterId), `visual system: ${sign.id || "sign"} chapterId is required`);
    assert(!chapterIds.has(sign.chapterId), `visual system: duplicate chapterId ${sign.chapterId}`);
    chapterIds.add(sign.chapterId);
    assert(sign.chapterStatus === "bilingual_deep_reading_candidate", `visual system: ${sign.id || "sign"} has an invalid chapterStatus`);
    assert(sign.assetStatus === "produced_owner_review_pending", `visual system: ${sign.id || "sign"} must identify owner artwork review as pending`);
  }
  assert(signIds.size === expectedSigns.length, "visual system: registry must contain every zodiac sign exactly once");

  const chapters = system.chapters || [];
  assert(chapters.length === 12, "visual system: candidate must contain all twelve chapters");
  for (const chapter of chapters) {
    assert(chapterIds.has(chapter.id), `visual system: chapter ${chapter.id || "unknown"} is not mapped by the sign registry`);
    assert(expectedSigns.includes(chapter.signId), "visual system: chapter has an unknown sign");
    assert(chapter.status === "owner_review_candidate", "visual system: chapter must remain an internal prototype");
    assertLocalized(chapter.title, `visual system.chapter.${chapter.id || "unknown"}.title`);
    assertLocalized(chapter.summary, `visual system.chapter.${chapter.id || "unknown"}.summary`);
    assertLocalized(chapter.mythologyContext, `visual system.chapter.${chapter.id || "unknown"}.mythologyContext`);
    assertLocalized(chapter.chartFactBoundary, `visual system.chapter.${chapter.id || "unknown"}.chartFactBoundary`);
    assert(Array.isArray(chapter.sources) && chapter.sources.length >= 2, `visual system: ${chapter.id || "chapter"} needs provenance sources`);
    for (const sourceId of chapter.sources || []) assert(sourceIds.has(sourceId), `visual system: ${chapter.id || "chapter"} references unknown source ${sourceId}`);
    assert(chapter.artwork?.status === "produced_owner_review_pending", `visual system: ${chapter.id || "chapter"} artwork must be produced and awaiting owner review`);
    assert(hasText(chapter.artwork?.assetPath) && fs.existsSync(path.join(repoRoot, chapter.artwork.assetPath)), `visual system: ${chapter.id || "chapter"} must attach an existing artwork path`);
    assert(hasText(chapter.artwork?.provenanceStatus), `visual system: ${chapter.id || "chapter"} needs artwork provenance status`);
    assertLocalized(chapter.artwork?.altText, `visual system.chapter.${chapter.id || "unknown"}.artwork.altText`);
  }
}

function validateFixture(fixture, contract) {
  const label = `fixture.${fixture?.id || "unknown"}`;
  assert(hasText(fixture?.id), "fixture: id is required");
  assert(fixture?.kind === "synthetic_internal_fixture", `${label}: kind must be synthetic_internal_fixture`);
  assert(fixture?.isSynthetic === true, `${label}: isSynthetic must be true`);
  assert(fixture?.calculationStatus === fixtureOnlyStatus, `${label}: must remain fixture-only`);
  assertLocalized(fixture?.title, `${label}.title`);
  assertLocalized(fixture?.purpose, `${label}.purpose`);

  assert(fixture?.provenance?.source === "manually_authored_synthetic_geometry_fixture", `${label}: invalid provenance source`);
  assert(fixture?.provenance?.notAstronomicalReference === true, `${label}: must not claim an astronomical reference`);
  assert(fixture?.provenance?.reproducibleFromRepository === true, `${label}: must be reproducible from the repository`);
  assertLocalized(fixture?.provenance, `${label}.provenance`);
  assert(fixture?.privacy?.hasUserLinkage === false, `${label}: must have no user linkage`);
  assert(fixture?.privacy?.containsRawBirthData === false, `${label}: must not contain raw birth data`);
  for (const allowedUse of ["internal_geometry_test", "internal_accessibility_test", "internal_renderer_prototype"]) {
    assert(fixture?.privacy?.allowedUse?.includes(allowedUse), `${label}: missing allowed use ${allowedUse}`);
  }
  for (const forbiddenUse of ["personal_report", "analytics_payload", "llm_context", "marketing_claim", "production_seed"]) {
    assert(fixture?.privacy?.forbiddenUse?.includes(forbiddenUse), `${label}: missing forbidden use ${forbiddenUse}`);
  }

  const chart = fixture?.chart;
  assert(chart?.calculationStatus === fixtureOnlyStatus, `${label}.chart: calculationStatus must stay fixture-only`);
  assert(chart?.conventions?.zodiac === contract?.conventions?.zodiac, `${label}.chart: zodiac must match canonical draft`);
  assert(chart?.conventions?.coordinateFrame === contract?.conventions?.coordinateFrame, `${label}.chart: coordinateFrame must match canonical draft`);
  assert(chart?.conventions?.houseSystem === contract?.conventions?.houseSystem, `${label}.chart: houseSystem must match canonical draft`);
  assert(chart?.conventions?.aspectDefinitionsVersion === contract?.conventions?.aspectDefinitionsVersion, `${label}.chart: aspectDefinitionsVersion must match canonical draft`);

  const placementIds = new Set();
  for (const placement of chart?.placements || []) {
    assert(supportedBodies.includes(placement.body), `${label}.placements: unsupported body ${placement.body}`);
    assert(!placementIds.has(placement.body), `${label}.placements: duplicate body ${placement.body}`);
    placementIds.add(placement.body);
    assert(Number.isFinite(placement.longitude) && placement.longitude >= 0 && placement.longitude < 360, `${label}.placements.${placement.body}: longitude must be in [0, 360)`);
    assert(placement.sign === signForLongitude(placement.longitude), `${label}.placements.${placement.body}: sign does not match longitude`);
    assert(Number.isFinite(placement.degree) && placement.degree >= 0 && placement.degree < 30, `${label}.placements.${placement.body}: degree must be in [0, 30)`);
    assert(Math.abs(placement.degree - (placement.longitude % 30)) < 0.000001, `${label}.placements.${placement.body}: degree must match longitude`);
    assert(Number.isInteger(placement.minute) && placement.minute >= 0 && placement.minute < 60, `${label}.placements.${placement.body}: minute must be in [0, 60)`);
    assert(Number.isInteger(placement.house) && placement.house >= 1 && placement.house <= 12, `${label}.placements.${placement.body}: house must be in [1, 12]`);
    assert(placement.confidence === "fixture_only", `${label}.placements.${placement.body}: confidence must be fixture_only`);
  }
  assert(placementIds.size === supportedBodies.length, `${label}: needs every supported planetary body exactly once`);

  const angleIds = new Set();
  for (const angle of chart?.angles || []) {
    assert(supportedAngles.includes(angle.key), `${label}.angles: unsupported angle ${angle.key}`);
    assert(!angleIds.has(angle.key), `${label}.angles: duplicate angle ${angle.key}`);
    angleIds.add(angle.key);
    assert(Number.isFinite(angle.longitude) && angle.longitude >= 0 && angle.longitude < 360, `${label}.angles.${angle.key}: longitude must be in [0, 360)`);
    assert(angle.sign === signForLongitude(angle.longitude), `${label}.angles.${angle.key}: sign does not match longitude`);
    assert(Number.isFinite(angle.degree) && angle.degree >= 0 && angle.degree < 30, `${label}.angles.${angle.key}: degree must be in [0, 30)`);
    assert(Math.abs(angle.degree - (angle.longitude % 30)) < 0.000001, `${label}.angles.${angle.key}: degree must match longitude`);
    assert(angle.confidence === "fixture_only", `${label}.angles.${angle.key}: confidence must be fixture_only`);
  }
  assert(angleIds.size === supportedAngles.length, `${label}: needs ascendant and midheaven exactly once`);

  const houseNumbers = new Set();
  for (const house of chart?.houses || []) {
    assert(Number.isInteger(house.number) && house.number >= 1 && house.number <= 12, `${label}.houses: house number must be in [1, 12]`);
    assert(!houseNumbers.has(house.number), `${label}.houses: duplicate house ${house.number}`);
    houseNumbers.add(house.number);
    assert(Number.isFinite(house.cuspLongitude) && house.cuspLongitude >= 0 && house.cuspLongitude < 360, `${label}.houses.${house.number}: cuspLongitude must be in [0, 360)`);
    assert(house.sign === signForLongitude(house.cuspLongitude), `${label}.houses.${house.number}: sign does not match cuspLongitude`);
    assert(house.confidence === "fixture_only", `${label}.houses.${house.number}: confidence must be fixture_only`);
  }
  assert(houseNumbers.size === 12, `${label}: needs twelve houses`);

  const coordinates = new Map([
    ...chart?.placements?.map((placement) => [placement.body, placement.longitude]) || [],
    ...chart?.angles?.map((angle) => [angle.key, angle.longitude]) || []
  ]);
  const aspectIds = new Set();
  for (const aspect of chart?.aspects || []) {
    const aspectId = `${aspect.bodyA}:${aspect.bodyB}:${aspect.type}`;
    assert(!aspectIds.has(aspectId), `${label}.aspects: duplicate aspect ${aspectId}`);
    aspectIds.add(aspectId);
    assert(coordinates.has(aspect.bodyA) && coordinates.has(aspect.bodyB), `${label}.aspects.${aspectId}: bodies must exist in placements or angles`);
    assert(supportedAspects.includes(aspect.type), `${label}.aspects.${aspectId}: unsupported aspect type`);
    assert(Number.isFinite(aspect.orb) && aspect.orb >= 0 && aspect.orb <= 10, `${label}.aspects.${aspectId}: orb must be in [0, 10]`);
    assert(Number.isFinite(aspect.exactSeparation) && aspect.exactSeparation >= 0 && aspect.exactSeparation <= 180, `${label}.aspects.${aspectId}: exactSeparation must be in [0, 180]`);
    if (coordinates.has(aspect.bodyA) && coordinates.has(aspect.bodyB) && supportedAspects.includes(aspect.type)) {
      const separation = circularDistance(coordinates.get(aspect.bodyA), coordinates.get(aspect.bodyB));
      assert(Math.abs(separation - aspect.exactSeparation) < 0.000001, `${label}.aspects.${aspectId}: exactSeparation does not match the fixture coordinates`);
      assert(Math.abs(Math.abs(separation - expectedAspectSeparation(aspect.type)) - aspect.orb) < 0.000001, `${label}.aspects.${aspectId}: orb does not match the aspect type and coordinates`);
    }
    assert(aspect.confidence === "fixture_only", `${label}.aspects.${aspectId}: confidence must be fixture_only`);
  }
  assert((chart?.aspects || []).length >= 5, `${label}: needs at least five aspect lines for geometry testing`);

  const uncertainty = chart?.uncertainties?.find((item) => item.messageKey === fixtureOnlyStatus);
  assert(uncertainty?.severity === "blocking", `${label}: a blocking fixture-only uncertainty is required`);
  assert(Array.isArray(uncertainty?.affects) && uncertainty.affects.includes("visual") && uncertainty.affects.includes("interpretation"), `${label}: fixture-only uncertainty must affect visual and interpretation`);

  assert(fixture?.visualTestExpectations?.requiresListFallback === true, `${label}: list fallback must be required`);
  assert(Array.isArray(fixture?.visualTestExpectations?.expectedDenseClusters) && fixture.visualTestExpectations.expectedDenseClusters.includes("aries"), `${label}: Aries collision cluster is required`);
  for (const prohibitedPresentation of ["verified_personal_chart", "astrological_accuracy_claim", "artwork_as_fact"]) {
    assert(fixture?.visualTestExpectations?.prohibitedPresentation?.includes(prohibitedPresentation), `${label}: missing prohibited presentation ${prohibitedPresentation}`);
  }
}

function assertNoUserLinkageKeys(value, label) {
  const forbiddenKeys = new Set(["userid", "user_id", "birthdate", "birthtime", "birthplace", "birthprofile", "email", "phone", "latitude", "timezone", "geocodeplaceid"]);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUserLinkageKeys(item, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    assert(!forbiddenKeys.has(key.toLowerCase()), `${label}: forbidden user-linkage/raw-birth key ${key}`);
    assertNoUserLinkageKeys(item, `${label}.${key}`);
  }
}

const visualSystem = readJson(visualSystemPath, "astrology visual system");
const fixtures = readJson(fixturesPath, "astrology chart fixtures");
const contract = readJson(contractPath, "canonical chart contract");

const currentSchema = readJson(path.join(repoRoot,"packages/astrology-core/chart.schema.json"),"current runtime schema");
validateVisualSystem(visualSystem, contract);

if (fixtures) {
  assert(fixtures.schemaVersion === "nilaza.astrology.chart-fixtures.v1", "fixtures: unsupported schemaVersion");
  assert(fixtures.status === "internal_geometry_foundation_only", "fixtures: must remain an internal geometry foundation");
  assert(fixtures.canonicalChart?.contractId === contract?.contractId, "fixtures: contractId must match canonical chart draft");
  assert(fixtures.canonicalChart?.contractVersion === contract?.contractVersion, "fixtures: contractVersion must match canonical chart draft");
  assert(fixtures.fixturePolicy?.kind === "synthetic_internal_fixture", "fixtures: policy kind must be synthetic_internal_fixture");
  assert(fixtures.fixturePolicy?.isSynthetic === true, "fixtures: policy must be synthetic");
  assert(fixtures.fixturePolicy?.noUserLinkage === true, "fixtures: policy must prohibit user linkage");
  assert(fixtures.fixturePolicy?.calculationStatus === fixtureOnlyStatus, "fixtures: policy must remain fixture-only");
  assertLocalized(fixtures.fixturePolicy, "fixtures.fixturePolicy");
  assert(Array.isArray(fixtures.fixtures) && fixtures.fixtures.length === 1, "fixtures: foundation must contain exactly one synthetic fixture");
  for (const fixture of fixtures.fixtures || []) {
    validateFixture(fixture, contract);
    assertNoUserLinkageKeys(fixture, `fixture.${fixture.id || "unknown"}`);
  }
}

scanStrings(visualSystem, "visual system");
scanStrings(fixtures, "fixtures");

if (errors.length > 0) {
  console.error("Astrology foundation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Astrology foundation validation passed: 1 synthetic fixture, 12-sign registry, 12 deep chapters and art assets, production Visual Gate pending owner/native/cloud review. Interactive library is validated separately.");
