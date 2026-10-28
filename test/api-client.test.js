const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { GoogleApiClient } = require('../dist/api-client.js');
const { ResultStore } = require('../dist/result-store.js');

async function server(t, handler) {
  const instance = http.createServer(handler);
  await new Promise((resolve) => instance.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => instance.close(resolve)));
  const origin = `http://127.0.0.1:${instance.address().port}`;
  return {
    origin,
    fetch: (url, init) => fetch(`${origin}${new URL(url).pathname}${new URL(url).search}`, init),
  };
}

function client(google, options = {}) {
  return new GoogleApiClient({
    getAccessToken: async () => 'old-token',
    fetchImpl: google.fetch,
    resultStore: new ResultStore(fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-api-results-'))),
    ...options,
  });
}

test('read sends bearer token and decodes JSON', async (t) => {
  const google = await server(t, (req, res) => {
    assert.equal(req.headers.authorization, 'Bearer old-token');
    assert.equal(req.url, '/gmail/v1/users/me/messages?q=is%3Aunread&maxResults=1');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ messages: [] }));
  });
  const result = await client(google).invoke('gmail', 'search_messages', { query: 'is:unread', pageSize: 1 }, false);
  assert.deepEqual(result, { messages: [] });
});

test('read refreshes once on 401 and uses the new token', async (t) => {
  let calls = 0;
  const google = await server(t, (req, res) => {
    calls += 1;
    if (calls === 1) { res.writeHead(401).end(); return; }
    assert.equal(req.headers.authorization, 'Bearer new-token');
    res.writeHead(200, { 'content-type': 'application/json' }).end('{}');
  });
  const result = await client(google, { refreshAccessToken: async () => 'new-token' }).invoke('gmail', 'search_messages', {}, false);
  assert.deepEqual(result, {});
  assert.equal(calls, 2);
});

test('mutation is never replayed after dispatch', async (t) => {
  let calls = 0;
  const google = await server(t, (_req, res) => { calls += 1; res.writeHead(401).end(); });
  await assert.rejects(client(google, { refreshAccessToken: async () => 'new-token' }).invoke('gmail', 'create_draft', { message: {} }, true), /401/);
  assert.equal(calls, 1);
});

test('ambiguous mutation failures return unknown without retry', async (t) => {
  let calls = 0;
  const google = await server(t, (_req, res) => { calls += 1; res.writeHead(500).end(); });
  const result = await client(google).invoke('gmail', 'create_draft', { message: {} }, true);
  assert.equal(result.status, 'unknown');
  assert.equal(result.mayHaveCompleted, true);
  assert.equal(calls, 1);
});

test('caller cannot bypass catalog mutation classification before token access', async () => {
  let tokens = 0;
  const api = new GoogleApiClient({ getAccessToken: async () => { tokens += 1; return 'token'; } });
  await assert.rejects(api.invoke('gmail', 'send_message', { raw: 'x' }, false), /mutation/i);
  await assert.rejects(api.invoke('gmail', 'search_messages', {}, true), /read-only/i);
  assert.equal(tokens, 0);
});

test('Google errors are deterministic and bounded', async (t) => {
  const google = await server(t, (_req, res) => {
    res.writeHead(403, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: `ordinary API disabled ${'x'.repeat(2000)}` } }));
  });
  await assert.rejects(client(google).invoke('gmail', 'search_messages', {}, false), (error) => {
    assert.equal(error.status, 403);
    assert.ok(error.message.length < 600);
    return true;
  });
});

test('binary responses stream to protected result files', async (t) => {
  const google = await server(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('hello');
  });
  const result = await client(google).invoke('drive', 'download_file_content', { fileId: 'file-1' }, false);
  assert.equal(result.file.size, 5);
  assert.equal(fs.readFileSync(result.file.path, 'utf8'), 'hello');
});

test('binary and JSON response limits fail closed', async (t) => {
  const google = await server(t, (req, res) => {
    if (req.url.includes('alt=media')) { res.writeHead(200).end('12345'); return; }
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"x":"123456789"}');
  });
  const api = client(google, { maxBinaryBytes: 4, maxJsonBytes: 5 });
  await assert.rejects(api.invoke('drive', 'download_file_content', { fileId: 'file-1' }, false), /too large/i);
  await assert.rejects(api.invoke('gmail', 'search_messages', {}, false), /too large/i);
});

test('a stalled mutation reports unknown once', async (t) => {
  const google = await server(t, async (_req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    res.writeHead(200, { 'content-type': 'application/json' }).end('{}');
  });
  const result = await client(google, { timeoutMs: 30 }).invoke('gmail', 'create_draft', { message: {} }, true);
  assert.equal(result.status, 'unknown');
});
