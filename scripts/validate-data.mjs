import fs from "node:fs";
import path from "node:path";

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
}
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
