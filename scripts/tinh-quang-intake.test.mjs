import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CHECKS, amendMetadata, digest, inspectSource, validateReviews } from './tinh-quang-intake.mjs';

const canonical = JSON.parse(fs.readFileSync(new URL('../packages/content/data/tarot-cards.json', import.meta.url), 'utf8'));
const ranks = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
function fixture() {
  const inventory = { deckId: 'tinh-quang', cards: canonical.map(c => ({ cardId: c.id, sourcePath: 'assets/tarot/tinh-quang/originals/' + c.id + '.png', sourceSha256: digest(Buffer.from(c.id)) })) };
  const reviews = { reviewer: 'independent_visual_reviewer', date: '2026-10-18', stage: 'source_artwork_only', cards: inventory.cards.map((c, i) => ({ ...c, decision: 'accepted', observedCount: ranks.includes(canonical[i].rank) ? ranks.indexOf(canonical[i].rank) + 1 : null, countEvidence: 'Counted all principal objects in separate visible positions.', checks: Object.fromEntries(CHECKS.map(k => [k, { status: 'pass', evidence: 'Individual source image observation for ' + c.cardId + ' ' + k }])), issues: [] })) };
  return { inventory, reviews };
}

test('complete source evidence can prepare rendering but is explicitly source-only', () => {
  const { inventory, reviews } = fixture();
  assert.deepEqual(validateReviews(inventory, reviews, canonical), []);
  reviews.stage = 'final_card_approved';
  assert.match(validateReviews(inventory, reviews, canonical).join('\n'), /source-only/);
});

test('a missing or duplicate review cannot conceal an unreviewed canonical ID', () => {
  const { inventory, reviews } = fixture();
  reviews.cards[77] = structuredClone(reviews.cards[0]);
  const errors = validateReviews(inventory, reviews, canonical).join('\n');
  assert.match(errors, /duplicate review ID/);
  assert.match(errors, /Unreviewed card/);
});

test('approval is invalid after source bytes or selected source path change', () => {
  const { inventory, reviews } = fixture();
  reviews.cards[0].sourceSha256 = 'a'.repeat(64);
  reviews.cards[1].sourcePath = 'assets/tarot/another-deck/artwork/major-01-magician.png';
  assert.equal(validateReviews(inventory, reviews, canonical).filter(x => x.includes('does not bind current source')).length, 2);
});

test('accepted artwork cannot have failed, pending or missing visual criteria', () => {
  const { inventory, reviews } = fixture();
  reviews.cards[0].checks.anatomyAndPose.status = 'fail';
  reviews.cards[1].checks.propContactAndSupport.status = 'pending';
  delete reviews.cards[2].checks.sceneAndMeaning;
  const errors = validateReviews(inventory, reviews, canonical).join('\n');
  assert.match(errors, /unresolved anatomyAndPose/);
  assert.match(errors, /unresolved propContactAndSupport/);
  assert.match(errors, /Missing specific sceneAndMeaning/);
});

test('a numbered Minor with wrong count or no object locations cannot be admitted', () => {
  const { inventory, reviews } = fixture();
  const nine = reviews.cards.find(c => c.cardId === 'minor-pentacles-nine');
  nine.observedCount = 10;
  const eight = reviews.cards.find(c => c.cardId === 'minor-cups-eight');
  eight.countEvidence = '';
  assert.equal(validateReviews(inventory, reviews, canonical).filter(x => x.includes('exact count/location')).length, 2);
});

test('a court card must also follow its explicit source symbol plan', () => {
  const { inventory, reviews } = fixture();
  const source = inventory.cards.find(c => c.cardId === 'minor-cups-knight');
  const row = reviews.cards.find(c => c.cardId === source.cardId);
  source.symbolPlan = { requiredCount: 1 };
  row.observedCount = 2;
  assert.match(validateReviews(inventory, reviews, canonical).join('\n'), /exact count\/location.*minor-cups-knight/);
  row.observedCount = 1;
  assert.deepEqual(validateReviews(inventory, reviews, canonical), []);
});

test('a rejected image retains a concrete issue and cannot be relabeled accepted', () => {
  const { inventory, reviews } = fixture();
  reviews.cards[0].decision = 'rejected';
  assert.match(validateReviews(inventory, reviews, canonical).join('\n'), /actionable issue/);
  reviews.cards[0].issues = [{ severity: 'medium', location: 'Right hand and staff contact', actual: 'Staff is visibly separated from the closed hand', expected: 'Fingers need to wrap the shaft with supported weight', regenerationDirection: 'Recompose hand and shaft contact without changing the card archetype' }];
  assert.deepEqual(validateReviews(inventory, reviews, canonical), []);
  reviews.cards[0].decision = 'accepted';
  assert.match(validateReviews(inventory, reviews, canonical).join('\n'), /Accepted card has issues/);
});

test('checksum mismatch and incorrectly sized PNG inputs fail before copying', () => {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(656, 16); bytes.writeUInt32BE(1130, 20);
  assert.doesNotThrow(() => inspectSource(bytes, digest(bytes)));
  const changed = Buffer.from(bytes); changed[0] = 0;
  assert.throws(() => inspectSource(changed, digest(bytes)), /SHA-256/);
  bytes.writeUInt32BE(1024, 16);
  assert.throws(() => inspectSource(bytes, digest(bytes)), /656x1130/);
});

test('a scene amendment updates repeated prompt text without mutating the imported source', () => {
  const original = { scene: { en: 'one person holds a free chain end' }, prompt: 'Scene: one person holds a free chain end', untouched: ['ordinary flowers', 10, null] };
  const before = JSON.stringify(original);
  const changed = amendMetadata(original, [{ before: 'one person holds a free chain end', after: 'each person holds a separate free chain end' }]);
  assert.equal(changed.scene.en, 'each person holds a separate free chain end');
  assert.equal(changed.prompt, 'Scene: each person holds a separate free chain end');
  assert.deepEqual(changed.untouched, original.untouched);
  assert.equal(JSON.stringify(original), before);
});

test('retired intake rejects the active English deck before reading historical source paths', () => {
  assert.throws(() => execFileSync(process.execPath, ['scripts/tinh-quang-intake.mjs', 'verify'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: 'pipe'
  }), error => {
    assert.match(error.stderr, /Intake must not activate the deck/);
    assert.doesNotMatch(error.stderr, /ENOENT/);
    return true;
  });
});
