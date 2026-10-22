import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = relative => fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');

test('release inventory covers the shared AI contracts and Admin feedback runtime', () => {
  const { inputRoots } = JSON.parse(read('docs/release/release-profile.json'));
  for (const source of [
    'packages/ai-contracts/answer-provenance.ts',
    'packages/ai-contracts/feedback.ts',
    'packages/ai-contracts/tarot-output.ts',
    'apps/admin/feedback-inbox.js',
  ]) {
    assert.ok(inputRoots.some(root => source === root || source.startsWith(`${root}/`)),
      `Release checksum inventory omits runtime source: ${source}`);
  }
});

test('a shared AI contract change triggers Mobile quality on PR and main push', () => {
  const workflow = read('.github/workflows/mobile-quality.yml');
  const pr = workflow.split('  pull_request:')[1]?.split('  push:')[0];
  const push = workflow.split('  push:')[1]?.split('\npermissions:')[0];
  for (const [event, section] of [['pull_request', pr], ['push', push]]) {
    assert.ok(section?.includes('"packages/ai-contracts/**"'), `${event} omits shared AI contracts`);
  }
});
