const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { runCli } = require('../dist/cli.js');
const { TokenStore } = require('../dist/token-store.js');

function ioFor(overrides = {}) {
  let out = '';
  let err = '';
  return {
    stdout: (value) => { out += value; }, stderr: (value) => { err += value; },
    stdin: Object.assign(Readable.from([]), { isTTY: true }),
    env: { WORKSPACE_API_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-api-cli-')) },
    readStdout: () => out, readStderr: () => err, ...overrides,
  };
}

test('services and local tool discovery need no OAuth configuration', async () => {
  const servicesIo = ioFor();
  assert.equal(await runCli(['services', '--json'], servicesIo), 0);
  const services = JSON.parse(servicesIo.readStdout());
  assert.equal(services.ok, true);
  assert.ok(services.content.some((service) => service.name === 'gmail'));

  const toolsIo = ioFor();
  assert.equal(await runCli(['tools', 'gmail', '--json'], toolsIo), 0);
  const tools = JSON.parse(toolsIo.readStdout()).content;
  assert.ok(tools.some((tool) => tool.name === 'search_messages'));
  assert.equal(tools[0].inputSchema, undefined);

  const schemaIo = ioFor();
  assert.equal(await runCli(['tools', 'gmail', '--tool', 'search_messages', '--json'], schemaIo), 0);
  assert.equal(JSON.parse(schemaIo.readStdout()).content.inputSchema.type, 'object');
});

test('draft schema requires raw MIME inside the message resource', async () => {
  const io = ioFor();
  assert.equal(await runCli(['tools', 'gmail', '--tool', 'create_draft', '--json'], io), 0);
  const schema = JSON.parse(io.readStdout()).content.inputSchema;
  assert.deepEqual(schema.properties.message.required, ['raw']);
  assert.equal(schema.properties.message.additionalProperties, false);
});

test('call reads arguments from a file and unknown mutations have a distinct exit code', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-api-args-'));
  const file = path.join(dir, 'args.json');
  fs.writeFileSync(file, JSON.stringify({ query: 'is:unread', pageSize: 1 }));
  const calls = [];
  const api = { invoke: async (...args) => { calls.push(args); return { status: 'unknown', mayHaveCompleted: true }; } };
  const io = ioFor({ api });
  assert.equal(await runCli(['mutate', 'gmail', 'create_draft', '--args-file', file, '--json'], io), 3);
  assert.equal(calls[0][3], true);
  assert.equal(JSON.parse(io.readStdout()).mayHaveCompleted, true);
});

test('inline arguments are rejected even when an argument file is present', async () => {
  let invoked = false;
  const io = ioFor({ api: { invoke: async () => { invoked = true; return {}; } } });
  assert.equal(await runCli(['call', 'gmail', 'search_messages', '--args', '{}'], io), 2);
  assert.equal(await runCli(['call', 'gmail', 'search_messages', '--args-file', 'args.json', '--args', '{}'], io), 2);
  assert.equal(invoked, false);
});

test('equals-form arguments are parsed or rejected without being ignored', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-api-equals-'));
  const file = path.join(dir, 'args.json');
  fs.writeFileSync(file, '{"query":"is:unread"}');
  let args;
  const io = ioFor({ api: { invoke: async (_service, _tool, input) => { args = input; return {}; } } });
  assert.equal(await runCli(['call', 'gmail', 'search_messages', `--args-file=${file}`, '--json'], io), 0);
  assert.deepEqual(args, { query: 'is:unread' });
  assert.equal(await runCli(['call', 'gmail', 'search_messages', '--args={"query":"secret"}'], io), 2);
});

test('a read payload with status unknown remains normal content', async () => {
  const io = ioFor({ api: { invoke: async () => ({ status: 'unknown', value: 1 }) } });
  assert.equal(await runCli(['call', 'gmail', 'search_messages', '--json'], io), 0);
  assert.equal(JSON.parse(io.readStdout()).content.value, 1);
});

test('read and mutation commands enforce their distinct entrypoints', async () => {
  const io = ioFor({ api: { invoke: async () => { throw new Error('classification'); } } });
  assert.equal(await runCli(['call', 'gmail', 'create_draft'], io), 1);
  assert.match(io.readStderr(), /classification/);
});

test('auth-status never exposes token values', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-api-status-'));
  const tokenStore = new TokenStore(home);
  await tokenStore.write('gmail', { account: 'u', clientId: 'id', accessToken: 'secret-a', refreshToken: 'secret-r', expiresAt: 1, grantedScopes: ['scope'] });
  const io = ioFor({ tokenStore });
  assert.equal(await runCli(['auth-status', '--json'], io), 0);
  assert.ok(!io.readStdout().includes('secret-a'));
  assert.ok(!io.readStdout().includes('secret-r'));
  assert.ok(io.readStdout().includes('gmail'));
});

test('non-interactive auth refuses without --window and only launches with it', async () => {
  const nonTTY = () => Object.assign(Readable.from([]), { isTTY: false });
  const refused = ioFor({ stdin: nonTTY() });
  assert.equal(await runCli(['auth', '--json'], refused), 1);
  assert.equal(JSON.parse(refused.readStdout()).error.code, 'TERMINAL_REQUIRED');

  const launched = [];
  const io = ioFor({
    stdin: nonTTY(),
    launchAuth: async (argv) => { launched.push(argv); return { command: 'node cli.js auth --read-only', pid: 4321 }; },
  });
  assert.equal(await runCli(['auth', '--read-only', '--window', '--json'], io), 0);
  const content = JSON.parse(io.readStdout()).content;
  assert.equal(content.launched, true);
  assert.equal(content.pid, 4321);
  assert.deepEqual(launched[0], ['auth', '--read-only']);

  const invalid = ioFor({ stdin: nonTTY(), launchAuth: async () => { throw new Error('should not launch'); } });
  assert.equal(await runCli(['auth', '--window', '--services', 'nope', '--json'], invalid), 1);
  assert.match(invalid.readStdout(), /UNKNOWN_SERVICE|nope/);
});

