import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'design/launch/open-reflection-v1');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifestPath = path.join(base, 'manifest.json');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? (e.name === 'archive' ? [] : files(path.join(dir, e.name))) : [path.join(dir, e.name)]);
}
for (const locale of ['vi', 'en']) {
  const guide = JSON.parse(fs.readFileSync(path.join(base, `source/guides-${locale}.json`)));
  if (guide.locale !== locale || guide.brandVersion !== '1.0.0') throw Error('Guide version/locale mismatch');
  for (const article of guide.articles) {
    if (!new RegExp(`^apps/web/src/content/help/${locale}/[a-z-]+\\.md$`).test(article.source)) throw Error(`Non-public guide source: ${article.source}`);
    if (hash(path.join(root, article.source)) !== article.sha256) throw Error(`Stale Help snapshot: ${article.source}`);
  }
}
const renders = JSON.parse(fs.readFileSync(path.join(base, 'review/documents/render-results.json')));
if (renders.length !== 7) throw Error('Expected seven final PDF render records');
for (const r of renders) {
  if (hash(path.join(base, r.file)) !== r.sha256) throw Error(`PDF changed after render: ${r.file}`);
  if (r.file.includes('quick-start') && r.pages !== 2) throw Error('Quick guide must be two pages');
  if (r.file.includes('introduction') && r.pages !== 8) throw Error('Deck must be eight pages');
}
const deliverables = files(path.join(base, 'exports')).map(file => ({
  path: path.relative(base, file).replaceAll('\\', '/'), sha256: hash(file), bytes: fs.statSync(file).size,
  locale: /(?:-|\/)(vi|en)(?:-|\.)/.exec(file)?.[1] ?? 'shared'
})).sort((a, b) => a.path.localeCompare(b.path));
const sources = [...files(path.join(base, 'source')), ...['build-launch-documents.py', 'build-launch-pdfs.py', 'build-launch-slides.mjs', 'build-launch-graphics.mjs', 'build-launch-preview.mjs', 'export-launch-office.py'].map(f => path.join(root, 'scripts', f))]
  .map(file => ({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(file) })).sort((a,b) => a.path.localeCompare(b.path));
const manifest = {
  schemaVersion: 1, brandVersion: '1.0.0', status: 'prepared-not-released',
  appReference: '0.1.0 Open Reflection working tree; browser evidence 2026-09-11 through 2026-09-13; native RC pending',
  screenshotEvidence: 'Local web preview and test-account data; not native store screenshots',
  releaseGates: ['Native iOS/Android RC and real phone/tablet store captures', 'Protected Admin workspace and configured waitlist integration verification', 'Manager acceptance and separate official publication approval'],
  sources, deliverables
};
if (process.argv.includes('--write')) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
else if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, 'utf8') !== JSON.stringify(manifest, null, 2) + '\n') throw Error('Launch manifest drift: review changes then run node scripts/validate-launch.mjs --write');
console.log(`Launch package checked: ${deliverables.length} exports, ${sources.length} editable sources; prepared, not released.`);
