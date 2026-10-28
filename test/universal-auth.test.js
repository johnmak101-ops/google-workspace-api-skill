const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { WorkspaceOAuth } = require('../dist/oauth.js');
const { TokenStore } = require('../dist/token-store.js');
const { scopesFor } = require('../dist/catalog.js');

test('universal-only authorization stores grants for every federated product', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-universal-auth-'));
  const tokenServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }));
  });
  await new Promise((resolve) => tokenServer.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => tokenServer.close(resolve)));
  const tokenEndpoint = `http://127.0.0.1:${tokenServer.address().port}/token`;
  const store = new TokenStore(home);
  const oauth = new WorkspaceOAuth({ clientId: 'id', clientSecret: 'secret', redirectUri: 'http://localhost:18083/callback', homeDir: home }, store);
  const visit = async (url) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://accounts.google.com');
    const response = await fetch(`http://127.0.0.1:18083/callback?code=code&state=${target.searchParams.get('state')}`);
    assert.equal(response.status, 200);
  };
  await oauth.authorize({ selection: [{ service: 'universal', write: false }], tokenEndpoint, openBrowser: visit });
  for (const service of ['gmail', 'drive', 'calendar', 'chat']) {
    const grant = await store.read(service);
    assert.ok(grant, `missing ${service} grant`);
    assert.ok(grant.grantedScopes.length > 0);
  }
  const chat = await store.read('chat');
  assert.ok(chat.grantedScopes.includes('https://www.googleapis.com/auth/chat.spaces.readonly'));
  assert.ok(chat.grantedScopes.includes('https://www.googleapis.com/auth/chat.messages.readonly'));
});

test('chat-only universal selection includes spaces and messages scopes', () => {
  const scopes = scopesFor([{ service: 'universal', write: false }], { universalProducts: ['chat'] });
  assert.ok(scopes.includes('https://www.googleapis.com/auth/chat.spaces.readonly'));
  assert.ok(scopes.includes('https://www.googleapis.com/auth/chat.messages.readonly'));
});
