import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ARTIFACTS = 'artifacts/tinh-quang-artwork-qc-2026-10-18';
const DECK = 'assets/tarot/tinh-quang';
const STAGING = 'packages/content/data/tarot-staging/tinh-quang';
export const CHECKS = ['anatomyAndPose', 'propContactAndSupport', 'symbolCount', 'sceneAndMeaning', 'textFrameAndArtifacts', 'mobileLegibility', 'originality'];
const ranks = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const text = (s) => typeof s === 'string' && s.trim().length >= 12;
const json = (p) => JSON.parse(fs.readFileSync(resolve(p), 'utf8'));
const write = (p, value) => { fs.mkdirSync(path.dirname(resolve(p)), { recursive: true }); fs.writeFileSync(resolve(p), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n'); };
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function amendMetadata(value, replacements) {
  if (typeof value === 'string') return replacements.reduce((s, r) => s.split(r.before).join(r.after), value);
  if (Array.isArray(value)) return value.map(v => amendMetadata(v, replacements));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, amendMetadata(v, replacements)]));
  return value;
}

function resolve(p) {
  if (typeof p !== 'string' || p.includes('\\') || path.isAbsolute(p) || p.split('/').some(x => x === '..' || x === '.')) throw new Error('Unsafe repository path: ' + p);
  const absolute = path.resolve(ROOT, p);
  if (!absolute.startsWith(path.resolve(ROOT) + path.sep)) throw new Error('Path outside repository');
  let existing = absolute;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  const real = fs.realpathSync(existing), realRoot = fs.realpathSync(ROOT);
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) throw new Error('Symlink outside repository');
  return absolute;
}

export function inspectSource(bytes, expectedHash) {
  if (digest(bytes) !== expectedHash) throw new Error('Source SHA-256 mismatch');
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature) || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(16) !== 656 || bytes.readUInt32BE(20) !== 1130) throw new Error('Source must be a 656x1130 PNG');
}

export function validateReviews(inventory, reviews, canonical) {
  const errors = [], expected = new Map(canonical.map(c => [c.id, c]));
  const sources = new Map(), seen = new Set();
  if (canonical.length !== 78 || expected.size !== 78) errors.push('Canonical roster must have 78 unique IDs');
  if (inventory.deckId !== 'tinh-quang' || inventory.cards?.length !== 78) errors.push('Inventory must contain 78 Tinh Quang sources');
  for (const source of inventory.cards || []) {
    if (!expected.has(source.cardId) || sources.has(source.cardId)) errors.push('Unknown/duplicate inventory ID: ' + source.cardId);
    sources.set(source.cardId, source);
    if (!source.sourcePath?.startsWith(DECK + '/') || !/^[a-f0-9]{64}$/.test(source.sourceSha256 || '')) errors.push('Invalid source identity: ' + source.cardId);
  }
  if (reviews.stage !== 'source_artwork_only' || !text(reviews.reviewer) || !/^\d{4}-\d{2}-\d{2}$/.test(reviews.date || '')) errors.push('Named source-only reviewer and date required');
  if (reviews.cards?.length !== 78) errors.push('Exactly 78 individual review records required');
  for (const row of reviews.cards || []) {
    const id = row.cardId, card = expected.get(id), source = sources.get(id);
    if (!card || seen.has(id)) errors.push('Unknown/duplicate review ID: ' + id);
    seen.add(id);
    if (!source || row.sourcePath !== source.sourcePath || row.sourceSha256 !== source.sourceSha256) errors.push('Review does not bind current source: ' + id);
    if (!['accepted', 'rejected', 'pending'].includes(row.decision)) errors.push('Invalid decision: ' + id);
    for (const name of CHECKS) {
      const check = row.checks?.[name];
      if (!['pass', 'fail', 'pending'].includes(check?.status) || !text(check?.evidence)) errors.push('Missing specific ' + name + ' evidence: ' + id);
      if (row.decision === 'accepted' && check?.status !== 'pass') errors.push('Accepted card has unresolved ' + name + ': ' + id);
    }
    if (!Array.isArray(row.issues)) errors.push('Issue list required: ' + id);
    if (row.decision === 'accepted' && row.issues?.length) errors.push('Accepted card has issues: ' + id);
    if (row.decision !== 'accepted' && !row.issues?.length) errors.push('Nonaccepted card needs an actionable issue: ' + id);
    for (const issue of row.issues || []) {
      if (!['low', 'medium', 'high'].includes(issue.severity) || !text(issue.location) || !text(issue.actual) || !text(issue.expected) || !text(issue.regenerationDirection)) errors.push('Incomplete regeneration issue: ' + id);
    }
    const numbered = card?.arcana === 'minor' ? ranks.indexOf(card.rank) + 1 : 0;
    const plannedCourt = card?.arcana === 'minor' && Number.isInteger(source?.symbolPlan?.requiredCount) && source.symbolPlan.requiredCount > 0 ? source.symbolPlan.requiredCount : 0;
    const requiredCount = numbered || plannedCourt;
    if (requiredCount && row.decision === 'accepted' && (row.observedCount !== requiredCount || !text(row.countEvidence))) errors.push('Accepted suit card requires exact count/location evidence: ' + id);
  }
  for (const id of expected.keys()) if (!seen.has(id)) errors.push('Unreviewed card: ' + id);
  return errors;
}

function load() {
  const inventory = json(ARTIFACTS + '/source-inventory.json');
  const canonical = json('packages/content/data/tarot-cards.json');
  const reviews = json(DECK + '/artwork-review.json');
  const errors = validateReviews(inventory, reviews, canonical);
  if (errors.length) throw new Error(errors.join('\n'));
  for (const source of inventory.cards) inspectSource(fs.readFileSync(resolve(source.sourcePath)), source.sourceSha256);
  return { inventory, canonical, reviews };
}

function requireInactive() {
  for (const file of ['tarot-decks.json', 'tarot-card-designs.json', 'tarot-deck-backs.json']) {
    if (json('packages/content/data/' + file).some(x => (['tinh-quang', 'celestial-reverie'].includes(x.id) || ['tinh-quang', 'celestial-reverie'].includes(x.deckId)))) throw new Error('Intake must not activate the deck in ' + file);
  }
}

function prepare() {
  const { inventory, canonical, reviews } = load();
  requireInactive();
  const byId = new Map(reviews.cards.map(r => [r.cardId, r]));
  const accepted = inventory.cards.filter(x => byId.get(x.cardId).decision === 'accepted');
  const base = inventory.metadataBasePath;
  const amendments = json(ARTIFACTS + '/metadata-amendments.json');
  const revised = file => amendMetadata(json(base + '/' + file), amendments.replacements);
  const deck = revised('tinh-quang-only-tarot-decks.json');
  if (deck.id !== 'tinh-quang' || deck.status !== 'draft') throw new Error('Expected draft Tinh Quang metadata');
  fs.mkdirSync(resolve(DECK + '/artwork'), { recursive: true });
  // The supplied archives and rejected artwork are never renamed or overwritten.
  for (const source of accepted) {
    const dest = DECK + '/artwork/' + source.cardId + '.png';
    if (fs.existsSync(resolve(dest))) {
      if (digest(fs.readFileSync(resolve(dest))) !== source.sourceSha256) throw new Error('Refusing to overwrite different admitted artwork: ' + source.cardId);
    } else fs.copyFileSync(resolve(source.sourcePath), resolve(dest), fs.constants.COPYFILE_EXCL);
  }
  const spec = json(base + '/card-spec.json');
  spec.version = '2026-10-18-source-intake-draft';
  write(DECK + '/card-spec.json', spec);
  const scenes = revised('tinh-quang-full-deck-manifest.json');
  scenes.importedVersion = scenes.version;
  scenes.version = '2026-10-18-source-qc-metadata-alignment';
  scenes.metadataAmendments = ARTIFACTS + '/metadata-amendments.json';
  scenes.stagingStatus = 'source-review-completed-final-card-QC-pending';
  scenes.cards = scenes.cards.map(c => ({ ...c, sourceArtworkStatus: byId.get(c.cardId).decision, renderEligible: byId.get(c.cardId).decision === 'accepted' }));
  write(DECK + '/tinh-quang-full-deck-manifest.json', scenes);
  write(STAGING + '/tarot-decks.json', [{ ...deck, theme: ['self', 'daily', 'explore'], status: 'draft', stagingNotes: ['Source-only intake; excluded from active deck arrays.', 'Themes follow the supplied self-reflection, daily and creative-exploration uses. Access tier remains an Owner product decision. Final faces, cover/back and runtime QC pending.'] }]);
  const designs = revised('tinh-quang-only-tarot-card-designs.json');
  const creative = revised('content-v6.json');
  creative.importedVersion = creative.version;
  creative.version = '6-source-intake-2026-10-18';
  creative.importedRevisionNote = creative.revisionNote;
  creative.revisionNote = 'Source intake aligned three card descriptions with observed artwork; supplied originals retained, final faces and runtime pending.';
  creative.canonicalMappingStatus = '78 IDs and titles checked against the current packages/content/data/tarot-cards.json; current source hash is recorded in card-catalog.json.';
  creative.qcStatus = 'source artwork reviewed; metadata alignment recorded for ' + new Set(amendments.replacements.map(x => x.cardId)).size + ' cards; final card and runtime QC pending';
  creative.productionNotes = { ...creative.productionNotes, importedSourceReferences: creative.productionNotes?.sourceReferences || [], sourceReferences: [ARTIFACTS + '/source-inventory.json', ARTIFACTS + '/metadata-amendments.json', DECK + '/artwork-review.json', 'packages/content/data/tarot-cards.json'], qcStatus: creative.qcStatus };
  write(STAGING + '/content.json', creative);
  write(STAGING + '/tarot-card-designs.json', [designs]);
  write(STAGING + '/tarot-deck-backs.json', [revised('tinh-quang-only-tarot-deck-backs.json')]);
  write(STAGING + '/card-catalog.json', { schemaVersion: 1, deckId: 'tinh-quang', status: 'draft', canonicalSource: 'packages/content/data/tarot-cards.json', canonicalSourceSha256: digest(fs.readFileSync(resolve('packages/content/data/tarot-cards.json'))), cards: canonical.map(c => {
    const review = byId.get(c.id), source = inventory.cards.find(x => x.cardId === c.id), design = designs.cards.find(x => x.cardId === c.id), content = creative.cards.find(x => x.cardId === c.id);
    return { cardId: c.id, deckId: 'tinh-quang', title: c.name, arcana: c.arcana, suit: c.suit, rank: c.rank, keywords: c.keywords, intro: deck.cardIntroductions[c.id], personalityPortrait: c.personalityPortrait, uprightMeaning: c.uprightMeaning, reversedMeaning: c.reversedMeaning, reflectionQuestion: c.reflectionQuestion, visualPrompt: design.visualPrompt, scene: content.scene, symbolPlan: content.symbolPlan, artworkStatus: review.decision, artworkPath: review.decision === 'accepted' ? DECK + '/artwork/' + c.id + '.png' : null, sourcePath: source.sourcePath, sourceSha256: source.sourceSha256, cardPath: null, plannedCardPath: DECK + '/cards/' + c.id + '.png', finalCardQC: 'not_run', contentQC: 'source_metadata_reviewed_final_card_pending' };
  }) });
  write(STAGING + '/approved-artwork.json', { schemaVersion: 1, deckId: 'tinh-quang', stage: 'source_artwork_only', reviewPath: DECK + '/artwork-review.json', reviewSha256: digest(fs.readFileSync(resolve(DECK + '/artwork-review.json'))), assets: accepted.map(c => ({ cardId: c.cardId, path: DECK + '/artwork/' + c.cardId + '.png', sha256: c.sourceSha256, width: 656, height: 1130 })) });
  const blocked = reviews.cards.filter(r => r.decision !== 'accepted');
  const blockers = [
    ...(blocked.length ? [blocked.length + ' source artworks rejected or pending'] : []),
    'Final card PNGs and native/mobile face QC not run',
    'Cover and back image files unavailable in supplied package',
    'Access tier is null and requires an Owner product decision',
    'Final bilingual content, full-deck quality ledger, Android and remote readback acceptance pending',
  ];
  write(STAGING + '/render-plan.json', { schemaVersion: 1, deckId: 'tinh-quang', stage: blocked.length ? 'partial_source_preparation' : 'source_preparation_complete', approvedIds: accepted.map(x => x.cardId), blockedIds: blocked.map(x => x.cardId), specPath: DECK + '/card-spec.json', sceneManifestPath: DECK + '/tinh-quang-full-deck-manifest.json', requires: ['node scripts/tinh-quang-intake.mjs verify', 'Use render_tarot_cards.py --deck tinh-quang --all-existing; never --placeholder', 'Individually review actual rendered faces after rendering'], fullDeckReady: false });
  write(STAGING + '/sync-plan.json', { schemaVersion: 1, deckId: 'tinh-quang', activationAllowed: false, targetProject: null, sourceReviewStage: 'source_artwork_only', blockers, steps: ['Replace rejected/pending source artworks and re-review their exact hashes.', 'Render only admitted artwork and review every actual card face.', 'Supply cover/back, review crops and reversible back; resolve access tier.', 'Review final VI/EN deck content, then merge the three draft arrays into active canonical data with exactly 78 ready cards.', 'Refresh final quality-review.json using standard prepare --require-deck-intros; verify only after all checks pass.', 'Generate Admin seed and runtime JPEGs, add exact deck mappings and deck-story adapter; validate data, visuals, typecheck and Android bundle.', 'Owner Android acceptance before Google Play; iOS native acceptance deferred. Published database changes need a separately approved exact target and migration path.'], remoteActionsPerformed: [] });
  const sync = json(STAGING + '/sync-plan.json');
  sync.requiredAssets = { cardCount: 78, artworkSize: [656, 1130], renderedCardSize: [1024, 1768], cover: 'assets/tarot/deck-covers/tinh-quang.png', back: 'assets/tarot/deck-backs/tinh-quang.png', backRotationDegrees: 180 };
  sync.runtimeBindings = { cardsModule: './assets/runtime/tarot/tinh-quang/cards', coverModule: '../assets/runtime/tarot/deck-covers/tinh-quang.jpg', backModule: '../assets/runtime/tarot/deck-backs/tinh-quang.jpg', cardMapOwner: 'apps/mobile/App.tsx:deckCardImages', deckVisualsOwner: 'apps/mobile/src/visualAssets.ts:deckVisuals', deckStoryOwner: 'apps/mobile/App.tsx:getTarotDeckStory', storyFieldMapping: { origin: 'story', audience: 'audience', ritual: 'bestUses', prompts: 'reflectionQuestions' }, exporter: 'scripts/build-mobile-runtime-assets.ps1 -OnlyTarotDeck tinh-quang', generatedAdminSeedScript: 'admin:seed' };
  sync.activeDataMergeTargets = ['packages/content/data/tarot-decks.json', 'packages/content/data/tarot-card-designs.json', 'packages/content/data/tarot-deck-backs.json'];
  write(STAGING + '/sync-plan.json', sync);
  reports(inventory, reviews, blockers, amendments);
  const declaredFiles = ['tarot-decks.json', 'tarot-card-designs.json', 'tarot-deck-backs.json', 'content.json', 'card-catalog.json', 'approved-artwork.json', 'render-plan.json', 'sync-plan.json'].map(x => STAGING + '/' + x).concat([DECK + '/card-spec.json', DECK + '/tinh-quang-full-deck-manifest.json']);
  const sourceMetadata = ['content-v6.json', 'card-spec.json', 'tinh-quang-full-deck-manifest.json', 'tinh-quang-only-tarot-decks.json', 'tinh-quang-only-tarot-card-designs.json', 'tinh-quang-only-tarot-deck-backs.json'].map(x => base + '/' + x);
  write(STAGING + '/staging-manifest.json', { schemaVersion: 1, deckId: 'tinh-quang', stage: 'source_preparation_only', files: declaredFiles.map(p => ({ path: p, sha256: digest(fs.readFileSync(resolve(p))) })), sourceMetadata: sourceMetadata.map(p => ({ path: p, sha256: digest(fs.readFileSync(resolve(p))) })), amendmentsSha256: digest(fs.readFileSync(resolve(ARTIFACTS + '/metadata-amendments.json'))) });
  verify();
}

function verify() {
  const { inventory, canonical, reviews } = load();
  requireInactive();
  const expected = new Map(reviews.cards.filter(x => x.decision === 'accepted').map(x => [x.cardId + '.png', x]));
  const directory = resolve(DECK + '/artwork');
  const actual = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
  if (actual.length !== expected.size || actual.some(x => !expected.has(x))) throw new Error('Admitted artwork directory differs from accepted IDs');
  for (const name of actual) inspectSource(fs.readFileSync(path.join(directory, name)), expected.get(name).sourceSha256);
  const assets = json(STAGING + '/approved-artwork.json');
  if (assets.reviewSha256 !== digest(fs.readFileSync(resolve(DECK + '/artwork-review.json'))) || assets.assets.length !== expected.size) throw new Error('Approved asset manifest stale');
  for (const a of assets.assets) if (a.path !== DECK + '/artwork/' + a.cardId + '.png' || a.sha256 !== expected.get(a.cardId + '.png')?.sourceSha256) throw new Error('Approved asset declaration mismatch');
  const catalog = json(STAGING + '/card-catalog.json');
  if (catalog.canonicalSourceSha256 !== digest(fs.readFileSync(resolve('packages/content/data/tarot-cards.json'))) || catalog.cards.length !== 78 || new Set(catalog.cards.map(x => x.cardId)).size !== 78) throw new Error('Draft catalog is stale/incomplete');
  for (const row of catalog.cards) {
    const review = reviews.cards.find(x => x.cardId === row.cardId);
    if (!review || row.artworkStatus !== review.decision || row.artworkPath !== (review.decision === 'accepted' ? DECK + '/artwork/' + row.cardId + '.png' : null) || row.sourceSha256 !== review.sourceSha256 || row.cardPath !== null || row.finalCardQC !== 'not_run') throw new Error('Draft catalog readiness mismatch: ' + row.cardId);
  }
  const deck = json(STAGING + '/tarot-decks.json');
  if (deck.length !== 1 || deck[0].id !== 'tinh-quang' || deck[0].status !== 'draft' || Object.keys(deck[0].cardIntroductions).length !== 78) throw new Error('Invalid draft deck');
  for (const file of ['tarot-card-designs.json', 'tarot-deck-backs.json']) if (json(STAGING + '/' + file)[0]?.deckId !== 'tinh-quang') throw new Error('Wrong staged deck metadata');
  const designs = json(STAGING + '/tarot-card-designs.json')[0], scenes = json(DECK + '/tinh-quang-full-deck-manifest.json');
  const exact = rows => rows?.length === 78 && new Set(rows.map(x => x.cardId)).size === 78 && rows.every(x => canonical.some(c => c.id === x.cardId));
  const localized = x => typeof x?.vi === 'string' && x.vi.trim() && typeof x?.en === 'string' && x.en.trim();
  if (!exact(designs.cards) || !exact(scenes.cards) || !designs.cards.every(x => localized(x.visualPrompt)) || !scenes.cards.every(x => text(x.scene) && text(x.prompt))) throw new Error('Incomplete bilingual scene/prompt roster');
  if (!catalog.cards.every(x => localized(x.intro) && localized(x.uprightMeaning) && localized(x.reversedMeaning) && localized(x.reflectionQuestion)) || !canonical.every(c => localized(deck[0].cardIntroductions[c.id]))) throw new Error('Incomplete localized card data');
  const spec = json(DECK + '/card-spec.json');
  if (spec.deckId !== 'tinh-quang' || spec.cardSize.width !== 1024 || spec.cardSize.height !== 1768 || spec.artworkArea.width !== 656 || spec.artworkArea.height !== 1130 || spec.output.artworkDir !== DECK + '/artwork' || spec.output.cardDir !== DECK + '/cards') throw new Error('Wrong render geometry/paths');
  const manifest = json(STAGING + '/staging-manifest.json');
  if (manifest.deckId !== 'tinh-quang' || manifest.files.length !== 10 || manifest.sourceMetadata.length !== 6 || manifest.amendmentsSha256 !== digest(fs.readFileSync(resolve(ARTIFACTS + '/metadata-amendments.json')))) throw new Error('Staging integrity manifest invalid');
  for (const f of [...manifest.files, ...manifest.sourceMetadata]) if (digest(fs.readFileSync(resolve(f.path))) !== f.sha256) throw new Error('Staged or imported metadata changed: ' + f.path);
  if (json(STAGING + '/sync-plan.json').activationAllowed !== false || json(STAGING + '/render-plan.json').fullDeckReady !== false) throw new Error('Incomplete source intake cannot certify full-deck activation');
  console.log('Tinh Quang SOURCE INTAKE passed: 78 reviewed; ' + expected.size + ' accepted files copied losslessly; ' + (canonical.length - expected.size) + ' excluded. Final card QC and activation remain blocked.');
}

function reports(inventory, reviews, blockers, amendments) {
  const counts = { accepted: 0, rejected: 0, pending: 0 };
  reviews.cards.forEach(x => counts[x.decision]++);
  const issueRows = reviews.cards.filter(x => x.decision !== 'accepted');
  write(ARTIFACTS + '/regeneration-requests.json', { deckId: 'tinh-quang', date: '2026-10-18', requestCount: issueRows.length, requests: issueRows.map(r => ({ cardId: r.cardId, decision: r.decision, retainedSourcePath: r.sourcePath, sourceSha256: r.sourceSha256, issues: r.issues })) });
  const label = { accepted: 'Đạt để tạo card', rejected: 'Cần tạo lại', pending: 'Chờ làm rõ' };
  const name = id => inventory.cards.find(x => x.cardId === id).title.en;
  let md = '# Rà soát artwork bộ Tinh Quang\n\nNgày 18/10/2026. Đã xem riêng đủ 78 ảnh nguồn và đối chiếu ý nghĩa, kế hoạch cảnh, biểu tượng, giải phẫu, tiếp xúc vật thể và độ rõ ở kích thước nhỏ. ' + counts.accepted + ' ảnh đạt để chuẩn bị tạo card; ' + counts.rejected + ' ảnh cần tạo lại; ' + counts.pending + ' ảnh chờ làm rõ. Đây là nghiệm thu ảnh bên trong, chưa phải nghiệm thu mặt card hoàn chỉnh hoặc bản ứng dụng.\n\n';
  md += 'Phạm vi chọn nguồn: 78 bản chuẩn hóa được manifest của hai PART chọn, mỗi ảnh 656 × 1130 px. Thư mục bàn giao còn giữ 3 bản normalized của gói vá và 10 raw variants lịch sử; các bản đó không được chọn làm đầu vào thay thế trong lượt này. Đã kiểm 78 checksum, giải mã PNG và đối chiếu từng ảnh riêng; contact sheet chỉ dùng kiểm tra tính nhất quán sau đó.\n\n';
  md += '## Ảnh cần xử lý\n\nTất cả ảnh gốc, ZIP và biến thể cũ được giữ nguyên trong thư mục nguồn. Chỉ ảnh đạt được sao chép không đổi byte vào `assets/tarot/tinh-quang/artwork`.\n\n';
  if (!issueRows.length) md += '**Không có artwork nào buộc phải tạo lại trong lần rà soát này.** Những khác biệt nhỏ của mô tả đã được điều chỉnh ở metadata nháp để khớp ảnh, không đổi nội dung hình ảnh.\n\n';
  for (const row of issueRows) {
    md += '### ' + name(row.cardId) + '\n\nID: `' + row.cardId + '` · ' + label[row.decision] + '\n\n';
    for (const issue of row.issues) md += '- **Vị trí:** ' + issue.location + '. **Hiện tại:** ' + issue.actual + '\n- **Cần đúng:** ' + issue.expected + '\n- **Hướng tạo lại:** ' + issue.regenerationDirection + '\n\n';
    md += '[Mở ảnh gốc](../' + row.sourcePath + ')\n\n';
  }
  md += '## Bảng đánh giá đủ 78 lá\n\n| Lá | Kết quả ảnh nguồn | Biểu tượng và vị trí | Tinh thần và cảnh |\n| --- | --- | --- | --- |\n';
  for (const row of reviews.cards) md += '| ' + name(row.cardId) + ' | ' + label[row.decision] + ' | ' + (row.countEvidence || row.checks.symbolCount.evidence).replaceAll('|', '/') + ' | ' + row.checks.sceneAndMeaning.evidence.replaceAll('|', '/') + ' |\n';
  md += '\n## Mô tả đã điều chỉnh để khớp ảnh\n\n' + amendments.notes.map(x => '- ' + x).join('\n') + '\n\nCác chỉnh này áp dụng đồng thời cho scene, prompt và contact plan trong bản dữ liệu chuẩn bị; gói nguồn vẫn giữ nguyên.\n';
  md += '\n## Dữ liệu đã chuẩn bị\n\n- `assets/tarot/tinh-quang/artwork/`: chỉ ảnh nguồn đạt, tên đúng canonical ID, 656 × 1130 px, SHA-256 khớp nguyên bản.\n- `assets/tarot/tinh-quang/card-spec.json`: khung card 1024 × 1768 px, vùng artwork và palette theo bản nháp Tinh Quang.\n- `assets/tarot/tinh-quang/tinh-quang-full-deck-manifest.json`: 78 kế hoạch cảnh và prompt, đánh dấu từng lá có đủ điều kiện render hay chưa.\n- `assets/tarot/tinh-quang/artwork-review.json`: bằng chứng riêng từng lá, reviewer, số vật thể, lỗi và hash ảnh.\n- `packages/content/data/tarot-staging/tinh-quang/`: profile bộ bài, 78 giới thiệu VI/EN, prompt, nghĩa chuẩn, danh mục ảnh đạt và kế hoạch render/sync. Trường ảnh được chặn ở các lá chưa đạt.\n\n';
  md += '## Việc cần triển khai tiếp\n\n1. Tạo lại các ảnh trong danh sách trên theo lỗi cụ thể; giữ bản cũ, nhập ảnh mới và review lại hash mới.\n2. Chạy `node scripts/tinh-quang-intake.mjs verify` trước render. Dùng bundled Python chạy `scripts/render_tarot_cards.py --deck tinh-quang --all-existing`; không dùng placeholder. Chỉ những file đã được duyệt có trong thư mục artwork chuẩn.\n3. Review riêng tất cả mặt card vừa tạo ở kích thước gốc và điện thoại: title, keyword, crop, khung, số biểu tượng và tương phản. Mặt card chưa được tạo trong đợt nhập nguồn này.\n4. Bổ sung bìa/lưng bài thật, kiểm đối xứng 180 độ nếu yêu cầu; chốt access tier đang để null và duyệt nội dung VI/EN cuối.\n5. Khi đủ 78 ảnh/mặt card và bìa/lưng đạt, đưa ba bộ dữ liệu nháp vào các mảng Tarot chính, tạo ledger chuẩn bằng `prepare --deck tinh-quang --require-deck-intros`, hoàn tất bằng chứng rồi chạy `verify`. Không bỏ qua các mục còn thiếu để làm gate xanh.\n6. Tạo lại seed Admin, xuất JPEG runtime, khai báo mapping ảnh và adapter câu chuyện bộ bài. Chạy kiểm tra dữ liệu, ảnh, TypeScript, tests và Android embedded bundle trên source cuối.\n7. Owner kiểm thử Android: Explore → Tinh Quang → thư viện đủ 78 lá → rút bài → kết quả → lưu/mở Journal; kiểm VI/EN, offline và ảnh fallback. iOS native hoãn theo quyết định Owner, không cản ứng viên Android. Đồng bộ cloud cần target/phê duyệt và kiểm đọc lại riêng; đợt này không ghi cloud.\n\n';
  md += '## Điều kiện còn chặn đồng bộ và phát hành\n\n' + blockers.map(x => '- ' + x).join('\n') + '\n\nẢnh không có dấu hiệu sao chép/logo rõ ràng trong phạm vi review thị giác; nhận định này không xác minh toàn bộ lịch sử quyền sử dụng. Các gói nguồn có thể chứa mô tả QC cũ, nhưng quyết định lần này gắn với ảnh đã xem và hash hiện tại.\n\n';
  md += '## Bằng chứng\n\n- [Gallery lọc theo trạng thái và chất](../' + ARTIFACTS + '/gallery.html)\n- [Inventory 78 nguồn](../' + ARTIFACTS + '/source-inventory.json)\n- [Ledger nguồn](../' + DECK + '/artwork-review.json)\n- [Danh mục dữ liệu chờ nhập ứng dụng](../' + STAGING + '/card-catalog.json)\n';
  write('docs/TINH_QUANG_ARTWORK_QC_2026-10-18.vi.md', md);
  write(DECK + '/README.vi.md', '# Tinh Quang source intake\n\nẢnh trong artwork/ đã đạt review ảnh nguồn ngày 18/10/2026; chỉ đây là đầu vào được phép dùng cho tạo card. Các thư mục PART-1, PART-2 và Source-Completion là nguồn lưu trữ, giữ nguyên.\n\nChạy `node scripts/tinh-quang-intake.mjs verify` trước render. Xem báo cáo `docs/TINH_QUANG_ARTWORK_QC_2026-10-18.vi.md` và dữ liệu nháp `packages/content/data/tarot-staging/tinh-quang`. Final card QC, cover/back, Android acceptance và publish chưa đạt.\n');
  write(STAGING + '/README.vi.md', '# Dữ liệu nháp Tinh Quang\n\nBộ dữ liệu này nằm trong khu vực nội dung Tarot nhưng chưa thuộc ba mảng đang chạy của ứng dụng. Giữ `status: draft`, `activationAllowed: false` và `cardPath: null` cho tới khi tạo card và hoàn tất QC.\n\n`approved-artwork.json` là danh sách duy nhất các PNG được phép render trong đợt này. `card-catalog.json` giữ đủ 78 ID; artworkPath chỉ có ở lá đã đạt. Nghĩa chung lấy từ canonical hiện tại, không ghi đè tarot-cards.json bằng bản đóng gói cũ. `sync-plan.json` ghi các điều kiện còn thiếu và thứ tự tích hợp; không chứa credentials/SQL.\n');
  const articles = reviews.cards.map(row => { const c = inventory.cards.find(x => x.cardId === row.cardId); return '<article data-status="' + row.decision + '" data-suit="' + (c.suit || 'major') + '" data-name="' + escape(name(row.cardId).toLowerCase()) + '"><a href="../../' + encodeURI(row.sourcePath) + '"><img loading="lazy" src="../../' + encodeURI(row.sourcePath) + '" alt="' + escape(name(row.cardId)) + '"></a><div><h2>' + escape(name(row.cardId)) + '</h2><strong class="' + row.decision + '">' + label[row.decision] + '</strong><p>' + escape(row.countEvidence || row.checks.symbolCount.evidence) + '</p><p>' + escape(row.checks.sceneAndMeaning.evidence) + '</p>' + row.issues.map(i => '<p class="issue"><b>' + escape(i.location) + ':</b> ' + escape(i.actual) + '<br><b>Cần sửa:</b> ' + escape(i.regenerationDirection) + '</p>').join('') + '</div></article>'; }).join('\n');
  write(ARTIFACTS + '/gallery.html', '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rà soát artwork Tinh Quang</title><style>body{margin:0;background:#151416;color:#f7f1e6;font:16px system-ui}header,main{max-width:1400px;margin:auto;padding:28px}h1{font:42px Georgia;margin:0 0 12px}header p{max-width:900px;line-height:1.6}.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}input,select{padding:12px;background:#222;color:inherit;border:1px solid #777;border-radius:6px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px}article{background:#202023;border-radius:6px;overflow:hidden}article[hidden]{display:none}img{display:block;width:100%;height:440px;object-fit:contain;background:#08252b}article div{padding:18px}h2{font:25px Georgia;margin:0 0 12px}p{line-height:1.55}.accepted{color:#9cdbbe}.rejected{color:#f5a3a8}.pending{color:#eac77e}.issue{border-left:3px solid #c9828d;padding-left:12px}small{color:#a8a3a0}</style><header><h1>Rà soát artwork Tinh Quang</h1><p>78 ảnh nguồn · ' + counts.accepted + ' đạt để tạo card · ' + counts.rejected + ' cần tạo lại · ' + counts.pending + ' chờ làm rõ. Bấm ảnh để mở nguồn đầy đủ. Đây là review ảnh bên trong; mặt card và bản ứng dụng cần nghiệm thu sau.</p><small>18/10/2026 · Giữ nguyên mọi nguồn gốc · Chỉ ảnh đạt được đưa vào artwork/ chuẩn</small><div class="toolbar"><select id="status"><option value="">Tất cả trạng thái</option><option value="accepted">Đạt để tạo card</option><option value="rejected">Cần tạo lại</option><option value="pending">Chờ làm rõ</option></select><select id="suit"><option value="">Tất cả nhóm</option><option>major</option><option>wands</option><option>cups</option><option>swords</option><option>pentacles</option></select><input id="search" placeholder="Tìm tên lá" aria-label="Tìm tên lá"></div></header><main>' + articles + '</main><script>const controls=["status","suit","search"].map(x=>document.getElementById(x));function filter(){for(const a of document.querySelectorAll("article"))a.hidden=(controls[0].value&&a.dataset.status!==controls[0].value)||(controls[1].value&&a.dataset.suit!==controls[1].value)||!a.dataset.name.includes(controls[2].value.toLowerCase());}controls.forEach(c=>c.addEventListener("input",filter));</script></html>');
  write(ARTIFACTS + '/summary.json', { date: '2026-10-18', deckId: 'tinh-quang', reviewedCount: 78, ...counts, sourceImagesChanged: 0, renderedCards: 0, sourceOnly: true, activationAllowed: false, blockers });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (['prepare', 'verify'].includes(process.argv[2])) requireInactive();
    if (process.argv[2] === 'prepare') prepare();
    else if (process.argv[2] === 'verify') verify();
    else throw new Error('Usage: node scripts/tinh-quang-intake.mjs prepare|verify');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
