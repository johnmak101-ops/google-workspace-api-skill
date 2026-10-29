const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { runCli } = require('../dist/cli.js');
const { loadOAuthConfig } = require('../dist/config.js');

function home() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-setup-'));
}

function desktopClient(dir, block = { client_id: 'client-id', client_secret: 'client-secret' }) {
  const file = path.join(dir, 'client_secret.json');
  fs.writeFileSync(file, JSON.stringify({ installed: block }), { mode: 0o600 });
  return file;
}

function ioFor(env) {
  let out = '';
  let err = '';
  return {
    stdout: (value) => { out += value; }, stderr: (value) => { err += value; },
    stdin: Object.assign(Readable.from([]), { isTTY: true }),
    env,
    readStdout: () => out, readStderr: () => err,
  };
}

test('setup writes a credential config that later commands read without environment variables', async () => {
  const dir = home();
  const file = desktopClient(dir);
  const io = ioFor({ WORKSPACE_API_HOME: dir });
  assert.equal(await runCli(['setup', '--client-secret-file', file, '--json'], io), 0);
  const result = JSON.parse(io.readStdout()).content;
  assert.equal(result.clientType, 'installed');
  assert.equal(result.clientId, 'client-id');
  assert.equal(result.configPath, path.join(dir, 'config.json'));

  const stored = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  assert.equal(stored.clientSecret, 'client-secret');
  assert.equal(stored.redirectUri, 'http://localhost:8080/callback');

  const config = await loadOAuthConfig({ WORKSPACE_API_HOME: dir });
  assert.equal(config.clientId, 'client-id');
  assert.equal(config.clientSecret, 'client-secret');
  assert.equal(config.redirectUri, 'http://localhost:8080/callback');

  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(path.join(dir, 'config.json')).mode & 0o077, 0);
  }
});

test('setup refuses a Web application client', async () => {
  const dir = home();
  const file = path.join(dir, 'web.json');
  fs.writeFileSync(file, JSON.stringify({ web: { client_id: 'web-id', client_secret: 'web-secret' } }));
  const io = ioFor({ WORKSPACE_API_HOME: dir });
  assert.equal(await runCli(['setup', '--client-secret-file', file, '--json'], io), 1);
  assert.equal(JSON.parse(io.readStdout()).error.code, 'CLIENT_TYPE');
  assert.equal(fs.existsSync(path.join(dir, 'config.json')), false);
});

test('setup protects an existing configuration unless forced', async () => {
  const dir = home();
  const first = desktopClient(dir);
  assert.equal(await runCli(['setup', '--client-secret-file', first, '--json'], ioFor({ WORKSPACE_API_HOME: dir })), 0);

  const io = ioFor({ WORKSPACE_API_HOME: dir });
  assert.equal(await runCli(['setup', '--client-secret-file', first, '--json'], io), 1);
  assert.equal(JSON.parse(io.readStdout()).error.code, 'CONFIG_EXISTS');

  const replacement = path.join(dir, 'replacement.json');
  fs.writeFileSync(replacement, JSON.stringify({ installed: { client_id: 'second-id', client_secret: 'second-secret' } }));
  assert.equal(await runCli(['setup', '--client-secret-file', replacement, '--force', '--json'], ioFor({ WORKSPACE_API_HOME: dir })), 0);
  const stored = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  assert.equal(stored.clientId, 'second-id');
});

test('environment credentials override the stored configuration', async () => {
  const dir = home();
  const file = desktopClient(dir);
  assert.equal(await runCli(['setup', '--client-secret-file', file, '--json'], ioFor({ WORKSPACE_API_HOME: dir })), 0);
  const config = await loadOAuthConfig({
    WORKSPACE_API_HOME: dir,
    GOOGLE_OAUTH_CLIENT_ID: 'env-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'env-secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://127.0.0.1:9000/callback',
  });
  assert.equal(config.clientId, 'env-id');
  assert.equal(config.clientSecret, 'env-secret');
  assert.equal(config.redirectUri, 'http://127.0.0.1:9000/callback');
});

test('setup requires the client secret file', async () => {
  const io = ioFor({ WORKSPACE_API_HOME: home() });
  assert.equal(await runCli(['setup', '--json'], io), 2);
  assert.match(io.readStdout(), /client-secret-file/);
});
