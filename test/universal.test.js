const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { searchUniversal } = require('../dist/universal.js');
const { runCli } = require('../dist/cli.js');

function responses(calls) {
  return async (service, name, args) => {
    calls.push({ service, name, args });
    if (service === 'gmail') return { messages: [{ id: 'g1' }] };
    if (service === 'drive') return { files: [{ id: 'd1' }] };
    if (service === 'calendar') return { items: [{ id: 'c1' }] };
    if (service === 'chat' && name === 'list_spaces') return { spaces: [{ name: 'spaces/s1' }, { name: 'spaces/s2' }] };
    if (service === 'chat' && name === 'list_messages') return { messages: [{ text: args.spaceId === 's1' ? 'Needle in a message' : 'other' }] };
    throw new Error('unexpected');
  };
}

test('federated search uses bounded read operations across all products', async () => {
  const calls = [];
  const result = await searchUniversal({ query: 'Needle', pageSize: 2, spaceLimit: 1 }, responses(calls));
  assert.equal(result.results.length, 4);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(calls.find((call) => call.service === 'gmail').args, { query: 'Needle', pageSize: 2 });
  assert.equal(calls.find((call) => call.service === 'drive').args.query, "fullText contains 'Needle'");
  assert.equal(calls.find((call) => call.service === 'calendar').args.calendarId, 'primary');
  assert.equal(calls.find((call) => call.service === 'chat' && call.name === 'list_spaces').args.pageSize, 1);
  assert.equal(result.results.find((entry) => entry.service === 'chat').data[0].messages[0].text, 'Needle in a message');
});

test('one product failure preserves other results and redacts errors', async () => {
  const calls = [];
  const result = await searchUniversal({ query: 'Needle', products: ['gmail', 'drive'] }, async (service, name, args) => {
    if (service === 'drive') throw new Error('Bearer secret-token access_token=secret-value');
    return responses(calls)(service, name, args);
  });
  assert.equal(result.results.length, 1);
  assert.equal(result.errors.length, 1);
  assert.ok(!result.errors[0].message.includes('secret-token'));
  assert.ok(!result.errors[0].message.includes('secret-value'));
});

test('invalid products and limits are rejected before invocation', async () => {
  let called = false;
  const invoke = async () => { called = true; return {}; };
  await assert.rejects(searchUniversal({ query: 'x', products: ['forms'] }, invoke), /products/i);
  await assert.rejects(searchUniversal({ query: 'x', pageSize: 0 }, invoke), /pageSize/i);
  await assert.rejects(searchUniversal({ query: '' }, invoke), /query/i);
  assert.equal(called, false);
});

test('CLI dispatches universal search locally and rejects mutate', async () => {
  const calls = [];
  let out = '';
  const io = {
    stdout: (value) => { out += value; }, stderr: () => {}, env: {},
    stdin: Object.assign(Readable.from(['{"query":"Needle","products":["gmail"]}']), { isTTY: true }),
    api: { invoke: async (service, name, args) => responses(calls)(service, name, args) },
  };
  assert.equal(await runCli(['call', 'universal', 'search', '--json'], io), 0);
  assert.equal(calls[0].service, 'gmail');
  assert.equal(JSON.parse(out).status, 'ok');
  assert.equal(await runCli(['mutate', 'universal', 'search', '--json'], io), 1);
  assert.equal(calls.length, 1);
});
