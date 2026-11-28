import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const readJson = (relativePath) => {
  const fullPath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
};

const decks = readJson("packages/content/data/tarot-decks.json");
const cards = readJson("packages/content/data/tarot-cards.json");
const figures = readJson("packages/content/data/personas-figures.json");
const books = readJson("packages/content/data/personas-books.json");
const archetypes = readJson("packages/content/data/personas-archetypes.json");
const allPersonas = [...figures, ...books, ...archetypes];
const personaDetailContent = readJson("packages/content/data/persona-detail-content.json");
const productAgents = readJson("packages/agent-config/product-agents.json");
const codingAgents = readJson("packages/agent-config/coding-agents.json");
const safetyRules = readJson("packages/agent-config/safety-rules.json");
const featureWorkflows = readJson("packages/agent-config/feature-workflows.json");
const promptLibrary = readJson("packages/agent-config/prompt-library.json");
const aiCouncilConfig = readJson("packages/agent-config/ai-council.json");
const councilContract = readJson("packages/agent-config/council-contract.json");
const modelRoutes = readJson("packages/agent-config/model-routing.json");
const oracleActions = readJson("packages/agent-config/oracle-actions.json");
const adminMetrics = readJson("packages/agent-config/admin-metrics.json");
const astrologyStrategy = readJson("packages/content/data/astrology-strategy.json");
const tarotRoadmap = readJson("packages/content/data/tarot-library-roadmap.json");
const personaResearchQueue = readJson("packages/content/data/persona-research-queue.json");
const tarotCardDesigns = readJson("packages/content/data/tarot-card-designs.json");
const tarotDeckBacks = readJson("packages/content/data/tarot-deck-backs.json");
const tarotCardSkills = readJson("packages/agent-config/tarot-card-skills.json");
const roseMirrorMvpTestData = readJson("packages/content/data/rose-mirror-mvp-test-data.json");
const goldenThreadMvpTestData = readJson("packages/content/data/golden-thread-mvp-test-data.json");
const starSeekerMvpTestData = readJson("packages/content/data/star-seeker-mvp-test-data.json");
const stellarAcademyMvpTestData = readJson("packages/content/data/stellar-mosaic-mvp-test-data.json");

const errors = [];
const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const vietnameseDiacriticPattern = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const mojibakePattern = /[\u00c2\u00c3]|\u00e1[\u00ba\u00bb]|[\u00c4\u00c6]/;
const visibleTarotViFields = ["intro", "personalityPortrait", "uprightMeaning", "reversedMeaning", "reflectionQuestion"];
let legacyAsciiTarotViFields = 0;
let mojibakeStringCount = 0;
const contentSafetyIssues = [];

const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

const assertLocalized = (value, label) => {
  assert(value && hasText(value.vi), `${label} is missing vi text`);
  assert(value && hasText(value.en), `${label} is missing en text`);
};

const assertLocalizedList = (value, label) => {
  assert(value && Array.isArray(value.vi) && value.vi.length > 0, `${label} is missing vi list`);
  assert(value && Array.isArray(value.en) && value.en.length > 0, `${label} is missing en list`);
};

const countMojibakeStrings = (value) => {
  if (Array.isArray(value)) {
    for (const item of value) countMojibakeStrings(item);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) countMojibakeStrings(item);
    return;
  }
  if (typeof value === "string" && mojibakePattern.test(value)) mojibakeStringCount += 1;
};

const allowedSafetyContext = (text) => {
  const normalized = text.toLowerCase();
  return [
    "không phải dự đoán chắc chắn",
    "không phải",
    "không đưa ra dự đoán chắc chắn",
    "không nói",
    "không nói về tương lai chắc chắn",
    "không hứa hẹn",
    "không biến",
    "không phải định mệnh",
    "không phải lời tiên tri",
    "tránh",
    "avoid",
    "do not",
    "does not",
    "not a certain prediction",
    "no fixed destiny",
    "without making predictions",
    "without turning"
  ].some((phrase) => normalized.includes(phrase));
};

const highRiskContentRules = [
  { id: "attract_outcome_vi", pattern: /thu hút\s+(tình yêu|tiền bạc|tài lộc|may mắn|người yêu)/i },
  { id: "cure_claim_vi", pattern: /(chữa khỏi|chữa bệnh|trị khỏi|điều trị)\b/i },
  { id: "fixed_fate_vi", pattern: /(định mệnh|vận mệnh|số mệnh|số phận)\s+không thể thay đổi/i },
  { id: "certain_future_vi", pattern: /(chắc chắn sẽ|sẽ chắc chắn|dự báo chắc chắn|tiên tri chắc chắn)/i },
  { id: "destiny_claim_en", pattern: /(messages? of destiny|guiding destiny|beautiful destiny|unlock[a-z\s]+destiny)/i },
  { id: "guarantee_claim_en", pattern: /\b(guarantee|guaranteed|guarantees)\s+(love|money|future|outcome|result|healing)\b/i }
];

const scanContentSafety = (value, label) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanContentSafety(item, `${label}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) scanContentSafety(item, `${label}.${key}`);
    return;
  }
  if (typeof value !== "string") return;

  for (const rule of highRiskContentRules) {
    if (rule.pattern.test(value) && !allowedSafetyContext(value)) {
      contentSafetyIssues.push(`${label} matches ${rule.id}: ${value.slice(0, 140)}`);
    }
  }
};

const readPngSize = (relativePath) => {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const buffer = fs.readFileSync(fullPath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

assert(decks.length >= 7, `Expected at least 7 tarot decks, found ${decks.length}`);
assert(cards.length === 78, `Expected 78 tarot cards, found ${cards.length}`);
assert(cards.filter((card) => card.arcana === "major").length === 22, "Expected 22 Major Arcana cards");
assert(cards.filter((card) => card.arcana === "minor").length === 56, "Expected 56 Minor Arcana cards");
assert(figures.length >= 5, `Expected at least 5 historical figures, found ${figures.length}`);
assert(books.length >= 5, `Expected at least 5 book-inspired guides, found ${books.length}`);
assert(archetypes.length >= 3, `Expected at least 3 archetype guides, found ${archetypes.length}`);
assert(archetypes.some((persona) => persona.slug === "the-mystic"), "Archetype guides must include the-mystic");
assert(archetypes.some((persona) => persona.slug === "the-astrologer"), "Archetype guides must include the-astrologer");
assert(archetypes.some((persona) => persona.slug === "inner-child-healer"), "Archetype guides must include inner-child-healer");
assert(productAgents.length >= 5, `Expected at least 5 product agents, found ${productAgents.length}`);
assert(codingAgents.length >= 5, `Expected at least 5 coding agents, found ${codingAgents.length}`);
assert(featureWorkflows.length >= 4, `Expected at least 4 feature workflows, found ${featureWorkflows.length}`);
assert(promptLibrary.length >= 4, `Expected at least 4 prompt templates, found ${promptLibrary.length}`);
assert(aiCouncilConfig.id === "ai_council", "AI Council config id must be ai_council");
assert(aiCouncilConfig.status === "active", "AI Council config must be active for MVP operations");
assert(hasText(aiCouncilConfig.configVersion), "AI Council configVersion is missing");
assert(aiCouncilConfig.contractRef === councilContract.id, "AI Council must reference the canonical Council contract");
assert(councilContract.id === "ai_council_contract", "Council contract id is invalid");
assert(hasText(councilContract.version), "Council contract version is missing");
assert(councilContract.endpoint === "/ai/ai-council", "Council contract endpoint must be /ai/ai-council");
assert(councilContract.responseSchema === "ai_council_rounds_v2", "Council contract schema must be ai_council_rounds_v2");
assert(hasText(councilContract.promptVersionId), "Council contract promptVersionId is missing");
assertLocalized(aiCouncilConfig.name, "aiCouncilConfig.name");
assertLocalized(aiCouncilConfig.description, "aiCouncilConfig.description");
assertLocalized(aiCouncilConfig.emptyState, "aiCouncilConfig.emptyState");
assertLocalizedList(aiCouncilConfig.turnPolicy, "aiCouncilConfig.turnPolicy");
assertLocalizedList(aiCouncilConfig.safetyBoundaries, "aiCouncilConfig.safetyBoundaries");
assert(Number.isInteger(aiCouncilConfig.maxGuidesPerTurn) && aiCouncilConfig.maxGuidesPerTurn >= 2, "AI Council needs at least 2 guides per turn");
assert(Number.isInteger(aiCouncilConfig.maxTranscriptTurns) && aiCouncilConfig.maxTranscriptTurns >= 16, "AI Council transcript cap is too low");
assert(Array.isArray(aiCouncilConfig.contextPolicy?.allowed) && aiCouncilConfig.contextPolicy.allowed.includes("selectedCouncilPersonas"), "AI Council context policy must allow selectedCouncilPersonas");
assert(Array.isArray(aiCouncilConfig.contextPolicy?.allowed) && aiCouncilConfig.contextPolicy.allowed.includes("councilTemplate"), "AI Council context policy must allow councilTemplate");
assert(Array.isArray(aiCouncilConfig.contextPolicy?.disabledByDefault) && aiCouncilConfig.contextPolicy.disabledByDefault.includes("rawPrivateChat"), "AI Council context policy must disable rawPrivateChat by default");
assert(Array.isArray(aiCouncilConfig.councilTemplates) && aiCouncilConfig.councilTemplates.length >= 4, "AI Council needs at least 4 council templates");
assert(aiCouncilConfig.councilTemplates.some((template) => template.id === aiCouncilConfig.defaultTemplateId), "AI Council defaultTemplateId must match a council template");
assert(adminMetrics.events.length >= 8, `Expected at least 8 admin events, found ${adminMetrics.events.length}`);
assert(oracleActions.id === "nilaza_oracle_actions", "Oracle actions config id must be nilaza_oracle_actions");
assertLocalized(oracleActions.description, "oracleActions.description");
assert(Array.isArray(oracleActions.actions) && oracleActions.actions.length >= 5, "Oracle actions needs at least 5 actions");
assert(astrologyStrategy.options.length >= 4, `Expected at least 4 astrology options, found ${astrologyStrategy.options.length}`);
assert(tarotRoadmap.nextDecks.length >= 3, `Expected at least 3 tarot roadmap decks, found ${tarotRoadmap.nextDecks.length}`);
assert(personaResearchQueue.nextCandidates.length >= 3, `Expected at least 3 persona research candidates, found ${personaResearchQueue.nextCandidates.length}`);
assertLocalized(safetyRules.globalDisclaimers, "safetyRules.globalDisclaimers");
assertLocalized(astrologyStrategy.mvpRecommendation, "astrologyStrategy.mvpRecommendation");
assertLocalizedList(tarotRoadmap.principles, "tarotRoadmap.principles");
assert(tarotCardDesigns.length === decks.length, `Expected ${decks.length} tarot card design sets, found ${tarotCardDesigns.length}`);
assert(tarotDeckBacks.length === decks.length, `Expected ${decks.length} tarot deck backs, found ${tarotDeckBacks.length}`);
assert(tarotCardSkills.skills.length >= 6, `Expected at least 6 tarot card skills, found ${tarotCardSkills.skills.length}`);
assertLocalized(tarotCardSkills.purpose, "tarotCardSkills.purpose");
assertLocalized(tarotCardSkills.safetyBoundary, "tarotCardSkills.safetyBoundary");

for (const dataset of [
  decks,
  cards,
  figures,
  books,
  archetypes,
  personaDetailContent,
  productAgents,
  codingAgents,
  safetyRules,
  featureWorkflows,
  promptLibrary,
  aiCouncilConfig,
  modelRoutes,
  oracleActions,
  adminMetrics,
  astrologyStrategy,
  tarotRoadmap,
  personaResearchQueue,
  tarotCardDesigns,
  tarotDeckBacks,
  tarotCardSkills,
  roseMirrorMvpTestData,
  goldenThreadMvpTestData,
  starSeekerMvpTestData,
  stellarAcademyMvpTestData
]) {
  countMojibakeStrings(dataset);
}

for (const [label, dataset] of Object.entries({
  decks,
  cards,
  figures,
  books,
  archetypes,
  personaDetailContent,
  productAgents,
  safetyRules,
  promptLibrary,
  aiCouncilConfig,
  modelRoutes,
  oracleActions,
  adminMetrics,
  astrologyStrategy,
  tarotRoadmap,
  personaResearchQueue,
  tarotCardDesigns,
  tarotDeckBacks,
  tarotCardSkills,
  roseMirrorMvpTestData,
  goldenThreadMvpTestData,
  starSeekerMvpTestData,
  stellarAcademyMvpTestData
})) {
  scanContentSafety(dataset, label);
}

function validateMvpTestData(mvpData, label) {
  assert(decks.some((deck) => deck.id === mvpData.deckId), `${mvpData.deckId} MVP test data does not match a tarot deck`);
  assert(mvpData.status === "testing", `${label}.status must be testing`);
  assertLocalized(mvpData.purpose, `${label}.purpose`);
  assertLocalized(mvpData.deckVoice.promise, `${label}.deckVoice.promise`);
  assertLocalizedList(mvpData.deckVoice.tone, `${label}.deckVoice.tone`);
  assertLocalizedList(mvpData.deckVoice.avoid, `${label}.deckVoice.avoid`);
  assert(Array.isArray(mvpData.spreadTemplates) && mvpData.spreadTemplates.length >= 2, `${label} needs at least 2 spread templates`);
  assert(Array.isArray(mvpData.topicIntents) && mvpData.topicIntents.length >= 5, `${label} needs at least 5 topic intents`);
  assert(Array.isArray(mvpData.testCardPool) && mvpData.testCardPool.length >= mvpData.coverage.minimumCardPool, `${label}.testCardPool is below minimumCardPool`);
  assert(Array.isArray(mvpData.sampleReadings) && mvpData.sampleReadings.length >= mvpData.coverage.sampleReadingCount, `${label}.sampleReadings is below sampleReadingCount`);

  const spreadIds = new Set(mvpData.spreadTemplates.map((spread) => spread.id));
  const topicIds = new Set(mvpData.topicIntents.map((intent) => intent.topic));
  const cardIds = new Set(cards.map((card) => card.id));

  for (const spread of mvpData.spreadTemplates) {
    assert(hasText(spread.id), `${label} spread missing id`);
    assert([1, 3].includes(spread.cardCount), `${spread.id} has unsupported MVP cardCount`);
    assertLocalized(spread.name, `${spread.id}.name`);
    assertLocalized(spread.useCase, `${spread.id}.useCase`);
    assert(Array.isArray(spread.positions) && spread.positions.length === spread.cardCount, `${spread.id}.positions must match cardCount`);
    for (const position of spread.positions) {
      assert(hasText(position.key), `${spread.id} has a position missing key`);
      assertLocalized(position.label, `${spread.id}.${position.key}.label`);
    }
  }

  for (const intent of mvpData.topicIntents) {
    assert(["love", "career", "self", "decision", "open"].includes(intent.topic), `${intent.topic} is not a supported tarot topic`);
    assertLocalized(intent.promptHint, `${label}.${intent.topic}.promptHint`);
  }

  for (const poolCard of mvpData.testCardPool) {
    assert(cardIds.has(poolCard.cardId), `${label}.testCardPool.${poolCard.cardId} does not match a tarot card`);
    assertLocalized(poolCard.roseMirrorAngle, `${label}.${poolCard.cardId}.roseMirrorAngle`);
    assertLocalized(poolCard.visualCue, `${label}.${poolCard.cardId}.visualCue`);
    assert(hasText(poolCard.qaFocus), `${label}.${poolCard.cardId} missing qaFocus`);
  }

  for (const sample of mvpData.sampleReadings) {
    assert(hasText(sample.id), `${label} sample reading missing id`);
    assert(topicIds.has(sample.topic), `${sample.id} topic does not match topicIntents`);
    assert(spreadIds.has(sample.spreadId), `${sample.id} spreadId does not match spreadTemplates`);
    assertLocalized(sample.question, `${sample.id}.question`);
    assertLocalized(sample.fallbackSummary, `${sample.id}.fallbackSummary`);
    assertLocalized(sample.journalTitle, `${sample.id}.journalTitle`);
    assert(Array.isArray(sample.expectedQa) && sample.expectedQa.length > 0, `${sample.id} needs expectedQa checks`);
    assert(Array.isArray(sample.cards) && sample.cards.length > 0, `${sample.id} needs cards`);
    for (const selectedCard of sample.cards) {
      assert(cardIds.has(selectedCard.cardId), `${sample.id}.${selectedCard.cardId} does not match a tarot card`);
      assert(["upright", "reversed"].includes(selectedCard.orientation), `${sample.id}.${selectedCard.cardId} has invalid orientation`);
      assert(hasText(selectedCard.position), `${sample.id}.${selectedCard.cardId} missing position`);
    }
  }
}

validateMvpTestData(roseMirrorMvpTestData, "roseMirrorMvpTestData");
validateMvpTestData(goldenThreadMvpTestData, "goldenThreadMvpTestData");
validateMvpTestData(starSeekerMvpTestData, "starSeekerMvpTestData");
validateMvpTestData(stellarAcademyMvpTestData, "stellarAcademyMvpTestData");

for (const deck of decks) {
  assert(hasText(deck.id), "Deck missing id");
  assert(["free", "premium-preview", "premium"].includes(deck.accessTier), `${deck.id} has invalid accessTier`);
  assertLocalized(deck.name, `${deck.id}.name`);
  assertLocalized(deck.shortDescription, `${deck.id}.shortDescription`);
  assertLocalized(deck.vibe, `${deck.id}.vibe`);
  assertLocalized(deck.visualDirection, `${deck.id}.visualDirection`);
  assertLocalized(deck.readingStyle, `${deck.id}.readingStyle`);
  if (deck.cardIntroductions) {
    const expectedCardIds = new Set(cards.map((card) => card.id));
    const introductionIds = Object.keys(deck.cardIntroductions);
    assert(introductionIds.length === cards.length, `${deck.id} must have an introduction for each of the 78 cards`);
    for (const cardId of introductionIds) {
      assert(expectedCardIds.has(cardId), `${deck.id}.cardIntroductions.${cardId} does not match a tarot card`);
      assertLocalized(deck.cardIntroductions[cardId], `${deck.id}.cardIntroductions.${cardId}`);
    }
  }
}
assert(new Set(decks.map((deck) => deck.id)).size === decks.length, "Tarot deck IDs must be unique");

for (const card of cards) {
  assert(hasText(card.id), "Card missing id");
  assert(["major", "minor"].includes(card.arcana), `${card.id} has invalid arcana`);
  if (card.arcana === "minor") {
    assert(["wands", "cups", "swords", "pentacles"].includes(card.suit), `${card.id} has invalid suit`);
    assert(hasText(card.rank), `${card.id} is missing rank`);
  }
  assertLocalized(card.name, `${card.id}.name`);
  // Owner decision 2026-10-30: Vietnamese UI shows the approved Vietnamese name; name.en stays the canonical original.
  assert(vietnameseDiacriticPattern.test(card.name.vi) && card.name.vi !== card.name.en, `${card.id}.name.vi must be the approved accented Vietnamese name, not "${card.name.en}"`);
  assertLocalized(card.intro, `${card.id}.intro`);
  assertLocalized(card.personalityPortrait, `${card.id}.personalityPortrait`);
  assertLocalized(card.uprightMeaning, `${card.id}.uprightMeaning`);
  assertLocalized(card.reversedMeaning, `${card.id}.reversedMeaning`);
  assertLocalized(card.reflectionQuestion, `${card.id}.reflectionQuestion`);
  assert(Array.isArray(card.keywords.vi) && card.keywords.vi.length > 0, `${card.id}.keywords.vi is empty`);
  assert(Array.isArray(card.keywords.en) && card.keywords.en.length > 0, `${card.id}.keywords.en is empty`);
  for (const field of visibleTarotViFields) {
    const viText = card[field]?.vi;
    if (hasText(viText) && !vietnameseDiacriticPattern.test(viText)) legacyAsciiTarotViFields += 1;
  }
}
// Owner-approved card guide (2026-10-30): one entry per canonical card, accented Vietnamese and English in every field.
const cardGuide = readJson("packages/content/data/tarot-card-guide.json");
assert(Object.keys(cardGuide.cards).length === cards.length && cards.every((card) => cardGuide.cards[card.id]), "tarot-card-guide.json must cover exactly the 78 canonical cards");
for (const [cardId, guide] of Object.entries(cardGuide.cards)) {
  const fields = { ...Object.fromEntries(["love", "career", "self"].map((topic) => [`topics.${topic}`, guide.topics?.[topic]])), misconception: guide.misconception, element: guide.element, astrology: guide.astrology };
  for (const optional of ["otherReadings", "supportNote", "modernPlanet", "extraNote"]) if (guide[optional]) fields[optional] = guide[optional];
  for (const [field, value] of Object.entries(fields)) {
    assertLocalized(value, `${cardId}.guide.${field}`);
    if (!["element", "astrology", "modernPlanet"].includes(field)) assert(vietnameseDiacriticPattern.test(value?.vi ?? ""), `${cardId}.guide.${field}.vi must use accented Vietnamese`);
  }
  for (const key of guide.noteKeys ?? []) assertLocalized(cardGuide.sharedNotes?.[key], `${cardId}.guide.noteKeys.${key}`);
}
// Value report batch B (2026-11-21): the five-layer free reading library. Every text is accented VI + EN, roles cover the
// app's spreads, reversed-topic entries use canonical ids, and no text uses a forbidden certainty or healing claim.
const readingLayers = readJson("packages/content/data/tarot-reading-layers.json");
const layerThemes = ["major", "wands", "cups", "swords", "pentacles"];
const layerTopics = ["love", "career", "self"];
const spreadCardCounts = { "daily-one": 1, "past-present-future": 3, "situation-challenge-advice": 3, "love-three": 3, "crossroads-four": 4 };
const layerForbidden = /(chắc chắn sẽ|định mệnh|vận mệnh|chữa lành|trị liệu|tiên tri|bùa|giải hạn|will definitely|destiny|guaranteed)/i;
const checkLayerText = (value, label) => {
  assertLocalized(value, `reading-layers.${label}`);
  assert(vietnameseDiacriticPattern.test(value?.vi ?? ""), `reading-layers.${label}.vi must use accented Vietnamese`);
  assert(!layerForbidden.test(`${value?.vi ?? ""} ${value?.en ?? ""}`), `reading-layers.${label} uses forbidden certainty or healing wording`);
};
for (const [spreadId, count] of Object.entries(spreadCardCounts)) {
  const roles = readingLayers.positionRoles?.[spreadId];
  assert(Array.isArray(roles) && roles.length === count, `reading-layers.positionRoles.${spreadId} must list ${count} roles`);
  for (const role of roles ?? []) for (const side of ["upright", "reversed"]) {
    checkLayerText(readingLayers.roles?.[role]?.[side], `roles.${role}.${side}`);
    assert((readingLayers.roles?.[role]?.[side]?.vi ?? "").includes("{kw}") && (readingLayers.roles?.[role]?.[side]?.en ?? "").includes("{kw}"), `reading-layers.roles.${role}.${side} must name the card keywords ({kw})`);
  }
  const thread = readingLayers.threads?.[spreadId];
  checkLayerText(thread, `threads.${spreadId}`);
  for (let index = 1; index <= count; index += 1) for (const lang of ["vi", "en"]) assert((thread?.[lang] ?? "").includes(`{card${index}}`), `reading-layers.threads.${spreadId}.${lang} must name card ${index}`);
  const focus = readingLayers.focus?.[spreadId];
  if (count >= 2) {
    checkLayerText(focus?.text, `focus.${spreadId}`);
    assert(Array.isArray(focus?.cards) && focus.cards.length === 2 && focus.cards.every((index) => Number.isInteger(index) && index >= 0 && index < count), `reading-layers.focus.${spreadId}.cards must pick two positions`);
  }
}
checkLayerText(readingLayers.reversedMark, "reversedMark");
checkLayerText(readingLayers.deepHook, "deepHook");
const layerCombos = readingLayers.combinations ?? {};
for (const key of ["majorsMajority", "mixed", "single", "reversedMajority", "courtsMany", "acesMany", "repeatedNumber"]) checkLayerText(layerCombos[key], `combinations.${key}`);
for (const suit of ["wands", "cups", "swords", "pentacles"]) checkLayerText(layerCombos.suit?.[suit], `combinations.suit.${suit}`);
for (const pair of ["fire-water", "air-earth"]) checkLayerText(layerCombos.elementTension?.[pair], `combinations.elementTension.${pair}`);
for (const pair of ["fire-air", "water-earth"]) checkLayerText(layerCombos.elementHarmony?.[pair], `combinations.elementHarmony.${pair}`);
checkLayerText(readingLayers.stepTitle, "stepTitle");
// Batch B completion (2026-11-22): Decision and Open questions have their own small steps and journal questions.
for (const topic of [...layerTopics, "decision", "open"]) for (const theme of layerThemes) {
  checkLayerText(readingLayers.steps?.[topic]?.[theme], `steps.${topic}.${theme}`);
  checkLayerText(readingLayers.journal?.[topic]?.[theme], `journal.${topic}.${theme}`);
}
// Every canonical card has a reversed meaning for each topic, and the Vietnamese text never shows English suit or arcana names.
for (const card of cards) for (const topic of layerTopics) assert(readingLayers.reversedTopics?.[card.id]?.[topic], `reading-layers.reversedTopics.${card.id}.${topic} is missing`);
assert(!/(Cups|Wands|Swords|Pentacles|Arcana)/.test(JSON.stringify(readingLayers, (key, value) => (key === "en" ? undefined : value))), "reading-layers Vietnamese text must use Vietnamese suit and arcana names");
for (const [cardId, entry] of Object.entries(readingLayers.reversedTopics ?? {})) {
  assert(cards.some((card) => card.id === cardId), `reading-layers.reversedTopics.${cardId} is not a canonical card id`);
  for (const topic of Object.keys(entry)) {
    assert(layerTopics.includes(topic), `reading-layers.reversedTopics.${cardId}.${topic} is not a supported topic`);
    checkLayerText(entry[topic], `reversedTopics.${cardId}.${topic}`);
  }
}
// Owner-approved astrology sky content (2026-10-31): Big 3 fragments, Moon-in-house texts and topic placements for all 12 signs.
const zodiacSignIds = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const assertViText = (value, label) => {
  assertLocalized(value, label);
  assert(vietnameseDiacriticPattern.test(value?.vi ?? ""), `${label}.vi must use accented Vietnamese`);
};
const assertPair = (items, label) => {
  assert(Array.isArray(items) && items.length === 2, `${label} must have 2 items`);
  (items ?? []).forEach((item, index) => assertViText(item, `${label}[${index}]`));
};
const skyBig3 = readJson("packages/content/data/astrology-big3.json");
for (const key of ["sun", "moon", "rising"]) assertViText(skyBig3.roles?.[key], `astrology-big3.roles.${key}`);
assertViText(skyBig3.noBirthTime, "astrology-big3.noBirthTime");
assertViText(skyBig3.moonUncertain, "astrology-big3.moonUncertain");
assert(Object.keys(skyBig3.signs).length === 12, "astrology-big3.json must cover exactly 12 signs");
for (const sign of zodiacSignIds) for (const field of ["sunHeadline", "moonClause", "moonNeed", "risingLook"]) assertViText(skyBig3.signs[sign]?.[field], `astrology-big3.${sign}.${field}`);
const skyMoonHouses = readJson("packages/content/data/astrology-moon-houses.json");
assertViText(skyMoonHouses.note, "astrology-moon-houses.note");
assert(Object.keys(skyMoonHouses.houses).length === 12, "astrology-moon-houses.json must cover exactly 12 houses");
for (let house = 1; house <= 12; house += 1) {
  const entry = skyMoonHouses.houses[String(house)];
  assertViText(entry?.title, `astrology-moon-houses.${house}.title`);
  assertViText(entry?.body, `astrology-moon-houses.${house}.body`);
  assertPair(entry?.do, `astrology-moon-houses.${house}.do`);
  assertPair(entry?.avoid, `astrology-moon-houses.${house}.avoid`);
}
// Lô 2 "Bầu trời hôm nay" (spec ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23 section 6.2): 12 Moon signs x 3 decans,
// 7 Moon-Sun relations, 4 phase notes and the screen templates; accented VI + EN with matching placeholders, and the
// banned phrase list (section 6.4) on the daily sky and Moon-house texts.
const dailySky = readJson("packages/content/data/astrology-daily-sky.json");
const placeholdersOf = (text) => [...String(text ?? "").matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");
const assertSkyText = (value, label) => {
  assertViText(value, label);
  assert(placeholdersOf(value?.vi) === placeholdersOf(value?.en), label + " must use the same {placeholders} in vi and en");
};
assert(["draft", "approved"].includes(dailySky.status), "astrology-daily-sky.status must be draft or approved");
assert(dailySky.status !== "approved" || Boolean(dailySky.reviewedBy), "astrology-daily-sky.json approved content needs reviewedBy");
for (const key of ["lean", "ease"]) assertSkyText(dailySky.labels?.[key], "astrology-daily-sky.labels." + key);
for (const key of ["love", "work", "self"]) assertSkyText(dailySky.labels?.topics?.[key], "astrology-daily-sky.labels.topics." + key);
assert(Object.keys(dailySky.moonSign ?? {}).length === 12, "astrology-daily-sky.json must cover exactly 12 Moon signs");
for (const sign of zodiacSignIds) {
  const entry = dailySky.moonSign?.[sign];
  const label = "astrology-daily-sky.moonSign." + sign;
  for (const decan of ["early", "mid", "late"]) assertSkyText(entry?.tone?.[decan], label + ".tone." + decan);
  assertSkyText(entry?.body, label + ".body");
  for (const list of ["lean", "ease"]) {
    assert(Array.isArray(entry?.[list]) && entry[list].length === 4, label + "." + list + " must have 4 items");
    (entry?.[list] ?? []).forEach((item, index) => {
      assert(typeof item?.id === "string" && item.id.length > 0, label + "." + list + "[" + index + "].id is required");
      assertSkyText(item, label + "." + list + "[" + index + "]");
    });
    assert(new Set((entry?.[list] ?? []).map((item) => item.id)).size === (entry?.[list] ?? []).length, label + "." + list + " ids must be unique");
  }
  for (const topic of ["love", "work", "self"]) assertSkyText(entry?.topics?.[topic], label + ".topics." + topic);
  assertSkyText(entry?.journal, label + ".journal");
}
const relationKinds = ["conjunction", "semisextile", "sextile", "square", "trine", "quincunx", "opposition"];
assert(Object.keys(dailySky.relation ?? {}).length === relationKinds.length, "astrology-daily-sky.json must have exactly 7 Moon-Sun relations");
for (const kind of relationKinds) {
  assertSkyText(dailySky.relation?.[kind]?.label, "astrology-daily-sky.relation." + kind + ".label");
  assertSkyText(dailySky.relation?.[kind]?.body, "astrology-daily-sky.relation." + kind + ".body");
}
for (const kind of ["new", "first_quarter", "full", "last_quarter"]) {
  assertSkyText(dailySky.phaseNote?.[kind], "astrology-daily-sky.phaseNote." + kind);
  assert(placeholdersOf(dailySky.phaseNote?.[kind]?.vi) === "time", "astrology-daily-sky.phaseNote." + kind + " must show {time}");
}
for (const key of ["source", "sourceMoonOnly", "sourceChosen", "sourceHouse", "houseLabel", "relationLabel", "ingressFuture", "ingressPast", "boundary", "noChart", "noBirthTime", "weekNote", "howTitle"]) assertSkyText(dailySky.templates?.[key], "astrology-daily-sky.templates." + key);
assert(Array.isArray(dailySky.templates?.how) && dailySky.templates.how.length >= 3, "astrology-daily-sky.templates.how must explain the method");
(dailySky.templates?.how ?? []).forEach((line, index) => assertSkyText(line, "astrology-daily-sky.templates.how[" + index + "]"));
const bannedSkyPhrases = {
  vi: ["hãy", "đừng", "phải", "nên", "sẽ", "chắc chắn", "may mắn", "xui", "ngày xấu", "ngày tốt", "kỵ", "khắc", "vận", "định mệnh", "tiền", "giàu", "nghèo", "lương", "đầu tư", "hôn nhân", "ly hôn", "chia tay", "mang thai", "con cái", "sức khỏe", "bệnh", "tuổi thọ", "nghiệp", "kiếp trước", "hợp để", "Trăng khiến", "rằm"],
  en: ["should", "must", "will", "lucky", "unlucky", "money", "invest", "health", "marriage", "divorce", "destiny", "fate", "karma", "never", "don't", "avoid"]
};
const bannedSkyPatterns = Object.fromEntries(Object.entries(bannedSkyPhrases).map(([language, words]) => [language, words.map((word) => [word, new RegExp("(^|[^\\p{L}])" + word + "(?=$|[^\\p{L}])", "iu")])]));
const scanSkyText = (node, path, fileLabel) => {
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string" && (key === "vi" || key === "en")) {
        for (const [word, pattern] of bannedSkyPatterns[key]) assert(!pattern.test(value), fileLabel + path + "." + key + " uses the banned phrase \"" + word + "\"");
      } else scanSkyText(value, path + "." + key, fileLabel);
    }
  }
};
scanSkyText(dailySky, "", "astrology-daily-sky");
scanSkyText(skyMoonHouses, "", "astrology-moon-houses");
// Lô 5 numerology time layers (spec ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23 sections 3-4): personal year/month/day,
// pinnacles, challenges, relationship and the private-message teaser. Every leaf must be accented VI + EN, and the
// banned phrase list (reusing the sky patterns) runs over those keys.
const numerologyBlocks = readJson("packages/content/data/numerology-blocks.json");
const nbDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const assertNumText = (value, label) => assertViText(value, "numerology-blocks." + label);
for (const layer of ["personalYear", "personalMonth", "personalDay"]) assertNumText(numerologyBlocks[layer]?.frame, layer + ".frame");
for (const digit of nbDigits) {
  for (const field of ["title", "leans", "question"]) assertNumText(numerologyBlocks.personalYear?.[digit]?.[field], "personalYear." + digit + "." + field);
  assertNumText(numerologyBlocks.personalMonth?.[digit], "personalMonth." + digit);
  assertNumText(numerologyBlocks.personalDay?.[digit], "personalDay." + digit);
  assertNumText(numerologyBlocks.pinnacles?.numbers?.[digit], "pinnacles.numbers." + digit);
  assertNumText(numerologyBlocks.relationship?.numbers?.[digit], "relationship.numbers." + digit);
}
assertNumText(numerologyBlocks.pinnacles?.frame, "pinnacles.frame");
for (const stage of ["1", "2", "3", "4"]) assertNumText(numerologyBlocks.pinnacles?.stages?.[stage], "pinnacles.stages." + stage);
for (const master of ["11", "22"]) assertNumText(numerologyBlocks.pinnacles?.numbers?.[master], "pinnacles.numbers." + master);
assertNumText(numerologyBlocks.challenges?.frame, "challenges.frame");
for (const digit of ["0", ...nbDigits.slice(0, 8)]) assertNumText(numerologyBlocks.challenges?.[digit], "challenges." + digit);
assertNumText(numerologyBlocks.relationship?.frame, "relationship.frame");
assertNumText(numerologyBlocks.relationship?.privacyNote, "relationship.privacyNote");
for (const pair of ["same", "sameParity", "differentParity"]) for (const field of ["common", "tension"]) assertNumText(numerologyBlocks.relationship?.pairs?.[pair]?.[field], "relationship.pairs." + pair + "." + field);
for (const field of ["title", "soon", "body", "sends", "action", "consentTitle", "consentBody", "consentConfirm", "consentCancel", "loading",
  "resultTitle", "premiumNote", "dailyLimit", "unavailable", "retry", "blocked"]) assertNumText(numerologyBlocks.privateMessage?.[field], "privateMessage." + field);
for (const key of ["personalYear", "personalMonth", "personalDay", "pinnacles", "challenges", "relationship", "privateMessage"]) scanSkyText(numerologyBlocks[key], "." + key, "numerology-blocks");
// 2026-11-26: richer chart and Hợp số copy, kept apart from the approved store, with its own review block.
const numerologyExtra = readJson("packages/content/data/numerology-reading-extra.json");
const assertExtraText = (value, label) => assertViText(value, "numerology-reading-extra." + label);
assert(["draft", "approved"].includes(numerologyExtra.review?.status), "numerology-reading-extra.review.status must be draft or approved");
assert(numerologyExtra.review?.status !== "approved" || Boolean(numerologyExtra.review?.reviewer), "numerology-reading-extra approved without a reviewer");
for (const key of ["presentCount", "strongest", "noRepeat", "row", "repeatHint", "emptyHint", "times"]) assertExtraText(numerologyExtra.chart?.[key], "chart." + key);
for (const digit of nbDigits) {
  for (const field of ["title", "present", "many", "absent"]) assertExtraText(numerologyExtra.digits?.[digit]?.[field], "digits." + digit + "." + field);
  assertExtraText(numerologyExtra.relationship?.needs?.[digit], "relationship.needs." + digit);
}
for (const key of ["you", "other", "needsTitle", "questionTitle", "summary", "summaryItem"]) assertExtraText(numerologyExtra.relationship?.[key], "relationship." + key);
for (const relation of ["same", "sameParity", "differentParity"]) {
  assertExtraText(numerologyExtra.relationship?.badges?.[relation], "relationship.badges." + relation);
  assertExtraText(numerologyExtra.relationship?.questions?.[relation], "relationship.questions." + relation);
}
for (const key of ["chart", "digits", "relationship"]) scanSkyText(numerologyExtra[key], "." + key, "numerology-reading-extra");
// 2026-11-28 (R0): Báo cáo tổng hợp strings, kept apart from the approved store with their own review block. The
// ai-numerology-report function refuses while this review is a draft.
const numerologyReport = readJson("packages/content/data/numerology-report.json");
const assertReportText = (value, label) => assertViText(value, "numerology-report." + label);
assert(["draft", "approved"].includes(numerologyReport.review?.status), "numerology-report.review.status must be draft or approved");
assert(numerologyReport.review?.status !== "approved" || Boolean(numerologyReport.review?.reviewer), "numerology-report approved without a reviewer");
for (const section of ["you", "name", "chart", "year", "pinnacle", "relationship", "questions"]) {
  for (const field of ["title", "hint"]) assertReportText(numerologyReport.sections?.[section]?.[field], "sections." + section + "." + field);
}
assert(Object.keys(numerologyReport.sections ?? {}).length === 7, "numerology-report.sections must hold exactly 7 sections");
for (const key of ["title", "teaser", "open", "back", "tocTitle", "partLabel", "localNote", "lockedNote", "noName", "action", "consentTitle",
  "consentBody", "consentConfirm", "consentCancel", "loading", "aiLabel", "premiumNote", "dailyLimit", "unavailable", "retry", "blocked", "soon",
  "soonBody", "savedTitle", "savedAt", "savedNote", "regenerate", "regenerateHint", "view", "delete", "deleteTitle", "deleteBody", "rowLabel",
  "draftNote"]) assertReportText(numerologyReport.report?.[key], "report." + key);
assert(/\{n\}/.test(numerologyReport.report?.partLabel?.vi ?? "") && /\{n\}/.test(numerologyReport.report?.partLabel?.en ?? ""), "numerology-report.report.partLabel needs {n}");
assert(/\{date\}/.test(numerologyReport.report?.savedAt?.vi ?? "") && /\{date\}/.test(numerologyReport.report?.savedAt?.en ?? ""), "numerology-report.report.savedAt needs {date}");
for (const key of ["sections", "report"]) scanSkyText(numerologyReport[key], "." + key, "numerology-report");
// 2026-11-28: "Hai hệ cùng nhìn bạn" template content (Sun x life path and Moon x soul urge, 36 blocks each).
// Draft until the Owner approves; no AI at runtime, so every sentence is checked here.
const twoSystems = readJson("packages/content/data/two-systems-blocks.json");
const assertTwoText = (value, label) => assertViText(value, "two-systems-blocks." + label);
assert(hasText(twoSystems.version), "two-systems-blocks.version is missing");
assert(["draft", "approved"].includes(twoSystems.review?.status), "two-systems-blocks.review.status must be draft or approved");
assert(twoSystems.review?.status !== "approved" || (hasText(twoSystems.review?.reviewer) && hasText(twoSystems.review?.reviewedAt)), "two-systems-blocks approved without reviewer and reviewedAt");
assert(!/external|ngoài|chưa có chuyên gia/i.test(twoSystems.review?.note ?? ""), "two-systems-blocks.review.note must not carry an external-expert disclaimer (Owner decision 28/11/2026)");
const twoUiKeys = ["title", "intro", "sourceNote", "sunAxisTitle", "moonAxisTitle", "meetLabel", "differLabel", "questionLabel", "needBirthDate", "needSun", "needMoon", "needName", "premiumLocked", "guestInvite", "writeJournal", "masterNote"];
for (const key of twoUiKeys) assertTwoText(twoSystems.ui?.[key], "ui." + key);
assert(/\{number\}/.test(twoSystems.ui?.masterNote?.vi ?? "") && /\{number\}/.test(twoSystems.ui?.masterNote?.en ?? ""), "two-systems-blocks.ui.masterNote must keep the {number} placeholder in vi and en");
const twoElements = ["fire", "earth", "air", "water"];
for (const element of twoElements) for (const field of ["name", "sunFrame", "moonFrame"]) assertTwoText(twoSystems.elements?.[element]?.[field], "elements." + element + "." + field);
const twoSentences = new Map();
const noteTwoSentences = (value, label) => {
  for (const language of ["vi", "en"]) {
    for (const sentence of String(value?.[language] ?? "").split(/(?<=[.!?])\s+/)) {
      const normalized = sentence.trim().toLowerCase();
      if (normalized.length < 12) continue;
      const earlier = twoSentences.get(language + ":" + normalized);
      assert(!earlier, `two-systems-blocks.${label}.${language} repeats a sentence already used in ${earlier}`);
      twoSentences.set(language + ":" + normalized, label);
    }
  }
};
for (const axisName of ["sun", "moon"]) {
  const axisBlocks = twoSystems[axisName] ?? {};
  const expectedKeys = twoElements.flatMap((element) => nbDigits.map((digit) => `${element}.${digit}`));
  assert(Object.keys(axisBlocks).length === expectedKeys.length, `two-systems-blocks.${axisName} must have exactly ${expectedKeys.length} blocks`);
  for (const key of expectedKeys) {
    assert(axisBlocks[key], `two-systems-blocks.${axisName}.${key} is missing`);
    for (const field of ["meet", "differ", "question"]) {
      assertTwoText(axisBlocks[key]?.[field], `${axisName}.${key}.${field}`);
      noteTwoSentences(axisBlocks[key]?.[field], `${axisName}.${key}.${field}`);
    }
  }
  scanSkyText(axisBlocks, "." + axisName, "two-systems-blocks");
}
for (const key of ["ui", "elements"]) {
  scanSkyText(twoSystems[key], "." + key, "two-systems-blocks");
  const walk = (node, label) => (node && typeof node === "object" ? Object.entries(node).forEach(([k, v]) => (k === "vi" || k === "en" ? noteTwoSentences({ [k]: v }, label) : walk(v, label + "." + k))) : null);
  walk(twoSystems[key], key);
}
assert(!/(?<!\d)\d{4}(?!\d)/.test(JSON.stringify(["sun", "moon", "ui", "elements"].map((key) => twoSystems[key]))), "two-systems-blocks text must not contain a 4-digit number (no years)");
assert(!/(tuổi|thế hệ|years? old|generation)/i.test(JSON.stringify(["sun", "moon"].map((key) => twoSystems[key]))), "two-systems-blocks blocks must not mention age or generation");
const skyTopics = readJson("packages/content/data/astrology-topic-placements.json");
for (const key of ["reminder", "birthTimeNote", "needsBirthTime"]) assertViText(skyTopics[key], `astrology-topic-placements.${key}`);
for (const [topicId, topic] of Object.entries(skyTopics.topics)) {
  assert(topic.points.length === 2, `astrology-topic-placements.${topicId} must read 2 points`);
  for (const point of topic.points) {
    assertViText(skyTopics.points[point]?.intro, `astrology-topic-placements.points.${point}.intro`);
    assert(Object.keys(skyTopics.placements[point] ?? {}).length === 12, `astrology-topic-placements.${point} must cover exactly 12 signs`);
    for (const sign of zodiacSignIds) {
      const entry = skyTopics.placements[point]?.[sign];
      assertViText(entry?.title, `astrology-topic-placements.${point}.${sign}.title`);
      assertViText(entry?.body, `astrology-topic-placements.${point}.${sign}.body`);
      assertPair(entry?.needs, `astrology-topic-placements.${point}.${sign}.needs`);
      assertPair(entry?.watch, `astrology-topic-placements.${point}.${sign}.watch`);
    }
  }
}
// Owner-approved synastry content (2026-10-31): 10 element pairs and 7 aspect groups with conjunction, flowing and tension text.
const skySynastry = readJson("packages/content/data/astrology-synastry.json");
for (const key of ["intro", "footer"]) assertViText(skySynastry[key], `astrology-synastry.${key}`);
for (const key of ["title", "body", "confirm"]) assertViText(skySynastry.consent?.[key], `astrology-synastry.consent.${key}`);
for (const key of ["partner", "crush", "friend", "family", "work", "other"]) assertViText(skySynastry.relationshipTypes?.[key], `astrology-synastry.relationshipTypes.${key}`);
const synastryElements = ["fire", "earth", "air", "water"];
synastryElements.forEach((first, index) => synastryElements.slice(index).forEach((second) => {
  for (const field of ["title", "body"]) assertViText(skySynastry.elementPairs?.[`${first}-${second}`]?.[field], `astrology-synastry.elementPairs.${first}-${second}.${field}`);
}));
assert(Object.keys(skySynastry.elementPairs).length === 10, "astrology-synastry.json must have exactly 10 element pairs");
for (const group of ["sun-moon", "moon-moon", "venus-mars", "venus-venus", "sun-sun", "mercury-mercury", "saturn-personal"]) {
  for (const kind of ["conjunction", "flowing", "tension"]) for (const field of ["title", "body", "try"]) assertViText(skySynastry.aspects?.[group]?.[kind]?.[field], `astrology-synastry.aspects.${group}.${kind}.${field}`);
}
assert(!/định mệnh|tri kỷ|soulmate/i.test(JSON.stringify(skySynastry)), "astrology-synastry.json must not promise destiny or soulmates");
for (const [label, text] of [["astrology-big3", JSON.stringify(skyBig3)], ["astrology-moon-houses", JSON.stringify(skyMoonHouses)], ["astrology-topic-placements", JSON.stringify(skyTopics)], ["astrology-synastry", JSON.stringify(skySynastry)]]) {
  assert(!/Cung Mọc|Thiên Đỉnh/.test(text), `${label}.json must write Cung mọc and Thiên đỉnh`);
}
// Journal prompts (Owner decision 2026-10-31: 30 prompts used right away, reviewed afterwards).
const journalPrompts = readJson("packages/content/data/journal-prompts.json");
assert(journalPrompts.prompts.length === 30, "journal-prompts.json must have 30 prompts");
assert(new Set(journalPrompts.prompts.map((item) => item.id)).size === 30, "journal-prompts.json ids must be unique");
for (const item of journalPrompts.prompts) assertViText(item, `journal-prompts.${item.id}`);
for (const mood of ["calm", "curious", "reflective", "hopeful", "stuck"]) assertViText(journalPrompts.weeklyByMood?.[mood], `journal-prompts.weeklyByMood.${mood}`);
assertViText(journalPrompts.weeklyEmpty, "journal-prompts.weeklyEmpty");
// Home daily rhythm (HO-02): 30 pause and small-action pairs, one per local day.
const homeRhythm = readJson("packages/content/data/home-daily-rhythm.json");
assert(homeRhythm.days.length === 30, "home-daily-rhythm.json must have 30 days");
assert(new Set(homeRhythm.days.map((item) => item.id)).size === 30, "home-daily-rhythm.json ids must be unique");
for (const item of homeRhythm.days) {
  assertViText(item.pause, `home-daily-rhythm.${item.id}.pause`);
  assertViText(item.action, `home-daily-rhythm.${item.id}.action`);
}

// Owner-approved short guide names (2026-10-31): one entry per persona, short name and tagline in vi and en.
const personaShortNames = readJson("packages/content/data/persona-short-names.json");
const allPersonaIds = ["personas-archetypes", "personas-figures", "personas-books"].flatMap((name) => {
  const data = readJson(`packages/content/data/${name}.json`);
  return (Array.isArray(data) ? data : Object.values(data).find(Array.isArray)).map((persona) => persona.id);
});
assert(allPersonaIds.every((id) => personaShortNames.personas[id]) && Object.keys(personaShortNames.personas).length === allPersonaIds.length, "persona-short-names.json must cover exactly every persona");
for (const [id, entry] of Object.entries(personaShortNames.personas)) {
  assertLocalized(entry.short, `persona-short-names.${id}.short`);
  assertLocalized(entry.tagline, `persona-short-names.${id}.tagline`);
  assert(entry.short.vi.length <= 24 && entry.tagline.vi.length <= 40, `persona-short-names.${id} must stay short enough for the grid`);
  // Chat knowledge Lô 0: each persona opens its chat room with its own line.
  assertLocalized(entry.opener, `persona-short-names.${id}.opener`);
  assert(entry.opener.vi.length <= 240 && entry.opener.en.length <= 240, `persona-short-names.${id}.opener must stay under 240 characters`);
}
// Quotes attributed to a figure or a book must be labelled paraphrases, never presented as verbatim lines.
for (const section of personaDetailContent) {
  const owner = allPersonas.find((persona) => persona.id === section.ownerId);
  if (!owner || owner.type === "archetype_guide") continue;
  for (const block of section.blocks ?? []) {
    if (block.kind !== "quote") continue;
    assert(/^Tinh thần:/.test(block.quote?.vi ?? "") && /^In spirit:/.test(block.quote?.en ?? ""), `${section.id} quote must be a labelled paraphrase (Tinh thần: / In spirit:)`);
  }
}
// Oracle may only suggest guides from the generated list; it must match the persona data.
execFileSync(process.execPath, [path.join(root, "scripts", "generate-oracle-guides.mjs"), "--check"], { stdio: "inherit" });
for (const designSet of tarotCardDesigns) {
  assert(decks.some((deck) => deck.id === designSet.deckId), `${designSet.deckId} design set does not match a deck`);
  assertLocalized(designSet.style, `${designSet.deckId}.style`);
  assert(vietnameseDiacriticPattern.test(designSet.style.vi), `${designSet.deckId}.style.vi must use accented Vietnamese`);
  assertLocalized(designSet.cardBackPrompt, `${designSet.deckId}.cardBackPrompt`);
  assert(Array.isArray(designSet.cards) && designSet.cards.length === 78, `${designSet.deckId} must have 78 card visual prompts`);
  const designCardIds = (designSet.cards || []).map((cardDesign) => cardDesign.cardId);
  assert(new Set(designCardIds).size === cards.length, `${designSet.deckId} must have 78 unique card visual prompts`);
  for (const card of cards) assert(designCardIds.includes(card.id), `${designSet.deckId} is missing visual prompt for ${card.id}`);
  for (const cardDesign of designSet.cards) {
    const canonicalCard = cards.find((card) => card.id === cardDesign.cardId);
    assert(Boolean(canonicalCard), `${designSet.deckId}.${cardDesign.cardId} does not match a tarot card`);
    assertLocalized(cardDesign.title, `${designSet.deckId}.${cardDesign.cardId}.title`);
    if (canonicalCard) {
      assert(cardDesign.title.vi === canonicalCard.name.en, `${designSet.deckId}.${cardDesign.cardId}.title.vi must mirror original card name "${canonicalCard.name.en}"`);
      assert(cardDesign.title.en === canonicalCard.name.en, `${designSet.deckId}.${cardDesign.cardId}.title.en must mirror original card name "${canonicalCard.name.en}"`);
    }
    assertLocalized(cardDesign.visualPrompt, `${designSet.deckId}.${cardDesign.cardId}.visualPrompt`);
  }
}
assert(new Set(tarotCardDesigns.map((designSet) => designSet.deckId)).size === decks.length, "Tarot design sets must have one unique entry per deck");

for (const deckBack of tarotDeckBacks) {
  assert(hasText(deckBack.id), "Tarot deck back missing id");
  assert(decks.some((deck) => deck.id === deckBack.deckId), `${deckBack.deckId} deck back does not match a tarot deck`);
  assert(hasText(deckBack.assetPath), `${deckBack.deckId}.assetPath is missing`);
  assertLocalized(deckBack.usage, `${deckBack.deckId}.usage`);
  assertLocalized(deckBack.visualDirection, `${deckBack.deckId}.visualDirection`);
  assert(deckBack.cardSize?.width === 1024, `${deckBack.deckId}.cardSize.width must be 1024`);
  assert(deckBack.cardSize?.height === 1768, `${deckBack.deckId}.cardSize.height must be 1768`);
  assert(Array.isArray(deckBack.qualityChecks) && deckBack.qualityChecks.includes("same_ratio_as_tarot_cards"), `${deckBack.deckId}.qualityChecks must include same_ratio_as_tarot_cards`);
  const pngSize = readPngSize(deckBack.assetPath);
  assert(Boolean(pngSize), `${deckBack.deckId}.assetPath must point to a PNG file`);
  if (pngSize) {
    assert(pngSize.width === deckBack.cardSize.width, `${deckBack.deckId}.assetPath width ${pngSize.width} does not match manifest`);
    assert(pngSize.height === deckBack.cardSize.height, `${deckBack.deckId}.assetPath height ${pngSize.height} does not match manifest`);
  }
}

for (const skill of tarotCardSkills.skills) {
  assert(hasText(skill.id), "Tarot card skill missing id");
  assert(hasText(skill.outputField), `${skill.id} missing outputField`);
  assertLocalized(skill.purpose, `${skill.id}.purpose`);
  assert(Array.isArray(skill.checks) && skill.checks.length > 0, `${skill.id} needs checks`);
}

// Validation of MVP test data completed in pre-checks

for (const persona of allPersonas) {
  assert(hasText(persona.id), "Persona missing id");
  assert(["historical_figure", "book_inspired_guide", "archetype_guide"].includes(persona.type), `${persona.id}.type is invalid`);
  assertLocalized(persona.name, `${persona.id}.name`);
  assertLocalized(persona.shortDescription, `${persona.id}.shortDescription`);
  assertLocalized(persona.transparencyNote, `${persona.id}.transparencyNote`);
  assert(Array.isArray(persona.suggestedPrompts.vi) && persona.suggestedPrompts.vi.length >= 3, `${persona.id}.suggestedPrompts.vi needs 3 prompts`);
  assert(Array.isArray(persona.suggestedPrompts.en) && persona.suggestedPrompts.en.length >= 3, `${persona.id}.suggestedPrompts.en needs 3 prompts`);
}

const personaIds = new Set(allPersonas.map((persona) => persona.id));
const personaSlugs = new Set(allPersonas.map((persona) => persona.slug));
assert(Array.isArray(aiCouncilConfig.defaultPersonaSlugs) && aiCouncilConfig.defaultPersonaSlugs.length >= aiCouncilConfig.maxGuidesPerTurn, "AI Council defaultPersonaSlugs must cover maxGuidesPerTurn");
for (const slug of [...(aiCouncilConfig.defaultPersonaSlugs || []), ...(aiCouncilConfig.fallbackPersonaSlugs || [])]) {
  assert(personaSlugs.has(slug), `AI Council persona slug ${slug} does not match a configured persona`);
}
assert(new Set(tarotDeckBacks.map((deckBack) => deckBack.deckId)).size === decks.length, "Tarot deck backs must have one unique entry per deck");
for (const template of aiCouncilConfig.councilTemplates || []) {
  assert(hasText(template.id), "AI Council template missing id");
  assert(["ready_for_beta", "draft_review", "disabled"].includes(template.status), `${template.id}.status is invalid`);
  assertLocalized(template.name, `${template.id}.name`);
  assertLocalized(template.useCase, `${template.id}.useCase`);
  assertLocalizedList(template.flow, `${template.id}.flow`);
  assert(Array.isArray(template.situationTags) && template.situationTags.length > 0, `${template.id}.situationTags is empty`);
  assert(hasText(template.meetingMode), `${template.id}.meetingMode is missing`);
  assert(hasText(template.synthesisMode), `${template.id}.synthesisMode is missing`);
  assert(Number.isInteger(template.maxGuides) && template.maxGuides >= 2 && template.maxGuides <= aiCouncilConfig.maxGuidesPerTurn, `${template.id}.maxGuides must fit AI Council maxGuidesPerTurn`);
  assert(Array.isArray(template.outputContract) && template.outputContract.includes("guideReplies[]"), `${template.id}.outputContract must include guideReplies[]`);
  assert(Array.isArray(template.roster) && template.roster.length >= template.maxGuides, `${template.id}.roster must cover maxGuides`);
  for (const member of template.roster) {
    assert(personaSlugs.has(member.personaSlug), `${template.id}.roster personaSlug ${member.personaSlug} does not match a configured persona`);
    assert(hasText(member.role), `${template.id}.${member.personaSlug}.role is missing`);
    assertLocalized(member.purpose, `${template.id}.${member.personaSlug}.purpose`);
  }
}
assert(promptLibrary.some((prompt) => prompt.id === councilContract.promptVersionId && prompt.feature === "ai_council"), "Council contract promptVersionId must match an ai_council prompt");
assert(productAgents.some((agent) => agent.id === "ai_council_agent"), "Product agents must include ai_council_agent");
const requiredModelRouteFeatures = ["daily_insight", "persona_chat", "ai_council", "tarot_reading", "astrology_report"];
for (const feature of requiredModelRouteFeatures) {
  const route = modelRoutes.find((item) => item.feature === feature && ["active", "experimental"].includes(item.status));
  assert(Boolean(route), `Model routing must include an active route for ${feature}`);
  if (route) {
    assert(["openai", "openrouter", "gemini", "anthropic"].includes(route.primaryProvider), `${feature}.primaryProvider is invalid`);
    assert(hasText(route.primaryModel), `${feature}.primaryModel is missing`);
    assert(Number.isFinite(route.temperature), `${feature}.temperature must be numeric`);
    assert(Number.isInteger(route.maxOutputTokens) && route.maxOutputTokens > 0, `${feature}.maxOutputTokens must be positive`);
    const responseSchema = route.responseSchemaRef === `${councilContract.id}.responseSchema`
      ? councilContract.responseSchema
      : route.responseSchema;
    assert(hasText(responseSchema), `${feature}.responseSchema is missing`);
    assert(Array.isArray(route.fallbackWhen) && route.fallbackWhen.length > 0, `${feature}.fallbackWhen must not be empty`);
    if (route.fallbackProvider) assert(["openai", "openrouter", "gemini", "anthropic"].includes(route.fallbackProvider), `${feature}.fallbackProvider is invalid`);
    if (route.primaryModel.includes("~latest")) assert(route.status === "experimental", `${feature} cannot use ~latest outside experimental routes`);
    if (route.primaryModel === "openrouter/auto") assert(route.status === "experimental", `${feature} cannot use openrouter/auto as primary outside experimental routes`);
  }
}
const councilRoute = modelRoutes.find((route) => route.feature === "ai_council" && ["active", "experimental"].includes(route.status));
assert(councilRoute?.contractRef === councilContract.id, "AI Council model route must reference the canonical Council contract");
assert(councilRoute?.responseSchemaRef === `${councilContract.id}.responseSchema`, "AI Council model route must resolve its response schema from the Council contract");
for (const action of oracleActions.actions || []) {
  assert(hasText(action.id), "Oracle action missing id");
  assert(["reflect_here", "draw_tarot", "ask_guide", "open_council", "cast_astrology", "save_journal"].includes(action.kind), `${action.id}.kind is invalid`);
  assert(["oracle", "tarot", "persona", "council", "astrology", "journal"].includes(action.target), `${action.id}.target is invalid`);
  assert(typeof action.enabled === "boolean", `${action.id}.enabled must be boolean`);
  assertLocalized(action.label, `${action.id}.label`);
  assertLocalized(action.detail, `${action.id}.detail`);
  assert(hasText(action.icon), `${action.id}.icon is missing`);
  assert(hasText(action.safetyRule), `${action.id}.safetyRule is missing`);
  if (action.requiresConsent) assert(["journal_memory", "birth_profile"].includes(action.requiresConsent), `${action.id}.requiresConsent is invalid`);
}
for (const personaId of personaIds) {
  const sections = personaDetailContent.filter((section) => section.ownerType === "persona" && section.ownerId === personaId);
  const reflection = sections.find((section) => section.sectionKey === "reflections");
  const chronicle = sections.find((section) => section.sectionKey === "chronicle");
  assert(Boolean(reflection), `${personaId} missing persona detail reflections section`);
  assert(Boolean(chronicle), `${personaId} missing persona detail chronicle section`);
}

for (const section of personaDetailContent) {
  assert(hasText(section.id), "Persona detail section missing id");
  assert(section.ownerType === "persona", `${section.id}.ownerType must be persona`);
  assert(personaIds.has(section.ownerId), `${section.id}.ownerId does not match a persona`);
  assert(["reflections", "chronicle"].includes(section.sectionKey), `${section.id}.sectionKey must be reflections or chronicle`);
  assertLocalized(section.title, `${section.id}.title`);
  assertLocalized(section.body, `${section.id}.body`);
  assert(Array.isArray(section.blocks) && section.blocks.length >= 2, `${section.id}.blocks needs at least 2 items`);
  if (section.sectionKey === "chronicle") assertLocalized(section.subtitle, `${section.id}.subtitle`);
  if (section.sectionKey === "reflections") {
    const quoteBlock = section.blocks.find((block) => block.kind === "quote");
    const insightBlocks = section.blocks.filter((block) => block.kind === "insight");
    assert(Boolean(quoteBlock), `${section.id} needs a quote block`);
    if (quoteBlock) {
      assertLocalized(quoteBlock.quote, `${section.id}.quote`);
      assertLocalized(quoteBlock.body, `${section.id}.quote.body`);
    }
    assert(insightBlocks.length >= 2, `${section.id} needs at least 2 insight blocks`);
    for (const [index, block] of insightBlocks.entries()) assertLocalized(block.body, `${section.id}.insight.${index}.body`);
  } else {
    for (const [index, block] of section.blocks.entries()) {
      assertLocalized(block.title, `${section.id}.block.${index}.title`);
      assertLocalized(block.body, `${section.id}.block.${index}.body`);
    }
  }
}

for (const agent of [...productAgents, ...codingAgents]) {
  assert(hasText(agent.id), "Agent missing id");
  assert(hasText(agent.purpose), `${agent.id} missing purpose`);
  assert(Array.isArray(agent.subAgents) && agent.subAgents.length > 0, `${agent.id} needs subAgents`);
}

for (const workflow of featureWorkflows) {
  assert(hasText(workflow.id), "Workflow missing id");
  assertLocalized(workflow.name, `${workflow.id}.name`);
  assertLocalized(workflow.purpose, `${workflow.id}.purpose`);
}

for (const prompt of promptLibrary) {
  assert(hasText(prompt.id), "Prompt missing id");
  assert(hasText(prompt.version), `${prompt.id} missing version`);
  assertLocalized(prompt.name, `${prompt.id}.name`);
  assertLocalized(prompt.prompt, `${prompt.id}.prompt`);
}

for (const candidate of personaResearchQueue.nextCandidates) {
  assert(hasText(candidate.id), "Persona research candidate missing id");
  assertLocalized(candidate.name, `${candidate.id}.name`);
  assertLocalized(candidate.reason, `${candidate.id}.reason`);
}

// "Một câu cho hôm nay" (book_quote): one file per book in packages/content/data/book-quotes/.
// Quotes are the source text and are exempt from the word list; the commentary (gloss) and the question are
// Nilaza's own voice, so they must not predict, command or speak of luck.
{
  const bookQuoteDir = "packages/content/data/book-quotes";
  const expectedBookQuoteFiles = {
    "dao-duc-kinh": "book-harmony-guide",
    "suy-tuong": "book-stoic-journal",
    "kinh-phap-cu": "book-dhammapada",
    "binh-phap-ton-tu": "book-strategic-thinker",
    "kinh-dich": "book-i-ching"
  };
  const bookQuoteBanned = {
    vi: ["sẽ", "hãy", "nên", "phải", "chắc chắn", "vận", "hợp", "khắc", "điềm", "may mắn", "xui"],
    en: ["should", "must", "lucky", "unlucky", "omen", "omens", "destiny", "fate", "fated"]
  };
  const bookQuoteBannedPatterns = Object.fromEntries(Object.entries(bookQuoteBanned).map(([language, words]) =>
    [language, words.map((word) => [word, new RegExp("(^|[^\\p{L}])" + word + "(?=$|[^\\p{L}])", "iu")])]));
  // "approved" means content review passed AND the Owner approved; only approved files reach users (app draft gate).
  const reviewStatuses = new Set(["draft", "reviewed", "approved"]);
  const bookPersonaIds = new Set(books.map((persona) => persona.id));
  const seenBookQuoteIds = new Set();
  const presentFiles = fs.existsSync(path.join(root, bookQuoteDir))
    ? fs.readdirSync(path.join(root, bookQuoteDir)).filter((name) => name.endsWith(".json"))
    : [];
  for (const name of presentFiles) {
    assert(Object.hasOwn(expectedBookQuoteFiles, name.replace(/\.json$/, "")), `${bookQuoteDir}/${name} is not a known book (add it to the app loader and this check first)`);
  }
  for (const [book, personaId] of Object.entries(expectedBookQuoteFiles)) {
    const relativePath = `${bookQuoteDir}/${book}.json`;
    if (!fs.existsSync(path.join(root, relativePath))) {
      assert(false, `${relativePath} is missing`);
      continue;
    }
    const file = readJson(relativePath);
    const label = `book-quotes/${book}`;
    countMojibakeStrings(file);
    assert(file.schemaVersion === 1, `${label}.schemaVersion must be 1`);
    assert(file.book === book, `${label}.book must be "${book}"`);
    assert(file.personaId === personaId, `${label}.personaId must be "${personaId}"`);
    assert(bookPersonaIds.has(file.personaId), `${label}.personaId ${file.personaId} is not in personas-books.json`);
    assertViText(file.title, `${label}.title`);
    for (const key of ["original", "englishBase", "vietnamese"]) assert(hasText(file.source?.[key]), `${label}.source.${key} is required`);
    const review = file.review;
    assert(review && typeof review === "object", `${label}.review block is required`);
    if (review && typeof review === "object") {
      assert(reviewStatuses.has(review.status), `${label}.review.status must be draft, reviewed or approved`);
      assert(review.reviewer === null || hasText(review.reviewer), `${label}.review.reviewer must be null or a name`);
      assert(review.reviewedAt === null || hasText(review.reviewedAt), `${label}.review.reviewedAt must be null or a date`);
      if (review.status === "approved") {
        assert(hasText(review.reviewer) && hasText(review.reviewedAt), `${label} is approved without reviewer and reviewedAt`);
      }
    }
    if (file.sample === true) {
      assert(hasText(file.sampleNote), `${label} is a sample and needs sampleNote`);
      assert(review?.status !== "approved", `${label} is a sample and cannot be approved (sample files are never shown to users)`);
    } else {
      assert(file.sample === undefined || file.sample === false, `${label}.sample must be true, false or absent`);
    }
    assert(Array.isArray(file.items) && file.items.length > 0, `${label}.items must be a non-empty list`);
    const items = Array.isArray(file.items) ? file.items : [];
    if (book === "kinh-dich" && file.sample !== true) {
      assert(items.length === 64, `${label} must have 64 items (one per hexagram), found ${items.length}`);
    }
    items.forEach((item, index) => {
      const itemLabel = `${label}.items[${index}]${hasText(item?.id) ? ` (${item.id})` : ""}`;
      assert(hasText(item?.id) && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id), `${itemLabel}.id must be lowercase letters, digits and dashes`);
      if (hasText(item?.id)) {
        assert(!seenBookQuoteIds.has(item.id), `${itemLabel}.id is duplicated`);
        seenBookQuoteIds.add(item.id);
      }
      for (const field of ["ref", "quote", "gloss", "question"]) assertViText(item?.[field], `${itemLabel}.${field}`);
      assert(item?.tags === undefined || (Array.isArray(item.tags) && item.tags.every(hasText)), `${itemLabel}.tags must be a list of words`);
      for (const field of ["gloss", "question"]) {
        for (const language of ["vi", "en"]) {
          const text = item?.[field]?.[language];
          if (typeof text !== "string") continue;
          for (const [word, pattern] of bookQuoteBannedPatterns[language]) {
            assert(!pattern.test(text), `${itemLabel}.${field}.${language} uses the banned word "${word}"`);
          }
        }
        scanContentSafety(item?.[field], `${itemLabel}.${field}`);
      }
    });
  }
}

assert(legacyAsciiTarotViFields === 0, `Expected 0 legacy ASCII tarot fields, found ${legacyAsciiTarotViFields}`);
assert(mojibakeStringCount === 0, `Expected 0 mojibake strings in loaded content/config data, found ${mojibakeStringCount}`);
assert(contentSafetyIssues.length === 0, `Content safety lint found ${contentSafetyIssues.length} high-risk phrase(s):\n${contentSafetyIssues.slice(0, 20).join("\n")}`);

if (errors.length) {
  console.error("Data validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Nilaza data validation passed.");
console.log(`Decks: ${decks.length}`);
console.log(`Tarot cards: ${cards.length}`);
console.log(`Major Arcana cards: ${cards.filter((card) => card.arcana === "major").length}`);
console.log(`Minor Arcana cards: ${cards.filter((card) => card.arcana === "minor").length}`);
console.log(`Tarot deck design sets: ${tarotCardDesigns.length}`);
console.log(`Tarot deck backs: ${tarotDeckBacks.length}`);
console.log(`Historical figures: ${figures.length}`);
console.log(`Book-inspired guides: ${books.length}`);
console.log(`Archetype guides: ${archetypes.length}`);
console.log(`Product agents: ${productAgents.length}`);
console.log(`Coding agents: ${codingAgents.length}`);
console.log(`Feature workflows: ${featureWorkflows.length}`);
console.log(`Prompt templates: ${promptLibrary.length}`);
console.log(`Legacy ASCII tarot vi fields: ${legacyAsciiTarotViFields}`);
console.log(`Mojibake strings: ${mojibakeStringCount}`);
console.log(`Content safety lint issues: ${contentSafetyIssues.length}`);
