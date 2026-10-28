const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { TokenStore } = require('../dist/token-store.js');

function record(overrides = {}) {
  return {
    account: 'person@example.com',
    clientId: 'client-id',
    accessToken: 'access-one',
    refreshToken: 'refresh-one',
    expiresAt: Date.now() + 3600_000,
    grantedScopes: ['gmail.readonly'],
    ...overrides,
  };
}

test('token records persist actual scopes without exposing secrets in status', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-tokens-'));
  const store = new TokenStore(home);
  const expected = record();
  await store.write('gmail', expected);
  assert.deepEqual(await store.read('gmail'), expected);
  const status = await store.status();
  assert.equal(status[0].service, 'gmail');
  assert.deepEqual(status[0].grantedScopes, ['gmail.readonly']);
  assert.ok(!('accessToken' in status[0]));
  assert.ok(!('refreshToken' in status[0]));
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(path.join(home, 'tokens', 'gmail.json')).mode & 0o777, 0o600);
  }
});

test('missing refresh token in an update preserves the existing grant', async () => {
  const store = new TokenStore(fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-tokens-')));
  await store.write('gmail', record());
  await store.write('gmail', record({ accessToken: 'access-two', refreshToken: '' }));
  const saved = await store.read('gmail');
  assert.equal(saved.accessToken, 'access-two');
  assert.equal(saved.refreshToken, 'refresh-one');
});

test('per-service deletion leaves other grants intact', async () => {
  const store = new TokenStore(fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-tokens-')));
  await store.write('gmail', record());
  await store.write('drive', record({ grantedScopes: ['drive.readonly'] }));
  await store.remove('gmail');
  assert.equal(await store.read('gmail'), null);
  assert.notEqual(await store.read('drive'), null);
  await store.remove();
  assert.equal(await store.read('drive'), null);
});

test('independent stores serialize shared state with a cross-process lock', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-tokens-'));
  const counter = path.join(home, 'counter.txt');
  fs.writeFileSync(counter, '0');
  const stores = [new TokenStore(home), new TokenStore(home)];
  await Promise.all(Array.from({ length: 12 }, (_, index) => stores[index % 2].withLock('counter', async () => {
    const current = Number(fs.readFileSync(counter, 'utf8'));
    await delay(2);
    fs.writeFileSync(counter, String(current + 1));
  })));
  assert.equal(fs.readFileSync(counter, 'utf8'), '12');
});
