const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { listServices, getService, scopesFor, listOperations, getOperation } = require('../dist/catalog.js');
const expectedOperations = require('./fixtures/operations.json');

test('catalog exposes only ordinary Google API services and local operations', () => {
  const names = listServices().map((service) => service.name);
  for (const expected of ['gmail', 'drive', 'calendar', 'people', 'docs', 'sheets', 'slides', 'chat', 'classroom', 'tasks', 'forms', 'appscript', 'universal']) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
  for (const service of listServices()) {
    assert.ok(service.origins.every((origin) => origin === 'local' || /^https:\/\/[a-z0-9.-]+\.googleapis\.com$/.test(origin)));
    assert.ok(!service.origins.some((origin) => origin.includes('mcp')));
  }
  assert.throws(() => getService('third-party'), /unsupported/i);
});

test('service scopes include reads and write adds only write scopes', () => {
  const read = scopesFor([{ service: 'gmail', write: false }]);
  const write = scopesFor([{ service: 'gmail', write: true }]);
  assert.ok(read.includes('https://www.googleapis.com/auth/gmail.readonly'));
  assert.ok(write.includes('https://www.googleapis.com/auth/gmail.compose'));
  assert.ok(write.includes('https://www.googleapis.com/auth/gmail.modify'));
  for (const scope of read) assert.ok(write.includes(scope));
  assert.throws(() => scopesFor([]), /at least one/i);
});

test('every operation matches the hand-reviewed REST fixture and scope grant', () => {
  const actual = listServices().flatMap((service) => listOperations(service.name));
  assert.equal(actual.length, expectedOperations.length);
  const seen = new Set();
  for (const operation of actual) {
    const key = `${operation.service}.${operation.name}`;
    assert.ok(!seen.has(key), `duplicate ${key}`);
    seen.add(key);
    const expected = expectedOperations.find(([service, name]) => service === operation.service && name === operation.name);
    assert.ok(expected, `unexpected operation ${key}`);
    assert.equal(operation.method, expected[2], key);
    assert.equal(operation.origin, expected[3], key);
    assert.equal(operation.path, expected[4], key);
    assert.equal(operation.readOnly, expected[5], key);
    const service = getService(operation.service);
    const available = new Set([...service.readScopes, ...service.writeScopes]);
    if (operation.service === 'people') available.add('https://www.googleapis.com/auth/directory.readonly');
    for (const scope of operation.scopes) assert.ok(available.has(scope), `${key} scope ${scope} is not requested`);
    assert.equal(operation.kind, operation.service === 'universal' ? 'local' : 'rest');
  }
});

test('bulk discovery omits schemas and one-tool discovery returns exactly one schema', () => {
  const bulk = listOperations('gmail').map(({ name, description }) => ({ name, description }));
  assert.ok(bulk.length > 0);
  for (const tool of bulk) assert.deepEqual(Object.keys(tool), ['name', 'description']);
  const one = getOperation('gmail', 'search_messages');
  assert.equal(one.name, 'search_messages');
  assert.equal(one.inputSchema.type, 'object');
  assert.throws(() => getOperation('gmail', 'not_real'), /not found/i);
});

test('no MCP or preview implementation leaks into source', () => {
  const source = fs.readFileSync('src/catalog.ts', 'utf8') + listServices().map((service) => fs.readFileSync(`src/operations/${service.name}.ts`, 'utf8')).join('');
  assert.doesNotMatch(source, /@modelcontextprotocol|mcp\.googleapis\.com|\/mcp\/v1|Developer Preview Program/i);
});
