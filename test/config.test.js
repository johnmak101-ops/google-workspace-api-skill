const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadOAuthConfig, assertNodeVersion, parseJsonObject, resolveHomeDir } = require('../dist/config.js');

test('credential home is independent and configurable', () => {
  assert.equal(resolveHomeDir({}), path.join(os.homedir(), '.google-workspace-api'));
  assert.equal(resolveHomeDir({ WORKSPACE_API_HOME: '/tmp/workspace-api' }), '/tmp/workspace-api');
});

test('missing OAuth configuration reports variable names without secret values', async () => {
  await assert.rejects(loadOAuthConfig({}), /GOOGLE_OAUTH_CLIENT_ID/);
  await assert.rejects(loadOAuthConfig({ GOOGLE_OAUTH_CLIENT_ID: 'client-id' }), /GOOGLE_OAUTH_CLIENT_SECRET/);
});

test('OAuth configuration reads a secret file and validates loopback redirect', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-config-'));
  const secretFile = path.join(dir, 'secret');
  fs.writeFileSync(secretFile, 'file-secret', { mode: 0o600 });
  const config = await loadOAuthConfig({
    GOOGLE_OAUTH_CLIENT_ID: 'client-id',
    GOOGLE_OAUTH_CLIENT_SECRET_FILE: secretFile,
    GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:8080/callback',
    WORKSPACE_API_HOME: dir,
  });
  assert.equal(config.clientSecret, 'file-secret');
  assert.equal(config.redirectUri, 'http://localhost:8080/callback');
  assert.equal(config.homeDir, dir);
  await assert.rejects(loadOAuthConfig({
    GOOGLE_OAUTH_CLIENT_ID: 'id', GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'https://example.com/callback',
  }), /loopback/i);
});

test('OAuth configuration accepts downloaded client_secret.json', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-config-'));
  const secretFile = path.join(dir, 'client_secret.json');
  fs.writeFileSync(secretFile, JSON.stringify({ installed: { client_id: 'client-id', client_secret: 'json-secret' } }), { mode: 0o600 });
  const config = await loadOAuthConfig({
    GOOGLE_OAUTH_CLIENT_ID: 'client-id',
    GOOGLE_OAUTH_CLIENT_SECRET_FILE: secretFile,
    WORKSPACE_API_HOME: dir,
  });
  assert.equal(config.clientSecret, 'json-secret');
});

test('Node version must be 24.22.x', () => {
  assert.doesNotThrow(() => assertNodeVersion('24.22.1'));
  assert.throws(() => assertNodeVersion('24.21.0'), /24\.22/);
  assert.throws(() => assertNodeVersion('22.0.0'), /24\.22/);
});

test('argument JSON must be an object', () => {
  assert.deepEqual(parseJsonObject('{"query":"is:unread"}'), { query: 'is:unread' });
  assert.throws(() => parseJsonObject('[]'), /object/i);
  assert.throws(() => parseJsonObject('null'), /object/i);
});
