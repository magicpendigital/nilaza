import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { extractCandidates, isNilazaCwd, normalizeHistoryPath, recoverFromHistory } from './nilaza-backend-key-history.mjs';
import {
  refs, selectLocal, validateApiKeys, compareDigest, recoverEdgeSecret, publicCoverage, validateBundle,
} from './nilaza-backend-key-backup.mjs';

// All values in this file are public fixtures, never usable credentials.
const recipient = 'age1rekcyasv7rgg8k77wfuf0een6re6yy32exuzsw6qsxqhudawlycsxrhd74';
const singapore = 'etfajmrwyywokgafzxsb';
const legacyQa = 'akgrokwnkfqnfjqrildi';
const fakeProvider = 'PUBLIC-FAKE-OPENROUTER-KEY-DO-NOT-USE';
const fakePublishable = 'sb_publishable_' + 'A'.repeat(40);
const fakeSecret = 'sb_secret_' + 'B'.repeat(40);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const segment = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (ref, role, changes = {}) => [
  segment({ alg: 'HS256', typ: 'JWT' }),
  segment({ iss: 'supabase', ref, role, iat: 1700000000, exp: 4000000000, ...changes }),
  Buffer.alloc(32, 17).toString('base64url'),
].join('.');
const source = () => ({
  id: 'local-mobile', projectRef: legacyQa, kind: 'local-env',
  entries: [{ name: 'OPENROUTER_API_KEY', value: fakeProvider }],
});
const bundle = () => ({
  schemaVersion: 1, kind: 'nilaza-backend-api-backup', recipient,
  nonce: '1ac83400-cae7-4a6f-89fd-39740db21b27', sources: [source()],
});

test('local selection allows known credentials and excludes sessions and unknown variables', () => {
  assert.deepEqual(refs, [singapore, legacyQa]);
  const selected = selectLocal({
    OPENROUTER_API_KEY: fakeProvider,
    VERCEL_OIDC_TOKEN: 'PUBLIC-FAKE-OIDC-TOKEN',
    SUPABASE_ACCESS_TOKEN: 'PUBLIC-FAKE-ACCOUNT-TOKEN',
    ACCESS_TOKEN: 'PUBLIC-FAKE-ACCESS-TOKEN',
    USER_ACCESS_TOKEN: 'PUBLIC-FAKE-USER-TOKEN',
    SUPABASE_REFRESH_TOKEN: 'PUBLIC-FAKE-REFRESH-TOKEN',
    UNRELATED_PROJECT_API_KEY: 'PUBLIC-FAKE-UNRELATED-KEY',
  });
  assert.deepEqual(selected.entries, [{ name: 'OPENROUTER_API_KEY', value: fakeProvider }]);
  assert.equal(selected.excludedCount, 6);
  assert.deepEqual(selectLocal({}).entries, []);
});

test('legacy API keys are tied to exact project and matching role', () => {
  const anon = jwt(singapore, 'anon');
  const service = jwt(singapore, 'service_role');
  assert.deepEqual(validateApiKeys([
    { name: 'anon', api_key: anon },
    { name: 'service_role', api_key: service },
  ], singapore), [
    { name: 'SUPABASE_ANON_KEY', value: anon },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: service },
  ]);
  assert.throws(() => validateApiKeys([{ name: 'anon', api_key: jwt(legacyQa, 'anon') }], singapore));
  assert.throws(() => validateApiKeys([{ name: 'anon', api_key: service }], singapore));
  assert.throws(() => validateApiKeys([{ name: 'service_role', api_key: anon }], singapore));
  assert.throws(() => validateApiKeys([{ name: 'anon', api_key: jwt(singapore, 'anon', { ref: undefined }) }], singapore));
  assert.throws(() => validateApiKeys([{ name: 'anon', api_key: anon }], 'unapproved-project-ref'));
});

test('modern API key types normalize correctly and disabled entries are excluded', () => {
  assert.deepEqual(validateApiKeys([
    { type: 'publishable', api_key: fakePublishable },
    { type: 'secret', api_key: fakeSecret },
    { type: 'secret', api_key: 'PUBLIC-FAKE-DISABLED-KEY', disabled: true },
  ], singapore), [
    { name: 'SUPABASE_PUBLISHABLE_KEY', value: fakePublishable },
    { name: 'SUPABASE_SECRET_KEY', value: fakeSecret },
  ]);
  assert.throws(() => validateApiKeys([{ name: 'anon', api_key: 'masked', disabled: true }], legacyQa));
  assert.throws(() => validateApiKeys([{ type: 'publishable', api_key: fakeSecret }], singapore));
  assert.throws(() => validateApiKeys([{ type: 'secret', api_key: fakePublishable }], singapore));
  assert.throws(() => validateApiKeys([{ type: 'unknown', api_key: fakeSecret }], singapore));
  assert.throws(() => validateApiKeys([{ type: 'secret', api_key: 'sb_secret_************' }], singapore));
  assert.throws(() => validateApiKeys([{ type: 'publishable', api_key: 'sb_publishable_short' }], singapore));
  assert.throws(() => validateApiKeys([{ type: 'secret', api_key: 'sb_secret_' + 'A'.repeat(16384) }], singapore));
});

test('malformed, masked and oversized API key responses fail closed', () => {
  for (const api_key of ['', '********', 'eyJ...masked', 'sb_secret_********', 'x'.repeat(1024 * 1024 + 1)]) {
    assert.throws(() => validateApiKeys([{ name: 'service_role', api_key }], singapore));
  }
  for (const rows of [null, {}, 'PUBLIC-FAKE-RESPONSE', [{ name: 'anon' }]]) {
    assert.throws(() => validateApiKeys(rows, singapore));
  }
});

test('a cloud digest is only a match for the same local fixture bytes', () => {
  const digest = sha256(fakeProvider);
  assert.equal(compareDigest(digest, fakeProvider), true);
  assert.equal(compareDigest(digest, fakeProvider + '-OTHER'), false);
  assert.equal(compareDigest(fakeProvider, fakeProvider), false);
  assert.equal(compareDigest('f'.repeat(64), fakeProvider), false);
  assert.equal(compareDigest('g'.repeat(64), fakeProvider), false);
  assert.equal(compareDigest(digest.slice(0, 63), fakeProvider), false);
  assert.equal(typeof compareDigest(digest, fakeProvider), 'boolean');
});

test('an Edge digest is never backed up as an exported secret value', () => {
  const candidates = [{ name: 'OPENROUTER_API_KEY', value: fakeProvider }];
  for (const digest of ['PUBLIC-FAKE-DIGEST-NOT-A-SECRET', 'g'.repeat(64), '', null, 17]) {
    assert.deepEqual(recoverEdgeSecret({ name: 'OPENROUTER_API_KEY', digest, value: fakeProvider }, candidates), {
      entry: null, status: 'UNSUPPORTED_DIGEST_ORIGINAL_REQUIRED',
    });
  }
  const unmatchedDigest = sha256(fakeProvider + '-OTHER');
  assert.deepEqual(recoverEdgeSecret({ name: 'OPENROUTER_API_KEY', digest: unmatchedDigest }, candidates), {
    entry: null, status: 'DIGEST_ONLY_ORIGINAL_REQUIRED',
  });
  // The CLI can return a digest under "value"; do not mistake it for usable key bytes.
  assert.deepEqual(recoverEdgeSecret({ name: 'OPENROUTER_API_KEY', value: unmatchedDigest }, candidates), {
    entry: null, status: 'DIGEST_ONLY_ORIGINAL_REQUIRED',
  });
});

test('an Edge digest recovers only the matching credential name and exact local bytes', () => {
  const entry = { name: 'OPENROUTER_API_KEY', value: fakeProvider };
  const digest = sha256(fakeProvider);
  assert.deepEqual(recoverEdgeSecret({ name: entry.name, digest }, [entry]), {
    entry, status: 'RECOVERED_VALUE_MATCHES_CLOUD_DIGEST',
  });
  assert.deepEqual(recoverEdgeSecret({ name: entry.name, value: digest.toUpperCase() }, [entry]), {
    entry, status: 'RECOVERED_VALUE_MATCHES_CLOUD_DIGEST',
  });
  assert.deepEqual(recoverEdgeSecret({ name: entry.name, digest }, [{ name: 'GEMINI_API_KEY', value: fakeProvider }]), {
    entry: null, status: 'DIGEST_ONLY_ORIGINAL_REQUIRED',
  });
});

test('only an explicit exportable Edge value enters the encrypted package', () => {
  const row = { name: 'OPENROUTER_API_KEY', value: fakeProvider };
  assert.deepEqual(recoverEdgeSecret(row, []), {
    entry: row, status: 'CAPTURED_EXPORTABLE_VALUE',
  });
  assert.throws(() => recoverEdgeSecret({ name: 'VERCEL_OIDC_TOKEN', value: 'PUBLIC-FAKE-OIDC-TOKEN' }, []));
  for (const value of ['', 'x'.repeat(16385), { secret: fakeProvider }]) {
    assert.throws(() => recoverEdgeSecret({ name: row.name, value }, []));
  }
});

test('public coverage projects only allowlisted metadata and credential names', () => {
  const input = [{ ...source(), internalValue: 'PUBLIC-FAKE-INTERNAL', privateMetadata: { token: 'PUBLIC-FAKE-TOKEN' } }];
  const coverage = publicCoverage(input);
  assert.deepEqual(coverage, [{
    id: 'local-mobile', projectRef: legacyQa, kind: 'local-env', names: ['OPENROUTER_API_KEY'],
  }]);
  const printed = JSON.stringify(coverage);
  for (const prohibited of [fakeProvider, 'PUBLIC-FAKE-INTERNAL', 'PUBLIC-FAKE-TOKEN', 'entries', 'value', sha256(fakeProvider)]) {
    assert.ok(!printed.includes(prohibited));
  }
});

test('restored bundle requires approved identity, structure and entry allowlist', () => {
  const good = bundle();
  assert.equal(validateBundle(good), good);
  const unboundLocal = bundle(); unboundLocal.sources[0].projectRef = null;
  assert.equal(validateBundle(unboundLocal), unboundLocal);
  for (const changes of [
    { schemaVersion: 2 }, { kind: 'other-backup' }, { recipient: recipient + '-OTHER' },
    { nonce: 'not-a-uuid' }, { nonce: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz' },
    { sources: null }, { sources: {} },
  ]) {
    assert.throws(() => validateBundle({ ...bundle(), ...changes }));
  }
  const unknownEntry = bundle();
  unknownEntry.sources[0].entries.push({ name: 'VERCEL_OIDC_TOKEN', value: 'PUBLIC-FAKE-OIDC-TOKEN' });
  assert.throws(() => validateBundle(unknownEntry));
  const unrelated = bundle(); unrelated.sources[0].projectRef = 'unapproved-project-ref';
  assert.throws(() => validateBundle(unrelated));
  const malformed = bundle(); malformed.sources[0].entries[0].value = { token: fakeProvider };
  assert.throws(() => validateBundle(malformed));
  const oversized = bundle(); oversized.sources[0].entries[0].value = 'x'.repeat(1024 * 1024 + 1);
  assert.throws(() => validateBundle(oversized));
});

test('bundle source boundaries reject ambiguity, unsafe identifiers and unbound cloud secrets', () => {
  const duplicates = bundle(); duplicates.sources.push(structuredClone(duplicates.sources[0]));
  assert.throws(() => validateBundle(duplicates));
  const excessive = bundle();
  excessive.sources = Array.from({ length: 17 }, (_, index) => ({ ...source(), id: `public-fixture-${index}` }));
  assert.throws(() => validateBundle(excessive));
  for (const id of ['', '../local-mobile', 'a'.repeat(81), 'Upper-Case']) {
    const changed = bundle(); changed.sources[0].id = id;
    assert.throws(() => validateBundle(changed));
  }
  for (const kind of ['project-api', 'edge-secrets']) {
    const changed = bundle(); changed.sources[0].kind = kind; changed.sources[0].projectRef = null;
    assert.throws(() => validateBundle(changed));
  }
  const unknownKind = bundle(); unknownKind.sources[0].kind = 'arbitrary-secret-store';
  assert.throws(() => validateBundle(unknownKind));
});

test('restored project API entries revalidate both legacy binding and modern key encoding', () => {
  const projectBundle = () => ({
    ...bundle(), sources: [{
      id: 'project-singapore-api', projectRef: singapore, kind: 'project-api',
      entries: [
        { name: 'SUPABASE_ANON_KEY', value: jwt(singapore, 'anon') },
        { name: 'SUPABASE_SECRET_KEY', value: fakeSecret },
        { name: 'SUPABASE_PUBLISHABLE_KEY', value: fakePublishable },
      ],
    }],
  });
  assert.doesNotThrow(() => validateBundle(projectBundle()));
  const wrongLegacy = projectBundle(); wrongLegacy.sources[0].entries[0].value = jwt(legacyQa, 'anon');
  assert.throws(() => validateBundle(wrongLegacy));
  const wrongModern = projectBundle(); wrongModern.sources[0].entries[1].value = fakePublishable;
  assert.throws(() => validateBundle(wrongModern));
  const maskedModern = projectBundle(); maskedModern.sources[0].entries[2].value = 'sb_publishable_************';
  assert.throws(() => validateBundle(maskedModern));
});

test('history extraction recognizes public provider, trace, anti-bot and JWT fixtures without duplicates', () => {
  const providerFixtures = [
    'sk-or-v1-' + 'R'.repeat(40),
    'sk-proj-' + 'O'.repeat(40),
    'pk-lf-12345678-1234-1234-1234-123456789012',
    'sk-lf-12345678-1234-1234-1234-123456789012',
    '0x' + 'C'.repeat(40),
    jwt(singapore, 'service_role'),
    fakeSecret,
  ];
  const input = ['PUBLIC FIXTURES ONLY', ...providerFixtures, providerFixtures[0]].join('\n');
  assert.deepEqual(new Set(extractCandidates(input)), new Set(providerFixtures));
  assert.equal(extractCandidates(input).length, providerFixtures.length);
});

test('history extraction preserves quoted DB URLs and exact assignment bytes without evaluation', () => {
  const dbUrl = `postgresql://postgres.${singapore}:PUBLIC-FAKE-DB-PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`;
  const quoted = 'PUBLIC-FAKE-QUOTED-API-VALUE';
  const marker = '__nilaza_history_fixture_executed__';
  assert.equal(globalThis[marker], undefined);
  const input = [
    `DATABASE_URL = '${dbUrl}'`,
    `OPENAI_API_KEY = "${quoted}"; globalThis.${marker} = true;`,
    'VERCEL_OIDC_TOKEN = "PUBLIC-FAKE-EXCLUDED-OIDC"',
    'UNKNOWN_API_KEY = "PUBLIC-FAKE-EXCLUDED-UNKNOWN"',
  ].join('\n');
  assert.deepEqual(new Set(extractCandidates(input)), new Set([dbUrl, quoted]));
  assert.equal(globalThis[marker], undefined);
  assert.deepEqual(extractCandidates('Read C:\\outside\\credentials.json or run $(whoami)'), []);
});

test('history extraction recognizes key fixtures inside escaped JSON text without evaluating it', () => {
  const publicKeyFixture = 'sk-or-v1-' + 'R'.repeat(40);
  const jsonText = JSON.stringify(JSON.stringify({ OPENROUTER_API_KEY: publicKeyFixture }));
  assert.deepEqual(extractCandidates(jsonText), [publicKeyFixture]);
  const publicJwtFixture = jwt(singapore, 'anon');
  const escapedAssignment = JSON.stringify(`SUPABASE_ANON_KEY = "${publicJwtFixture}"`);
  assert.deepEqual(extractCandidates(escapedAssignment), [publicJwtFixture]);
});

test('history extraction rejects oversized input and values by UTF-8 byte bound', () => {
  for (const input of [null, 17, {}, []]) assert.deepEqual(extractCandidates(input), []);
  assert.deepEqual(extractCandidates('sk-proj-' + 'X'.repeat(8388609)), []);
  assert.deepEqual(extractCandidates('sk-proj-' + 'X'.repeat(16385)), []);
  assert.deepEqual(extractCandidates(`OPENAI_API_KEY = "${'é'.repeat(8193)}"`), []);
  const boundaryValue = 'PUBLIC-FAKE-' + 'X'.repeat(16384 - 'PUBLIC-FAKE-'.length);
  assert.deepEqual(extractCandidates(`OPENAI_API_KEY = '${boundaryValue}'`), [boundaryValue]);
});

test('history source scope accepts the exact Nilaza checkout and nested cwd only', () => {
  for (const cwd of [
    'D:\\nilaza', 'd:/NILAZA/', 'D:/nilaza/apps/mobile', 'D:\\nilaza\\scripts\\..\\apps',
    String.raw`\\?\D:\nilaza`, String.raw`\\?\D:\nilaza\apps\mobile`,
  ]) {
    assert.equal(isNilazaCwd(cwd), true);
  }
  for (const cwd of [
    'D:/unrelated/nilaza', 'C:/nilaza', 'D:/nilaza-other', 'D:/nilaza/../other',
    'D:/nilaza/apps/../../other', 'D:\\nilaza\\..\\other', 'D:nilaza',
    '../nilaza', 'file:///D:/nilaza', '\\\\server\\nilaza', '', null, {},
    String.raw`\\?\UNC\server\share\nilaza`, String.raw`\\.\D:\nilaza`,
    String.raw`\\?\C:\nilaza`, String.raw`\\?\D:\nilaza\..\other`,
  ]) {
    assert.equal(isNilazaCwd(cwd), false);
  }
});

test('history paths normalize only approved local session files for the matching task UUID', () => {
  const id = '1ac83400-cae7-4a6f-89fd-39740db21b27';
  const filename = `rollout-2026-06-15T12-30-00-${id}.jsonl`;
  const slash = String.fromCharCode(92);
  const extendedPrefix = slash + slash + '?' + slash;
  const canonical = `C:\\Users\\Admin\\.codex\\sessions\\2026\\06\\15\\${filename}`;
  const archived = `C:\\Users\\Admin\\.codex\\archived_sessions\\${filename}.zst`;
  const row = rollout_path => ({ id, cwd: 'D:/nilaza', rollout_path });
  assert.equal(normalizeHistoryPath(row(canonical)), canonical);
  assert.equal(normalizeHistoryPath(row(extendedPrefix + canonical)), canonical);
  assert.equal(normalizeHistoryPath(row(canonical.replaceAll('\\', '/'))), canonical);
  assert.equal(normalizeHistoryPath(row(archived)), archived);
  assert.equal(normalizeHistoryPath(row(extendedPrefix + archived)), archived);
  for (const rollout_path of [
    `C:\\outside\\${filename}`, `C:\\Users\\Admin\\.codex\\sessions-other\\${filename}`,
    'C:\\Users\\Admin\\.codex\\auth.json', 'C:\\Users\\Admin\\.codex\\sessions\\auth.json',
    `C:\\Users\\Admin\\.codex\\sessions\\..\\${filename}`, canonical + '.tmp', canonical + '.zst.zst',
    String.raw`\\server\share\sessions` + slash + filename,
    String.raw`\\?\UNC\server\share\sessions` + slash + filename,
    slash + slash + '.' + slash + canonical, `D:\\nilaza\\${filename}`,
  ]) {
    assert.throws(() => normalizeHistoryPath(row(rollout_path)));
  }
  assert.throws(() => normalizeHistoryPath({ ...row(canonical), id: '2ac83400-cae7-4a6f-89fd-39740db21b27' }));
  assert.throws(() => normalizeHistoryPath({ ...row(canonical), cwd: 'D:/unrelated/nilaza' }));
  const malformedId = 'a'.repeat(36);
  assert.throws(() => normalizeHistoryPath({ id: malformedId, cwd: 'D:/nilaza', rollout_path: canonical.replace(id, malformedId) }));
});

test('fork history paths require the indexed UUID first and one valid optional fork UUID', () => {
  const id = '1ac83400-cae7-4a6f-89fd-39740db21b27';
  const forkId = '2ac83400-cae7-4a6f-89fd-39740db21b27';
  const prefix = 'C:\\Users\\Admin\\.codex\\sessions\\2026\\06\\15\\rollout-2026-06-15T12-30-00-';
  const row = suffix => ({ id, cwd: 'D:/nilaza', rollout_path: prefix + suffix });
  for (const extension of ['.jsonl', '.jsonl.zst']) {
    const suffix = `${id}_${forkId}${extension}`;
    assert.equal(normalizeHistoryPath(row(suffix)), prefix + suffix);
  }
  for (const suffix of [
    `${forkId}_${id}.jsonl`, `${forkId}_${id}.jsonl.zst`,
    `${id}_not-a-uuid.jsonl`, `${id}_${'a'.repeat(36)}.jsonl`,
    `${id}_${forkId}_${forkId}.jsonl`, `${id}_${forkId}.jsonl.zst.zst`,
    `${id}_${forkId}_${id}.jsonl`, `${id}_${id}_${forkId}.jsonl`,
    `${id}_not-a-uuid_${id}.jsonl`,
  ]) {
    assert.throws(() => normalizeHistoryPath(row(suffix)));
  }
});

test('empty history targets return zero without opening session metadata or directories', async () => {
  const methods = ['existsSync', 'openSync', 'readdirSync'];
  const original = Object.fromEntries(methods.map(name => [name, fs[name]]));
  let attemptedReads = 0;
  try {
    for (const name of methods) fs[name] = () => { attemptedReads++; throw new Error('PUBLIC-FIXTURE-FILESYSTEM-ACCESS-FORBIDDEN'); };
    for (const targets of [[], [{ projectRef: singapore, name: 'OPENROUTER_API_KEY', digest: 'not-a-digest' }]]) {
      assert.deepEqual(await recoverFromHistory(targets), {
        matches: [], scannedFiles: 0, candidateCount: 0, skippedOversizedLines: 0,
      });
    }
    assert.equal(attemptedReads, 0);
  } finally {
    for (const name of methods) fs[name] = original[name];
  }
});
