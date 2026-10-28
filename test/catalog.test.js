const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listServices, getService, scopesFor } = require('../dist/catalog.js');

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
