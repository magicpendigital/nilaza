import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const base = path.resolve('docs/reviews/2026-09-30');
const screenshots = path.join(base, 'screenshots');
const readJson = file => JSON.parse(fs.readFileSync(path.join(base, file), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'Expected JPEG magic');
  let index = 2;
  while (index < bytes.length) {
    while (bytes[index] === 0xff) index++;
    const marker = bytes[index++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(index);
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(index + 5), height: bytes.readUInt16BE(index + 3) };
    }
    index += length;
  }
  throw new Error('JPEG dimensions not found');
}

const manifest = fs.readdirSync(screenshots).filter(file => file.endsWith('.jpg')).sort().map(file => {
  const bytes = fs.readFileSync(path.join(screenshots, file));
  return { file, format: 'JPEG', ...jpegSize(bytes), bytes: bytes.length, sha256: sha(bytes),
    evidence: file === 'admin-auth-gate.jpg' ? 'Earlier login-required state in this run; user subsequently signed in.'
      : file === 'persona-c01-followup-narrow-desktop.jpg' ? 'Desktop872px evidence; not a mobile-size proof.'
      : 'Actual UI state captured in this audit; see ui-runtime.vi.md for scope and limits.' };
});
fs.writeFileSync(path.join(screenshots, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// Polish report prose only. This does not rewrite paths, identifiers, code or source files.
for (const file of ['REPORT.vi.md', 'ui-runtime.vi.md']) {
  const target = path.join(base, file);
  let text = fs.readFileSync(target, 'utf8');
  text = text.replace(/(?<![A-Za-z0-9])(\d+)(?=implementation|canonical|gatewaypaths|localfunctions|brand sources|feature visuals|runtimefiles|two-turn|bilingual|critical|moderate|high|findings|tests|suites|files|case|deck|guide|nhóm|hạng|lá|bộ|ngày|dữ kiện|dữ|lựa chọn|lựa|clients|accounts|clients|agents|lanes|docs|chunks|help|legal|PASS|FAIL|WARN|dòng|px|MiB|giây|phút|giờ)/g, '$1 ');
  const replacements = {
    'gatewaypaths': 'gateway paths', 'localfunctions': 'local functions', 'runtimefiles': 'runtime files',
    'control48px': 'control 48 px', 'controls48px': 'controls 48 px',
    'App.tsx16.458': 'App.tsx 16.458', 'Runtime684': 'Runtime 684', 'power5of5': 'power 5/5',
    'thiếupurpose': 'thiếu purpose', 'giữfactIDs': 'giữ factIDs', 'p95budgets': 'p95 budgets',
    'schema/types': 'schema/types', 'tar7.5.16': 'tar 7.5.16', 'giải nénDoS': 'giải nén DoS',
    'môi trườngEPERM': 'môi trường EPERM', '15s': '15 s', 'PASS0.1.3': 'PASS 0.1.3',
    'Synthetic chart': 'Chart giả lập', 'exact backend model': 'model backend chính xác',
    'natural experience': 'trải nghiệm hội thoại tự nhiên', 'identical history': 'lịch sử đồng nhất',
    'phoneoutside': 'điện thoại ở ngoài phòng', 'current client': 'client hiện tại'
  };
  for (const [from, to] of Object.entries(replacements)) text = text.replaceAll(from, to);
  fs.writeFileSync(target, text);
}

const pair = readJson('ai-c01-paired-observation.json');
assert.equal(pair.observedUserTurnsPerConversation, 2);
assert.equal(pair.benchmark.suiteCompleted, false);
assert.equal(pair.benchmark.winRate, null);
assert.equal(pair.nilaza.actualModel, null);
assert.equal(pair.chatgpt.exactBackendModel, null);
const candidate = readJson('ai-admin-quality-candidate.json');
assert.equal(candidate.status, 'configured_admin_browser_draft_not_published_not_provider_tested');
const editor = readJson('astrology-prior-admin-editor-pair.json');
const prior = readJson('astrology-prior-active-pair.json');
for (const locale of ['vi', 'en']) {
  const row = prior.prompts.find(item => item.locale === locale);
  assert.equal(row.prompt_text, editor[locale], 'Prior editor/backend texts must match');
  assert.equal(row.version, candidate.publisherRequestTemplate[locale === 'vi' ? 'expectedViVersion' : 'expectedEnVersion']);
  assert(candidate.publisherRequestTemplate[locale].length >= candidate.promptLengthBounds.minimum);
  assert(candidate.publisherRequestTemplate[locale].length <= candidate.promptLengthBounds.maximum);
}
const suite = readJson('ai-synthetic-eval-suite.json');
assert.equal(suite.status, 'main_suite_prepared_not_run_one_observational_variant_pair_captured');

let parsedJsonCount = 0;
let localLinksChecked = 0;
for (const file of fs.readdirSync(base)) {
  if (file.endsWith('.json')) { readJson(file); parsedJsonCount++; }
  if (!file.endsWith('.md')) continue;
  const text = fs.readFileSync(path.join(base, file), 'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].replace(/^<|>$/g, '').replace(/:\d+$/, '');
    if (/^(https?:|app:|codex:|#)/.test(link)) continue;
    const target = path.isAbsolute(link) ? link : path.resolve(base, link);
    assert(fs.existsSync(target), `Missing local link: ${file} -> ${link}`);
    localLinksChecked++;
  }
}
for (const file of ['chatgpt-runtime-c01-controlled.txt', 'chatgpt-runtime-c01-followup.txt']) {
  const text = fs.readFileSync(path.join(base, file), 'utf8');
  assert(!/Chat history|Search chats|Conversation history|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text), 'Controlled answer capture must exclude sidebar/account text');
}
const validation = { date: '2026-09-30', kind: 'review_artifact_integrity_only_not_product_tests',
  jsonParse: { status: 'PASS', files: parsedJsonCount },
  localLinks: { status: 'PASS', checked: localLinksChecked },
  screenshotManifest: { status: 'PASS', jpegFiles: manifest.length },
  candidatePriorVersionsAndText: 'PASS', twoTurnPairMissingMetricsRemainNull: 'PASS',
  candidateLivePublish: 'NOT_PERFORMED', candidateProviderRetest: 'BLOCKED',
  deepSecurityScan: 'FAILED_BEFORE_DISCOVERY', nativeDeviceAndPerformance: 'UNVERIFIED' };
fs.writeFileSync(path.join(base, 'artifact-validation.json'), JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify(validation));
