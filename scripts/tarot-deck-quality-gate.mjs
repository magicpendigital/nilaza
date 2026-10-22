import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const realRepoRoot = fs.realpathSync(repoRoot);
const checks = [
  "anatomyAndPose",
  "propContactAndSupport",
  "symbolCount",
  "sceneAndMeaning",
  "bilingualCopy",
  "reflectionSafety",
  "textFrameAndArtifacts",
  "mobileLegibility",
  "originality",
];
const sharedAssetChecks = ["composition", "mobileLegibility", "originality"];
const numberedRanks = new Map([
  ["ace", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
  ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
]);

function sourceFolder(deckId) {
  // The published deck retained its original source-art folder name.
  return deckId === "stellar-mosaic" ? "stellar-academy" : deckId;
}

function assetChecks(role, context) {
  const required = [...sharedAssetChecks];
  if (role === "back" && Array.isArray(context.back?.qualityChecks) &&
      context.back.qualityChecks.includes("rotationally_symmetric")) {
    required.push("rotationalSymmetry");
  }
  return required;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/tarot-deck-quality-gate.mjs prepare --deck <id> [--review-file <path>] [--require-deck-intros]",
    "  node scripts/tarot-deck-quality-gate.mjs verify  --deck <id> [--review-file <path>] [--require-deck-intros]",
    "",
    "prepare records card image/content and cover/back hashes; reviewers must inspect and document every pass.",
    "verify checks files, content, hashes, and recorded review evidence. It cannot inspect image semantics itself.",
    "--require-deck-intros also requires a 78-card <deck-id>-full-deck-manifest.json with scene and prompt per card.",
  ].join("\n");
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function safePath(candidate, label) {
  const absolute = path.resolve(repoRoot, candidate);
  if (!within(repoRoot, absolute)) throw new Error(`${label} must stay inside ${repoRoot}`);
  let existing = absolute;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) throw new Error(`${label} has no valid parent inside the repository`);
    existing = parent;
  }
  if (!within(realRepoRoot, fs.realpathSync(existing))) {
    throw new Error(`${label} resolves outside the repository through a symbolic link`);
  }
  return absolute;
}

function repoPath(relative, label = relative) {
  return safePath(relative, label);
}

function relative(absolute) {
  return path.relative(repoRoot, absolute).replaceAll("\\", "/");
}

function readJson(file, label = relative(file)) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${label}: ${error.message}`);
  }
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function localized(value) {
  return value && typeof value.vi === "string" && value.vi.trim() &&
    typeof value.en === "string" && value.en.trim();
}

function exactIds(actual, expected, label, errors) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter(id => !actualSet.has(id));
  const extra = actual.filter(id => !expectedSet.has(id));
  const duplicate = actual.filter((id, index) => actual.indexOf(id) !== index);
  if (missing.length || extra.length || duplicate.length) {
    errors.push(`${label}: missing [${missing.join(", ")}], extra [${extra.join(", ")}], duplicate [${[...new Set(duplicate)].join(", ")}]`);
  }
}

function pngSize(file) {
  const bytes = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature) || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${relative(file)} is not a valid PNG header`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function inspectPng(file, size, label, errors) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    errors.push(`Missing ${label}: ${relative(file)}`);
    return null;
  }
  try {
    const actual = pngSize(file);
    if (actual.width === 0 || actual.height === 0) {
      errors.push(`${label} ${relative(file)} has invalid zero PNG dimensions`);
    }
    if (size && (actual.width !== size.width || actual.height !== size.height)) {
      errors.push(`${label} ${relative(file)} is ${actual.width}x${actual.height}; expected ${size.width}x${size.height}`);
    }
    return sha256(file);
  } catch (error) {
    errors.push(error.message);
    return null;
  }
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }
  const [command, ...options] = argv;
  if (!["prepare", "verify"].includes(command)) throw new Error(`Unknown command: ${command}\n${usage()}`);
  let deckId;
  let reviewFile;
  let requireDeckIntros = false;
  for (let i = 0; i < options.length; i += 1) {
    const option = options[i];
    if (option === "--require-deck-intros") {
      if (requireDeckIntros) throw new Error("--require-deck-intros was provided more than once");
      requireDeckIntros = true;
    } else if (option === "--deck" || option === "--review-file") {
      const value = options[++i];
      if (!value || value.startsWith("--")) throw new Error(`${option} needs a value`);
      if (option === "--deck") {
        if (deckId) throw new Error("--deck was provided more than once");
        deckId = value;
      } else {
        if (reviewFile) throw new Error("--review-file was provided more than once");
        reviewFile = value;
      }
    } else {
      throw new Error(`Unknown option: ${option}\n${usage()}`);
    }
  }
  if (!deckId) throw new Error(`--deck is required\n${usage()}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(deckId)) {
    throw new Error(`Invalid deck ID "${deckId}"; use lowercase letters, digits, and hyphens`);
  }
  return {
    command,
    deckId,
    reviewFile: safePath(reviewFile || `assets/tarot/${sourceFolder(deckId)}/quality-review.json`, "Review file"),
    requireDeckIntros,
  };
}

function loadContext({ deckId, requireDeckIntros }, errors) {
  const cards = readJson(repoPath("packages/content/data/tarot-cards.json"));
  if (!Array.isArray(cards)) throw new Error("Canonical tarot cards must be an array");
  const ids = cards.map(card => card?.id);
  if (ids.length !== 78 || ids.some(id => typeof id !== "string") || new Set(ids).size !== 78) {
    throw new Error("Canonical tarot card data must contain exactly 78 unique IDs");
  }
  const major = cards.filter(card => card.arcana === "major");
  const minor = cards.filter(card => card.arcana === "minor");
  if (major.length !== 22 || minor.length !== 56) {
    errors.push(`Canonical card structure must have 22 Major and 56 Minor cards; found ${major.length} and ${minor.length}`);
  }
  for (const card of minor) {
    if (!["wands", "cups", "swords", "pentacles"].includes(card.suit) ||
        (!numberedRanks.has(card.rank) && !["page", "knight", "queen", "king"].includes(card.rank))) {
      errors.push(`${card.id}: canonical Minor suit or rank is invalid`);
    }
  }
  const decks = readJson(repoPath("packages/content/data/tarot-decks.json"));
  if (Array.isArray(decks) && decks.filter(item => item.id === deckId).length > 1) {
    errors.push(`${deckId} appears more than once in tarot-decks.json`);
  }
  const deck = Array.isArray(decks) && decks.find(item => item.id === deckId);
  if (!deck) errors.push(`${deckId} is missing from packages/content/data/tarot-decks.json`);
  if (deck && !localized(deck.shortDescription)) errors.push(`${deckId}.shortDescription needs VI/EN introduction`);
  if (deck && !localized(deck.name)) errors.push(`${deckId}.name needs VI/EN text`);
  const introIds = Object.keys(deck?.cardIntroductions || {});
  if (requireDeckIntros || introIds.length) {
    exactIds(introIds, ids, `${deckId}.cardIntroductions`, errors);
  }
  for (const card of cards) {
    const intro = deck?.cardIntroductions?.[card.id] ?? (!requireDeckIntros ? card.intro : null);
    if (!localized(intro)) errors.push(`${deckId}/${card.id}: missing VI/EN card introduction`);
  }
  if (requireDeckIntros) {
    for (const language of ["vi", "en"]) {
      const seen = new Map();
      for (const card of cards) {
        const value = deck?.cardIntroductions?.[card.id]?.[language];
        if (typeof value !== "string" || !value.trim()) continue;
        const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
        if (seen.has(normalized)) {
          errors.push(`${deckId}: duplicate ${language} card introduction for ${seen.get(normalized)} and ${card.id}`);
        } else {
          seen.set(normalized, card.id);
        }
      }
    }
  }

  const allDesigns = readJson(repoPath("packages/content/data/tarot-card-designs.json"));
  if (Array.isArray(allDesigns) && allDesigns.filter(item => item.deckId === deckId).length > 1) {
    errors.push(`${deckId} appears more than once in tarot-card-designs.json`);
  }
  const design = Array.isArray(allDesigns) && allDesigns.find(item => item.deckId === deckId);
  if (!design) errors.push(`${deckId} is missing from tarot-card-designs.json`);
  if (design) {
    if (!localized(design.style)) errors.push(`${deckId}.style needs VI/EN text`);
    const designCards = Array.isArray(design.cards) ? design.cards : [];
    exactIds(designCards.map(item => item.cardId), ids, `${deckId}.visualPrompt cards`, errors);
    for (const item of designCards) {
      if (!localized(item.visualPrompt)) errors.push(`${deckId}/${item.cardId}: missing VI/EN visual prompt`);
    }
  }

  const backs = readJson(repoPath("packages/content/data/tarot-deck-backs.json"));
  if (Array.isArray(backs) && backs.filter(item => item.deckId === deckId).length > 1) {
    errors.push(`${deckId} appears more than once in tarot-deck-backs.json`);
  }
  const back = Array.isArray(backs) && backs.find(item => item.deckId === deckId);
  if (!back) errors.push(`${deckId} is missing from tarot-deck-backs.json`);
  if (back && !localized(back.visualDirection)) errors.push(`${deckId} deck back needs VI/EN visual direction`);
  if (back && !Array.isArray(back.qualityChecks)) errors.push(`${deckId} deck back qualityChecks must be an array`);
  const expectedBack = `assets/tarot/deck-backs/${deckId}.png`;
  if (back && back.assetPath !== expectedBack) errors.push(`${deckId} deck back assetPath must be ${expectedBack}`);

  const folder = sourceFolder(deckId);
  const sceneManifestPath = repoPath(`assets/tarot/${folder}/${deckId}-full-deck-manifest.json`);
  const sceneManifest = fs.existsSync(sceneManifestPath) ? readJson(sceneManifestPath) : null;
  if (requireDeckIntros && !sceneManifest) {
    errors.push(`${deckId} needs ${relative(sceneManifestPath)} with 78 card scenes and prompts`);
  }
  if (sceneManifest) {
    if (sceneManifest.deckId !== deckId) errors.push(`${relative(sceneManifestPath)} deckId must be ${deckId}`);
    const sceneCards = Array.isArray(sceneManifest.cards) ? sceneManifest.cards : [];
    exactIds(sceneCards.map(item => item.cardId), ids, `${deckId} scene manifest cards`, errors);
    if (requireDeckIntros && (!localized(sceneManifest.style) ||
        typeof sceneManifest.visualPromptTemplate !== "string" || !sceneManifest.visualPromptTemplate.trim())) {
      errors.push(`${relative(sceneManifestPath)} needs VI/EN style and a visualPromptTemplate`);
    }
    for (const item of sceneCards) {
      const hasScene = typeof item.scene === "string" && item.scene.trim();
      const hasPrompt = typeof item.prompt === "string" && item.prompt.trim();
      if (requireDeckIntros && (!hasScene || !hasPrompt)) {
        errors.push(`${deckId}/${item.cardId}: scene manifest needs a scene and prompt`);
      } else if (!requireDeckIntros && !((hasScene || localized(item.cardStory) || localized(item.portrait)) &&
          (hasPrompt || localized(item.visualPrompt)))) {
        errors.push(`${deckId}/${item.cardId}: scene manifest needs visual scene/story and prompt`);
      }
    }
  }
  const specFile = repoPath(`assets/tarot/${folder}/card-spec.json`);
  const spec = readJson(specFile);
  if (spec.deckId !== folder) errors.push(`${relative(specFile)} deckId must be ${folder}`);
  for (const [field, expected] of [
    ["artworkDir", `assets/tarot/${folder}/artwork`],
    ["cardDir", `assets/tarot/${folder}/cards`],
  ]) {
    if (spec.output?.[field]?.replaceAll("\\", "/") !== expected) {
      errors.push(`${relative(specFile)} output.${field} must be ${expected}`);
    }
  }
  for (const [field, size] of [["cardSize", spec.cardSize], ["artworkArea", spec.artworkArea]]) {
    if (!Number.isInteger(size?.width) || size.width <= 0 || !Number.isInteger(size?.height) || size.height <= 0) {
      errors.push(`${relative(specFile)} ${field} needs positive integer width and height`);
    }
  }
  if (spec.cardSize?.width !== 1024 || spec.cardSize?.height !== 1768) {
    errors.push(`${relative(specFile)} cardSize must be 1024x1768`);
  }
  return { ids, cards, deck, design, back, spec, specFile, requireDeckIntros, sourceFolder: folder, sceneManifest };
}

function inspectFiles(deckId, context, errors) {
  const images = { cards: {}, deckAssets: {} };
  for (const [role, folder, size] of [
    ["artwork", "artwork", context.spec.artworkArea],
    ["card", "cards", context.spec.cardSize],
  ]) {
    const directory = repoPath(`assets/tarot/${context.sourceFolder}/${folder}`);
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      errors.push(`Missing ${role} directory: ${relative(directory)}`);
      continue;
    }
    const entries = fs.readdirSync(directory);
    exactIds(entries, context.ids.map(id => `${id}.png`), `${deckId} ${role} files`, errors);
    for (const id of context.ids) {
      const file = repoPath(`assets/tarot/${context.sourceFolder}/${folder}/${id}.png`);
      const hash = inspectPng(file, size, `${id} ${role}`, errors);
      if (hash) (images.cards[id] ||= {})[`${role}Sha256`] = hash;
    }
  }
  for (const [role, folder, size] of [
    ["cover", "deck-covers", null],
    ["back", "deck-backs", context.spec.cardSize],
  ]) {
    const assetName = role === "cover" ? context.sourceFolder : deckId;
    const assetPath = `assets/tarot/${folder}/${assetName}.png`;
    const hash = inspectPng(repoPath(assetPath), size, `${deckId} deck ${role}`, errors);
    images.deckAssets[role] = { assetPath, sha256: hash };
  }
  return images;
}

function expectedCount(card) {
  return card.arcana === "minor" ? (numberedRanks.get(card.rank) ?? null) : null;
}

function jsonSha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function withoutKeys(value, excluded) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.has(key)));
}

function deckCreativeContent(context) {
  return {
    deck: withoutKeys(context.deck, new Set(["cardIntroductions"])),
    design: withoutKeys(context.design, new Set(["cards"])),
    sceneManifest: withoutKeys(context.sceneManifest, new Set([
      "cards", "status", "updatedAt", "qualityReview", "artworkCount", "renderedCardCount", "contactSheetCount",
    ])),
  };
}

function contentSha256(card, context) {
  const intro = context.deck?.cardIntroductions?.[card.id] ??
    (!context.requireDeckIntros ? card.intro : null);
  const visualPrompt = context.design?.cards?.find(item => item.cardId === card.id)?.visualPrompt ?? null;
  const sceneCard = context.sceneManifest?.cards?.find(item => item.cardId === card.id);
  const reviewContent = {
    canonicalCard: { ...card, intro },
    visualPrompt,
    deckCreative: deckCreativeContent(context),
    sceneManifestCard: sceneCard ?? null,
  };
  return jsonSha256(reviewContent);
}

function assetContentSha256(role, context) {
  return jsonSha256({
    deckCreative: deckCreativeContent(context),
    backCreative: role === "back" ? {
      backMetadata: withoutKeys(context.back, new Set(["status"])),
    } : null,
  });
}

function pendingCard(id, card, hashes, contentHash, previous, resetReason = "imageChanged") {
  const revisionHistory = Array.isArray(previous?.revisionHistory) ? [...previous.revisionHistory] : [];
  if (previous) {
    const { revisionHistory: _history, ...oldReview } = previous;
    revisionHistory.push({ archivedAt: new Date().toISOString(), resetReason, ...oldReview });
  }
  return {
    cardId: id,
    artworkPath: `assets/tarot/${card.sourceFolder}/artwork/${id}.png`,
    cardPath: `assets/tarot/${card.sourceFolder}/cards/${id}.png`,
    artworkSha256: hashes.artworkSha256,
    cardSha256: hashes.cardSha256,
    contentSha256: contentHash,
    expectedCount: expectedCount(card),
    observedCount: null,
    countEvidence: "",
    checks: Object.fromEntries(checks.map(name => [name, { status: "pending", evidence: "" }])),
    status: "pending",
    reviewer: "",
    reviewDate: "",
    notes: "",
    issues: [],
    revisionHistory,
  };
}

function pendingDeckAsset(role, image, contentHash, context, previous, resetReason = "imageChanged") {
  const revisionHistory = Array.isArray(previous?.revisionHistory) ? [...previous.revisionHistory] : [];
  if (previous) {
    const { revisionHistory: _history, ...oldReview } = previous;
    revisionHistory.push({ archivedAt: new Date().toISOString(), resetReason, ...oldReview });
  }
  return {
    assetPath: image.assetPath,
    sha256: image.sha256,
    contentSha256: contentHash,
    checks: Object.fromEntries(assetChecks(role, context).map(name => [name, { status: "pending", evidence: "" }])),
    status: "pending",
    reviewer: "",
    reviewDate: "",
    notes: "",
    issues: [],
    revisionHistory,
  };
}

function prepare(args, context, images) {
  let previous;
  if (fs.existsSync(args.reviewFile)) {
    previous = readJson(args.reviewFile, "review file");
    if (![1, 2].includes(previous.schemaVersion) || previous.deckId !== args.deckId ||
        !previous.cards || typeof previous.cards !== "object" || Array.isArray(previous.cards)) {
      throw new Error(`Existing review file ${relative(args.reviewFile)} is not a v1/v2 ledger for ${args.deckId}`);
    }
    const extra = Object.keys(previous.cards).filter(id => !context.ids.includes(id));
    if (extra.length) throw new Error(`Existing review file contains extra card IDs: ${extra.join(", ")}`);
  }
  const cardReviews = {};
  const currentSpecSha256 = sha256(context.specFile);
  const specChanged = Boolean(previous && previous.cardSpecSha256 !== currentSpecSha256);
  let retained = 0;
  let reset = 0;
  for (const card of context.cards) {
    const id = card.id;
    const hashes = images.cards[id];
    const contentHash = contentSha256(card, context);
    const old = previous?.cards?.[id];
    const imageChanged = old?.artworkSha256 !== hashes.artworkSha256 || old?.cardSha256 !== hashes.cardSha256;
    const contentChanged = old?.contentSha256 !== contentHash;
    const criteriaChanged = Boolean(old && checks.some(name => !Object.hasOwn(old.checks ?? {}, name)));
    if (!specChanged && !imageChanged && !contentChanged && !criteriaChanged) {
      cardReviews[id] = { ...old, expectedCount: expectedCount(card) };
      retained += 1;
    } else {
      cardReviews[id] = pendingCard(id, { ...card, sourceFolder: context.sourceFolder }, hashes, contentHash, old,
        specChanged ? "cardSpecChanged" : imageChanged ? "imageChanged" : contentChanged ? "contentChanged" : "reviewCriteriaChanged");
      reset += 1;
    }
  }
  const deckAssets = {};
  const assetSummary = [];
  for (const role of ["cover", "back"]) {
    const image = images.deckAssets[role];
    const old = previous?.deckAssets?.[role];
    const contentHash = assetContentSha256(role, context);
    const imageChanged = old?.sha256 !== image.sha256 || old?.assetPath !== image.assetPath;
    const contentChanged = old?.contentSha256 !== contentHash;
    if (!imageChanged && !contentChanged) {
      deckAssets[role] = old;
      assetSummary.push(`${role} retained`);
    } else {
      deckAssets[role] = pendingDeckAsset(role, image, contentHash, context, old,
        imageChanged ? "imageChanged" : "contentChanged");
      assetSummary.push(`${role} pending/reset`);
    }
  }
  const ledger = {
    schemaVersion: 2,
    deckId: args.deckId,
    preparedAt: new Date().toISOString(),
    cardSpecSha256: currentSpecSha256,
    visualReviewNotice: "An independent reviewer must inspect every card, cover, and back and record evidence for each check. Hashes and dimensions do not prove semantic correctness. Manager acceptance is separate.",
    cards: cardReviews,
    deckAssets,
  };
  fs.mkdirSync(path.dirname(args.reviewFile), { recursive: true });
  fs.writeFileSync(args.reviewFile, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  console.log(`Prepared ${relative(args.reviewFile)}: ${context.ids.length} cards; ${retained} retained, ${reset} pending/reset; ${assetSummary.join(", ")}${specChanged ? "; card spec changed" : ""}.`);
}

function validReviewDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function verifyDecision(record, label, requiredChecks, errors) {
  for (const name of requiredChecks) {
    const value = record.checks?.[name];
    if (!value || typeof value !== "object" || value.status !== "pass") {
      errors.push(`${label}: ${name} check must be an object with status pass`);
    } else if (typeof value.evidence !== "string" || !value.evidence.trim()) {
      errors.push(`${label}: ${name} pass check requires nonempty evidence`);
    }
  }
  if (record.status !== "pass") errors.push(`${label}: review status must be pass`);
  if (typeof record.reviewer !== "string" || !record.reviewer.trim()) errors.push(`${label}: reviewer is required`);
  if (!validReviewDate(record.reviewDate)) errors.push(`${label}: reviewDate must be a valid YYYY-MM-DD date`);
  if (!Array.isArray(record.issues)) {
    errors.push(`${label}: issues must be an array`);
  } else if (record.issues.some(issue => typeof issue !== "object" || issue === null || issue.status !== "resolved")) {
    errors.push(`${label}: unresolved issues remain`);
  }
}

function verify(args, context, images, errors) {
  if (!fs.existsSync(args.reviewFile)) {
    errors.push(`Missing review ledger: ${relative(args.reviewFile)}; run prepare first`);
    return;
  }
  const ledger = readJson(args.reviewFile, "review ledger");
  if (ledger.schemaVersion !== 2 || ledger.deckId !== args.deckId) {
    errors.push(`Review ledger must be schemaVersion 2 for ${args.deckId}; run prepare to upgrade`);
  }
  if (ledger.cardSpecSha256 !== sha256(context.specFile)) {
    errors.push("Card spec changed since review ledger preparation; run prepare and review all cards again");
  }
  const records = ledger.cards && typeof ledger.cards === "object" && !Array.isArray(ledger.cards) ? ledger.cards : {};
  exactIds(Object.keys(records), context.ids, "Review ledger cards", errors);
  for (const card of context.cards) {
    const id = card.id;
    const record = records[id];
    if (!record) continue;
    if (record.cardId !== id || record.artworkPath !== `assets/tarot/${context.sourceFolder}/artwork/${id}.png` ||
        record.cardPath !== `assets/tarot/${context.sourceFolder}/cards/${id}.png`) {
      errors.push(`${id}: review record ID or source paths do not match this card`);
    }
    const image = images.cards[id];
    if (!image?.artworkSha256 || record.artworkSha256 !== image.artworkSha256) {
      errors.push(`${id}: artwork SHA-256 differs from approved review; run prepare`);
    }
    if (!image?.cardSha256 || record.cardSha256 !== image.cardSha256) {
      errors.push(`${id}: rendered card SHA-256 differs from approved review; run prepare`);
    }
    if (record.contentSha256 !== contentSha256(card, context)) {
      errors.push(`${id}: content SHA-256 differs from approved review; run prepare and review this card again`);
    }
    if (record.expectedCount !== expectedCount(card)) errors.push(`${id}: expectedCount is inconsistent with canonical rank`);
    const requiredCount = expectedCount(card);
    if (requiredCount !== null && (record.observedCount !== requiredCount || !String(record.countEvidence || "").trim())) {
      errors.push(`${id}: reviewer must confirm ${requiredCount} ${card.suit} symbols and provide countEvidence`);
    }
    verifyDecision(record, id, checks, errors);
  }
  const assetRecords = ledger.deckAssets && typeof ledger.deckAssets === "object" && !Array.isArray(ledger.deckAssets)
    ? ledger.deckAssets : {};
  exactIds(Object.keys(assetRecords), ["cover", "back"], "Review ledger deck assets", errors);
  for (const role of ["cover", "back"]) {
    const image = images.deckAssets[role];
    const record = assetRecords[role];
    if (!record || typeof record !== "object") {
      errors.push(`${role}: missing deck asset review record`);
      continue;
    }
    if (record.assetPath !== image.assetPath || !image.sha256 || record.sha256 !== image.sha256) {
      errors.push(`${role}: asset path or SHA-256 differs from approved review; run prepare`);
    }
    if (record.contentSha256 !== assetContentSha256(role, context)) {
      errors.push(`${role}: content SHA-256 differs from approved review; run prepare and review this asset again`);
    }
    verifyDecision(record, role, assetChecks(role, context), errors);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = [];
  const context = loadContext(args, errors);
  const images = inspectFiles(args.deckId, context, errors);
  if (args.command === "verify") verify(args, context, images, errors);
  if (errors.length) {
    const limit = 40;
    const shown = errors.slice(0, limit);
    const remaining = errors.length - shown.length;
    throw new Error(`${args.command} failed with ${errors.length} issue(s):\n- ${shown.join("\n- ")}${remaining ? `\n... and ${remaining} more issue(s)` : ""}`);
  }
  if (args.command === "prepare") prepare(args, context, images);
  else console.log(`Tarot deck quality gate passed for ${args.deckId}: all ${context.ids.length} cards, cover, and back reviewed with unchanged source files.`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
