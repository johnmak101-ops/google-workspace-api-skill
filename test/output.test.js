const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeEnvelope, writeBoundedResult, redactError } = require('../dist/output.js');
const { ResultStore } = require('../dist/result-store.js');

test('small results use a stable versioned envelope', () => {
  const first = makeEnvelope({ service: 'gmail', content: { ok: true } });
  const second = makeEnvelope({ service: 'gmail', content: { ok: true } });
  assert.equal(first.v, 1);
  assert.equal(first.status, 'ok');
  assert.equal(first.mayHaveCompleted, false);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('oversized multibyte results stay below byte cap and retain full content', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-results-'));
  const store = new ResultStore(home);
  const text = '你好🌍'.repeat(30000);
  const result = await writeBoundedResult({ service: 'drive', content: text }, store);
  assert.ok(Buffer.byteLength(JSON.stringify(result), 'utf8') <= 65536);
  assert.equal(result.truncated, true);
  assert.equal(result.file.mimeType, 'text/plain; charset=utf-8');
  assert.equal(fs.readFileSync(result.file.path, 'utf8'), text);
  assert.ok(!result.file.path.includes('node_modules'));
});

test('binary resources are saved with MIME metadata', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-results-'));
  const store = new ResultStore(home);
  const bytes = Buffer.from([0, 1, 2, 255]);
  const result = await writeBoundedResult({ service: 'drive', content: bytes, mimeType: 'application/pdf' }, store);
  assert.equal(result.file.mimeType, 'application/pdf');
  assert.equal(result.file.size, 4);
  assert.deepEqual(fs.readFileSync(result.file.path), bytes);
});

test('errors redact bearer and refresh tokens', () => {
  const message = redactError(new Error('Bearer ya29.secret-token refresh_token=refresh-secret'));
  assert.doesNotMatch(message, /ya29\.secret-token|refresh-secret/);
  assert.match(message, /REDACTED/);
});
