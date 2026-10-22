import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  ROOTS, TARGET, digest, excluded, inventory, materialize, safePath, verifyInventory,
} from './nilaza-release-candidate.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
const options = { roots: ['src', 'policy.json', '.gitignore'], policy: ['policy.json'] };
const cacheParent = '.cache/release-preparation-2026-10-18';
const destination = `${cacheParent}/candidate`;
const gitEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: '1' };
const fixtureEnv = root => ({ ...gitEnv, GIT_CONFIG_GLOBAL: path.join(root, 'synthetic-global.gitconfig') });

function git(root, args, extra = {}) {
  return execFileSync('git', ['--no-optional-locks', ...args], {
    cwd: root, env: fixtureEnv(root), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...extra,
  }).trim();
}

function put(root, relative, text) {
  const full = path.join(root, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}

function commit(root, message = 'Synthetic source') {
  git(root, ['add', '--', '.']);
  git(root, [
    '-c', 'user.name=Nilaza synthetic test', '-c', 'user.email=synthetic@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${path.join(root, '.git', 'no-hooks')}`,
    'commit', '--quiet', '--allow-empty', '-m', message,
  ]);
}

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nilaza-candidate-test-'));
  try {
    put(root, 'synthetic-global.gitconfig', '');
    git(root, ['init', '--quiet', '--template=']);
    put(root, '.gitignore', '.cache/\n');
    put(root, 'src/main.ts', 'export const label = "Khoảng mở";\n');
    put(root, 'src/nested/empty.json', '{}\n');
    put(root, 'policy.json', '{"schemaVersion":1,"scope":"synthetic-only"}\n');
    commit(root);
    fs.mkdirSync(path.join(root, cacheParent), { recursive: true });
    return run(root);
  } finally {
    // root comes directly from mkdtemp; never accept a caller-supplied deletion path.
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const mustReject = (operation, pattern = /INVENTORY|DRIFT|CONTRACT|UNSAFE|REPARSE|OUTSIDE|TAMPER/) => {
  assert.throws(operation, pattern);
};

test('inventory binds sorted exact paths, UTF-8 bytes, hashes, policy and Git source', () => fixture(root => {
  const record = inventory(root, options);
  const expectedPaths = ['.gitignore', 'policy.json', 'src/main.ts', 'src/nested/empty.json'];
  assert.deepEqual(record.files.map(file => file.path), expectedPaths);
  for (const file of record.files) {
    const bytes = fs.readFileSync(path.join(root, file.path));
    assert.deepEqual(file, { path: file.path, sha256: digest(bytes), bytes: bytes.length });
  }
  assert.equal(record.inputDigestSha256, digest(JSON.stringify(record.files)));
  assert.equal(record.source.commit, git(root, ['rev-parse', 'HEAD']));
  assert.equal(record.source.trackedDirty, false);
  assert.deepEqual(record.target, TARGET);
  assert.equal(record.releaseAuthorized, false);
  assert.equal(record.cloudMutation, false);
  assert.equal(record.status, 'PREPARATION_ONLY');
  assert.deepEqual(verifyInventory(root, record, options), record);
}));

test('default candidate roots preserve Android Gradle, ProGuard, wrapper and seed source without local credentials', () => fixture(root => {
  for (const requiredRoot of [
    'apps/mobile/src', 'apps/mobile/assets', 'apps/mobile/android', 'apps/mobile/index.js',
    'apps/mobile/metro.config.js', 'apps/mobile/babel.config.js', 'apps/mobile/eas.json',
    'apps/mobile/.easignore', 'packages', 'supabase/migrations', 'supabase/config.toml',
    'supabase/seed.sql', 'supabase/seed.generated.sql', 'package-lock.json', 'deno.lock', 'tsconfig.json',
  ]) assert.ok(ROOTS.includes(requiredRoot), `Missing build/replay source root: ${requiredRoot}`);
  const kept = [
    ['apps/mobile/android/build.gradle', '// Synthetic public Gradle source\n'],
    ['apps/mobile/android/app/build.gradle', '// Synthetic public app build source\n'],
    ['apps/mobile/android/app/proguard-rules.pro', '-keep class synthetic.example.** { *; }\n'],
    ['apps/mobile/android/gradle/wrapper/gradle-wrapper.jar', Buffer.from('PUBLIC SYNTHETIC JAR BYTES')],
    ['apps/mobile/android/gradle/wrapper/gradle-wrapper.properties', 'distributionUrl=synthetic-invalid\n'],
    ['apps/mobile/android/gradlew', '#!/bin/sh\n# Public synthetic wrapper\n'],
    ['apps/mobile/android/gradlew.bat', '@rem Public synthetic wrapper\r\n'],
    ['supabase/seed.sql', '-- Public synthetic seed entrypoint\n'],
    ['supabase/seed.generated.sql', '-- Public synthetic generated seed payload\n'],
  ];
  for (const [relative, bytes] of kept) put(root, relative, bytes);
  const denied = ['apps/mobile/android/app/debug.keystore', 'apps/mobile/android/local.properties'];
  for (const relative of denied) put(root, relative, 'PUBLIC SYNTHETIC DENIED CANARY\n');
  const record = inventory(root, { policy: options.policy });
  for (const [relative, bytes] of kept) {
    const entry = record.files.find(file => file.path === relative);
    assert.deepEqual(entry, { path: relative, sha256: digest(bytes), bytes: Buffer.byteLength(bytes) });
  }
  for (const relative of denied) assert.equal(record.files.some(file => file.path === relative), false);
}));

test('frontend HTML, CSS and Astro entrypoints survive exact candidate materialization', () => fixture(root => {
  const kept = [
    ['apps/admin/index.html', '<!doctype html><main>Public synthetic Admin</main>\n'],
    ['apps/admin/content.html', '<!doctype html><main>Public synthetic content workspace</main>\n'],
    ['apps/admin/ai-studio.html', '<!doctype html><main>Public synthetic AI workspace</main>\n'],
    ['apps/admin/shell.css', 'body { color: #151416; }\n'],
    ['apps/web/src/pages/index.astro', '---\nconst title = "Public synthetic website";\n---\n<h1>{title}</h1>\n'],
    ['apps/web/src/pages/[locale]/index.astro', '<main>Public synthetic localized website</main>\n'],
    ['apps/web/src/styles/global.css', 'main { max-width: 70rem; }\n'],
  ];
  for (const [relative, bytes] of kept) put(root, relative, bytes);
  const fixtureOptions = { roots: ['apps/admin', 'apps/web/src', ...options.roots], policy: options.policy };
  const record = inventory(root, fixtureOptions);
  const receipt = materialize(root, record, destination, fixtureOptions);
  assert.equal(receipt.status, 'ALLOWLISTED_COPY_VERIFIED');
  for (const [relative, bytes] of kept) {
    const entry = record.files.find(file => file.path === relative);
    assert.deepEqual(entry, { path: relative, sha256: digest(bytes), bytes: Buffer.byteLength(bytes) });
    assert.equal(fs.readFileSync(path.join(root, destination, relative), 'utf8'), bytes);
  }
}));

test('default source selector preserves less-common runtime, deployment and validation file types', () => fixture(root => {
  const kept = [
    ['packages/astrology-core/calculator.d.mts', 'export declare function calculate(): void;\n'],
    ['packages/astrology-core/fixtures/tai-utc.dat', 'PUBLIC SYNTHETIC TIMING FIXTURE\n'],
    ['packages/content/generated/public-help-corpus/corpus.jsonl', '{"publicSynthetic":true}\n'],
    ['apps/admin/.vercelignore', '.env*\n'],
    ['apps/web/public/.assetsignore', '.private/\n'],
    ['apps/web/public/_headers', '/*\n  X-Content-Type-Options: nosniff\n'],
    ['packages/growth-core/repository-template/CODEOWNERS', '# Public synthetic ownership template\n'],
  ];
  for (const [relative, bytes] of kept) put(root, relative, bytes);
  const record = inventory(root, { policy: options.policy });
  for (const [relative, bytes] of kept) {
    assert.deepEqual(record.files.find(file => file.path === relative), {
      path: relative, sha256: digest(bytes), bytes: Buffer.byteLength(bytes),
    });
  }
}));

test('real Admin and Web scoped inventory includes current frontend and deployment entrypoints', () => {
  const record = inventory(repository, { roots: ['apps/admin', 'apps/web/src', 'apps/web/public'] });
  for (const relative of [
    'apps/admin/index.html', 'apps/admin/content.html', 'apps/admin/ai-studio.html', 'apps/admin/shell.css',
    'apps/admin/.vercelignore', 'apps/web/src/pages/index.astro',
    'apps/web/src/pages/[locale]/index.astro', 'apps/web/src/styles/global.css',
    'apps/web/public/_headers', 'apps/web/public/.assetsignore',
  ]) assert.ok(record.files.some(file => file.path === relative), `Missing current frontend/deployment source: ${relative}`);
  assert.equal(record.files.some(file => file.path.split('/').some(part => part.startsWith('.env'))), false);
});

test('unreviewed runtime extensions and unapproved data paths fail closed with path-only errors', () => fixture(root => {
  for (const relative of ['src/new-styles.scss', 'src/unreviewed-data.dat', 'src/unreviewed-events.jsonl']) {
    put(root, relative, 'PUBLIC SYNTHETIC DATA\n');
    assert.throws(() => inventory(root, options), error => {
      assert.equal(error.message, `UNREVIEWED_FILE_TYPE:${relative}`);
      return true;
    });
    fs.unlinkSync(path.join(root, relative));
  }
}));

test('known review and Python cache files are excluded before unsupported-type evaluation', () => fixture(root => {
  const cachePaths = ['src/web-qa-vite-cache/deps/runtime.js.map', 'scripts/__pycache__/render.cpython-312.pyc'];
  for (const relative of cachePaths) put(root, relative, 'PUBLIC SYNTHETIC CACHE\n');
  const record = inventory(root, { roots: [...options.roots, 'scripts'], policy: options.policy });
  assert.equal(record.files.length, 4);
  for (const relative of cachePaths) {
    assert.equal(excluded(relative), true);
    assert.equal(record.files.some(file => file.path === relative), false);
  }
}));

test('tracked unsafe environment, key, session and build files are excluded before any content read', () => fixture(root => {
  const unsafe = [
    'src/.env.local', 'src/credentials.json', 'src/signing.jks', 'src/private.pem',
    'src/.codex-browser/Default/session.json', 'src/.ci-native/metadata.json',
    'src/.gradle-codex/cache.json', 'src/node_modules/dependency/index.js',
    'src/build/manifest.json', 'src/local.properties',
  ];
  for (const relative of unsafe) put(root, relative, 'PUBLIC SYNTHETIC CANARY — never read\n');
  commit(root, 'Track synthetic unsafe paths to prove index trust is insufficient');
  const originalRead = fs.readFileSync;
  const forbidden = new Set(unsafe.map(relative => path.resolve(root, relative)));
  fs.readFileSync = function (filename, ...args) {
    if (typeof filename === 'string' && forbidden.has(path.resolve(filename))) {
      throw new Error('FORBIDDEN_SYNTHETIC_FILE_READ');
    }
    return originalRead.call(this, filename, ...args);
  };
  try {
    const record = inventory(root, { ...options, roots: [...options.roots, ...unsafe] });
    assert.ok(unsafe.every(relative => !record.files.some(file => file.path === relative)));
    assert.equal(record.files.length, 4);
  } finally {
    fs.readFileSync = originalRead;
  }
}));

for (const [name, change] of [
  ['new untracked input', root => put(root, 'src/new.ts', 'export const added = true;\n')],
  ['removed input', root => fs.unlinkSync(path.join(root, 'src/main.ts'))],
  ['changed bytes', root => put(root, 'src/main.ts', 'export const changed = true;\n')],
  ['policy changes', root => put(root, 'policy.json', '{"schemaVersion":2}\n')],
  ['HEAD changes even with the same file bytes', root => commit(root, 'A new source identity')],
]) {
  test(`verification rejects ${name}`, () => fixture(root => {
    const record = inventory(root, options);
    change(root);
    mustReject(() => verifyInventory(root, record, options), /SOURCE_DRIFT/);
  }));
}

test('an excluded file addition does not expand the reviewed candidate scope', () => fixture(root => {
  const record = inventory(root, options);
  put(root, 'src/.env.local', 'PUBLIC SYNTHETIC CANARY\n');
  const current = verifyInventory(root, record, options);
  assert.deepEqual(current.files, record.files);
}));

test('materialize produces an exact independent copy, preserves source Git and refuses overwrite', () => fixture(root => {
  const record = inventory(root, options);
  const originalHead = git(root, ['rev-parse', 'HEAD']);
  const receipt = materialize(root, record, destination, options);
  assert.equal(receipt.status, 'ALLOWLISTED_COPY_VERIFIED');
  assert.equal(receipt.files, record.files.length);
  assert.equal(receipt.bytes, record.files.reduce((sum, file) => sum + file.bytes, 0));
  assert.equal(receipt.inputDigestSha256, record.inputDigestSha256);
  assert.equal(receipt.releaseAuthorized, false);
  for (const file of record.files) {
    const copy = path.join(root, destination, file.path);
    assert.equal(digest(fs.readFileSync(copy)), file.sha256);
    assert.equal(fs.statSync(copy).size, file.bytes);
  }
  assert.equal(fs.existsSync(path.join(root, destination, '.git')), false);
  assert.equal(git(root, ['rev-parse', 'HEAD']), originalHead);
  assert.equal(git(root, ['status', '--porcelain=v1', '--untracked-files=no']), '');
  assert.throws(() => materialize(root, record, destination, options), /EEXIST/);
}));

for (const badDestination of ['candidate', '.cache/another/candidate', `${cacheParent}/../escape`, `${cacheParent}/candidate/../../escape`]) {
  test(`materialize rejects out-of-scope or traversing destination ${badDestination}`, () => fixture(root => {
    mustReject(() => materialize(root, inventory(root, options), badDestination, options), /DESTINATION_SCOPE|UNSAFE_PATH/);
  }));
}

test('source change after inventory blocks copy before destination creation', () => fixture(root => {
  const record = inventory(root, options);
  put(root, 'src/main.ts', 'export const stale = true;\n');
  mustReject(() => materialize(root, record, destination, options), /SOURCE_DRIFT/);
  assert.equal(fs.existsSync(path.join(root, destination)), false);
}));

test('source drift during copy is detected and never returns a verified receipt', () => fixture(root => {
  const record = inventory(root, options);
  const originalRead = fs.readFileSync;
  let sourceReads = 0;
  fs.readFileSync = function (filename, ...args) {
    if (filename === path.join(root, 'src/main.ts')) {
      sourceReads += 1;
      if (sourceReads === 2) put(root, 'src/main.ts', 'export const race = true;\n');
    }
    return originalRead.call(this, filename, ...args);
  };
  try {
    mustReject(() => materialize(root, record, destination, options), /SOURCE_DRIFT/);
  } finally {
    fs.readFileSync = originalRead;
  }
}));

for (const badPath of ['', '.', '..', '../outside', 'src/../main.ts', '/absolute', 'C:/outside', 'src\\main.ts', 'src//main.ts']) {
  test(`safePath rejects malformed path ${JSON.stringify(badPath)}`, () => fixture(root => {
    mustReject(() => safePath(root, badPath, { missing: true }), /UNSAFE_PATH/);
  }));
}

test('safePath rejects ASCII newline, NUL and other control characters before filesystem use', () => fixture(root => {
  for (const relative of ['src/new\nline.ts', 'src/null\0byte.ts', 'src/tab\tname.ts', 'src/delete\x7fname.ts']) {
    mustReject(() => safePath(root, relative, { missing: true }), /UNSAFE_PATH/);
  }
}));

test('directory symlinks/junctions in source and destination are rejected', t => fixture(root => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'nilaza-candidate-target-'));
  try {
    put(outside, 'canary.ts', 'export const synthetic = true;\n');
    try {
      fs.symlinkSync(outside, path.join(root, 'src', 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'ENOTSUP') {
        t.skip('This OS does not permit synthetic test links');
        return;
      }
      throw error;
    }
    mustReject(() => inventory(root, options), /REPARSE_PATH|PATH_OUTSIDE_ROOT/);
    fs.unlinkSync(path.join(root, 'src', 'linked'));
    fs.symlinkSync(outside, path.join(root, cacheParent, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    const record = inventory(root, options);
    mustReject(() => materialize(root, record, `${cacheParent}/linked/candidate`, options), /REPARSE_PATH|PATH_OUTSIDE_ROOT/);
    assert.equal(fs.existsSync(path.join(outside, 'candidate')), false);
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
  }
}));

for (const [name, alter] of [
  ['target project', record => { record.target = { ...record.target, projectRef: 'synthetic-other-project' }; }],
  ['release authority', record => { record.releaseAuthorized = true; }],
  ['cloud mutation authority', record => { record.cloudMutation = true; }],
  ['schema version', record => { record.schemaVersion = 2; }],
  ['missing-root scope', record => { record.missingRoots.push('synthetic-missing'); }],
  ['inventory digest', record => { record.inputDigestSha256 = '0'.repeat(64); }],
  ['file digest', record => { record.files[0].sha256 = '0'.repeat(64); }],
  ['file byte count', record => { record.files[0].bytes += 1; }],
  ['file removal', record => { record.files.pop(); }],
  ['duplicate file entry', record => { record.files.push({ ...record.files[0] }); }],
]) {
  test(`verification rejects tampered ${name}`, () => fixture(root => {
    const record = structuredClone(inventory(root, options));
    alter(record);
    mustReject(() => verifyInventory(root, record, options));
  }));
}

test('a forged excluded file entry cannot smuggle data into the candidate', () => fixture(root => {
  const record = structuredClone(inventory(root, options));
  const relative = 'src/.env.local';
  const canary = Buffer.from('PUBLIC SYNTHETIC CANARY — not a credential\n');
  put(root, relative, canary);
  record.files.push({ path: relative, sha256: digest(canary), bytes: canary.length });
  mustReject(() => materialize(root, record, destination, options));
  assert.equal(fs.existsSync(path.join(root, destination)), false);
}));

test('secret-like source text is rejected with a sanitized path-only message', () => fixture(root => {
  const publicCanary = `sk-proj-${'SYNTHETICCANARY'.repeat(4)}`;
  put(root, 'src/suspicious.ts', `export const fixture = '${publicCanary}';\n`);
  assert.throws(() => inventory(root, options), error => {
    assert.equal(error.message, 'SUSPECT_SECRET_IN_SOURCE:src/suspicious.ts');
    assert.equal(error.message.includes(publicCanary), false);
    return true;
  });
}));

for (const extension of ['html', 'css', 'astro']) {
  test(`secret-like inline ${extension} source is rejected with a path-only message`, () => fixture(root => {
    const relative = `src/public-synthetic.${extension}`;
    const canary = `sk-proj-${'SYNTHETICCANARY'.repeat(4)}`;
    put(root, relative, `<!-- PUBLIC SYNTHETIC CANARY -->\n${canary}\n`);
    assert.throws(() => inventory(root, options), error => {
      assert.equal(error.message, `SUSPECT_SECRET_IN_SOURCE:${relative}`);
      assert.equal(error.message.includes(canary), false);
      return true;
    });
  }));
}

const publicFixturePath = 'scripts/nilaza-backend-key-backup.test.mjs';
const publicFixtureSha256 = '8f25531e6cbf47501b0688279f113240a9084282d93e1951dd4406cdfc573e9f';
function reviewedPublicFixture() {
  const bytes = fs.readFileSync(path.join(repository, publicFixturePath));
  assert.equal(digest(bytes), publicFixtureSha256, 'Public synthetic fixture changed; explicit review is required');
  return bytes;
}

test('reviewed public credential-shaped fixture exception binds the exact path and bytes', () => fixture(root => {
  const bytes = reviewedPublicFixture();
  put(root, publicFixturePath, bytes);
  const fixtureOptions = { roots: ['scripts', ...options.roots], policy: options.policy };
  const record = inventory(root, fixtureOptions);
  assert.ok(record.files.some(file => file.path === publicFixturePath && file.sha256 === publicFixtureSha256));
  put(root, publicFixturePath, Buffer.concat([bytes, Buffer.from('\n')]));
  assert.throws(() => inventory(root, fixtureOptions), error => {
    assert.equal(error.message, `SUSPECT_SECRET_IN_SOURCE:${publicFixturePath}`);
    return true;
  });
}));

test('the same public fixture bytes at another test path receive no exception', () => fixture(root => {
  const otherPath = 'scripts/another-credential-fixture.test.mjs';
  put(root, otherPath, reviewedPublicFixture());
  assert.throws(() => inventory(root, { roots: ['scripts'], policy: options.policy }), error => {
    assert.equal(error.message, `SUSPECT_SECRET_IN_SOURCE:${otherPath}`);
    return true;
  });
}));

for (const [scope, ruleFile, prefix, extraIgnored] of [
  ['monorepo', '.easignore', 'apps/mobile/', ['tmp/private.json', 'design/launch/preview.json', 'artifacts/evidence.json']],
  ['mobile app', 'apps/mobile/.easignore', '', []],
]) {
  test(`${scope} EAS rules exclude private/build state and retain public runtime inputs under Git ignore semantics`, () => fixture(root => {
    put(root, '.gitignore', fs.readFileSync(path.join(repository, ruleFile), 'utf8'));
    const denied = [
      ...extraIgnored, `${prefix}.env.local`, `${prefix}.ci-native/metadata.json`,
      `${prefix}.codex-js-export/index.js`, '.codex-browser/Default/session.json',
      '.gradle-codex/caches/state.json', `${prefix}android/app/upload.jks`,
      `${prefix}android/local.properties`, `${prefix}credentials.json`,
    ];
    const allowed = [
      `${prefix}assets/runtime/tarot/tinh-quang/cards/major-00-fool.jpg`,
      `${prefix}src/features/feedback/FeedbackPanel.tsx`, `${prefix}android/app/debug.keystore`,
    ];
    const check = spawnSync('git', ['check-ignore', '--no-index', '--stdin'], {
      cwd: root, env: fixtureEnv(root), input: `${[...denied, ...allowed].join('\n')}\n`, encoding: 'utf8',
    });
    assert.ok(check.status === 0 || check.status === 1, check.stderr);
    const ignored = new Set(check.stdout.trim().split(/\r?\n/).filter(Boolean));
    for (const relative of denied) assert.ok(ignored.has(relative), `Archive hazard not ignored: ${relative}`);
    for (const relative of allowed) assert.equal(ignored.has(relative), false, `Runtime input unexpectedly ignored: ${relative}`);
    for (const relative of denied.filter(relative => !extraIgnored.includes(relative))) assert.ok(excluded(relative), `Candidate hazard not excluded: ${relative}`);
    assert.equal(excluded('apps/mobile/assets/runtime/tarot/tinh-quang/cards/major-00-fool.jpg'), false);
  }));
}
