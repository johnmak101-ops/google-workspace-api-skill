const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { WorkspaceOAuth } = require('../dist/oauth.js');
const { TokenStore } = require('../dist/token-store.js');

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

function config(homeDir, redirectUri) {
  return { clientId: 'client-id', clientSecret: 'client-secret', redirectUri, homeDir };
}

test('one-click OAuth stores actual granted scopes and refresh token', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-oauth-'));
  let tokenRequest;
  const google = await listen(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    tokenRequest = new URLSearchParams(Buffer.concat(chunks).toString());
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'access-one', refresh_token: 'refresh-one', expires_in: 3600, scope: 'https://www.googleapis.com/auth/gmail.readonly' }));
  });
  const store = new TokenStore(home);
  const oauth = new WorkspaceOAuth(config(home, 'http://localhost:18080/callback'), store);
  const visit = async (url) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://accounts.google.com', 'OAuth must open Google directly without a local selection page');
    assert.equal(target.searchParams.get('client_id'), 'client-id');
    assert.equal(target.searchParams.get('redirect_uri'), 'http://localhost:18080/callback');
    assert.equal(target.searchParams.get('access_type'), 'offline');
    assert.equal(target.searchParams.get('prompt'), 'consent');
    assert.equal(target.searchParams.get('include_granted_scopes'), 'true');
    assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
    const scopes = target.searchParams.get('scope').split(' ');
    assert.ok(scopes.includes('https://www.googleapis.com/auth/gmail.readonly'));
    assert.ok(scopes.includes('https://www.googleapis.com/auth/gmail.compose'));
    const callback = `http://127.0.0.1:18080/callback?code=auth-code&state=${encodeURIComponent(target.searchParams.get('state'))}`;
    const response = await fetch(callback);
    assert.match(await response.text(), /Authentication complete/);
  };
  const result = await oauth.authorize({
    selection: [{ service: 'gmail', write: true }],
    tokenEndpoint: `${google.url}/token`,
    openBrowser: visit,
  });
  assert.equal(result[0].service, 'gmail');
  assert.equal(result[0].status, 'partial');
  assert.equal(tokenRequest.get('code'), 'auth-code');
  assert.equal(tokenRequest.get('client_secret'), 'client-secret');
  assert.ok(tokenRequest.get('code_verifier'));
  const saved = await store.read('gmail');
  assert.equal(saved.refreshToken, 'refresh-one');
  assert.deepEqual(saved.grantedScopes, ['https://www.googleapis.com/auth/gmail.readonly']);
  await new Promise((resolve) => google.server.close(resolve));
});

test('OAuth requires a refresh token', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-oauth-'));
  const google = await listen(async (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'access-only', expires_in: 3600 }));
  });
  const oauth = new WorkspaceOAuth(config(home, 'http://localhost:18080/callback'), new TokenStore(home));
  const visit = async (url) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://accounts.google.com');
    const scopes = target.searchParams.get('scope').split(' ');
    assert.ok(scopes.includes('https://www.googleapis.com/auth/gmail.readonly'));
    assert.ok(!scopes.includes('https://www.googleapis.com/auth/gmail.compose'));
    await fetch(`http://127.0.0.1:18080/callback?code=code&state=${target.searchParams.get('state')}`);
  };
  try {
    await assert.rejects(oauth.authorize({
      selection: [{ service: 'gmail', write: false }], tokenEndpoint: `${google.url}/token`,
      openBrowser: visit,
    }), /refresh token/i);
  } finally {
    await new Promise((resolve) => google.server.close(resolve));
  }
});

test('OAuth accepts a valid callback after rejecting a mismatched state', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-oauth-'));
  let tokenCalls = 0;
  const google = await listen(async (req, res) => {
    tokenCalls += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }));
  });
  const oauth = new WorkspaceOAuth(config(home, 'http://localhost:18080/callback'), new TokenStore(home));
  const visit = async (url) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://accounts.google.com');
    const state = target.searchParams.get('state');
    const response = await fetch(`http://127.0.0.1:18080/callback?code=code&state=wrong-state`);
    assert.equal(response.status, 400);
    const valid = await fetch(`http://127.0.0.1:18080/callback?code=code&state=${encodeURIComponent(state)}`);
    assert.equal(valid.status, 200);
  };
  try {
    const result = await oauth.authorize({
      selection: [{ service: 'gmail', write: false }], tokenEndpoint: `${google.url}/token`, openBrowser: visit,
    });
    assert.equal(result[0].status, 'authorized');
    assert.ok(tokenCalls >= 1);
  } finally {
    await new Promise((resolve) => google.server.close(resolve));
  }
});
