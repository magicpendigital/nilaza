import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = { window: {}, URLSearchParams };
vm.runInNewContext(readFileSync('apps/admin/recovery-core.js', 'utf8'), context);
const valid = '#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh';
function harness() {
  const calls = [];
  const auth = {
    resetPasswordForEmail: async (...args) => { calls.push(['request', ...args]); return {}; },
    setSession: async () => ({ data: { session: {} } }),
    getUser: async () => ({ data: { user: { id: 'synthetic' } } }),
    updateUser: async () => { calls.push(['update']); return {}; },
    signOut: async () => { calls.push(['signOut']); return {}; }
  };
  let time = 0;
  return { auth, calls, tick: () => { time += 60001; }, recovery: context.window.NilazaRecovery.createRecovery({ auth }, () => time) };
}
test('request uses explicit redirect and blocks repeat requests', async () => {
  const h = harness();
  await h.recovery.request(' user@example.test ', 'https://qa.example.test/recovery.html');
  assert.equal(h.calls[0][1], 'user@example.test');
  assert.equal(h.calls[0][2].redirectTo, 'https://qa.example.test/recovery.html');
  await assert.rejects(h.recovery.request('user@example.test', ''), /cooldown/);
  h.tick(); await h.recovery.request('user@example.test', '');
  assert.equal(h.calls.length, 2);
});
test('no password update without verified recovery; reject normal login links', async () => {
  const h = harness();
  await assert.rejects(h.recovery.update('synthetic-password', 'synthetic-password'), /link/);
  for (const fragment of ['', '#type=recovery', valid.replace('recovery', 'signup'), '#error=expired']) await assert.rejects(h.recovery.accept(fragment), /link/);
  assert.equal(h.calls.length, 0);
});
test('invite links from Thành viên & quyền are accepted like recovery links (14/11)', async () => {
  const h = harness();
  await h.recovery.accept(valid.replace('recovery', 'invite'));
  await h.recovery.update('synthetic-password', 'synthetic-password');
  assert.deepEqual(h.calls, [['update'], ['signOut']]);
  await assert.rejects(harness().recovery.accept('#type=invite&error=expired&access_token=a&refresh_token=b'), /link/);
  assert.match(readFileSync('apps/admin/recovery.js', 'utf8'), /inviteTitle: "Đặt mật khẩu cho tài khoản Admin"/);
});
test('invalid server session and user are rejected', async () => {
  const h = harness();
  h.auth.getUser = async () => ({ data: { user: null }, error: {} });
  await assert.rejects(h.recovery.accept(valid), /link/);
  await assert.rejects(h.recovery.update('synthetic-password', 'synthetic-password'), /link/);
});
test('validation, retry and successful update never adopt an admin session', async () => {
  const h = harness(); await h.recovery.accept(valid);
  await assert.rejects(h.recovery.update('short', 'short'), /length/);
  await assert.rejects(h.recovery.update('synthetic-password', 'different'), /match/);
  const update = h.auth.updateUser;
  h.auth.updateUser = async () => ({ error: new Error('offline') });
  await assert.rejects(h.recovery.update('synthetic-password', 'synthetic-password'), /offline/);
  h.auth.updateUser = update;
  await h.recovery.update('synthetic-password', 'synthetic-password');
  assert.deepEqual(h.calls, [['update'], ['signOut']]);
  await assert.rejects(h.recovery.update('synthetic-password', 'synthetic-password'), /link/);
});
test('callback scrubs URL before external scripts and never persists sessions', () => {
  const html = readFileSync('apps/admin/recovery.html', 'utf8');
  const js = readFileSync('apps/admin/recovery.js', 'utf8');
  assert.ok(html.indexOf('history.replaceState') < html.indexOf('cdn.jsdelivr'));
  assert.match(html, /no-referrer/);
  assert.match(js, /persistSession: false/);
  assert.match(js, /detectSessionInUrl: false/);
  assert.doesNotMatch(readFileSync('apps/admin/index.html', 'utf8'), /value="demo"|value="owner@/);
});
