const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getOperation } = require('../dist/catalog.js');
const { prepareRequest } = require('../dist/request.js');

test('friendly Gmail arguments map to Google wire names', () => {
  const result = prepareRequest(getOperation('gmail', 'search_messages'), { query: 'is:unread', pageSize: 1 });
  assert.equal(result.url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is%3Aunread&maxResults=1');
  assert.equal(result.method, 'GET');
  assert.equal(result.body, undefined);
});

test('path IDs are encoded and cannot inject another origin', () => {
  const result = prepareRequest(getOperation('gmail', 'get_message'), { messageId: 'a/b?x=https://evil.example' });
  assert.equal(result.url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/a%2Fb%3Fx%3Dhttps%3A%2F%2Fevil.example');
});

test('Drive defaults supply recent ordering, media download, and multipart upload', () => {
  const recent = prepareRequest(getOperation('drive', 'list_recent_files'), {});
  assert.equal(new URL(recent.url).searchParams.get('orderBy'), 'modifiedTime desc');
  const download = prepareRequest(getOperation('drive', 'download_file_content'), { fileId: 'file-1' });
  assert.equal(new URL(download.url).searchParams.get('alt'), 'media');
  const create = prepareRequest(getOperation('drive', 'create_file'), { metadata: { name: 'a.txt', mimeType: 'text/plain' }, contentBase64: Buffer.from('hello').toString('base64'), mimeType: 'text/plain' });
  assert.equal(new URL(create.url).searchParams.get('uploadType'), 'multipart');
  assert.match(create.headers['content-type'], /^multipart\/related; boundary=/);
  assert.match(create.body.toString('utf8'), /"name":"a.txt"/);
  assert.match(create.body.toString('utf8'), /aGVsbG8=/);
});

test('People field lists use commas and Classroom states repeat', () => {
  const profile = prepareRequest(getOperation('people', 'get_user_profile'), { personFields: ['names', 'emailAddresses'] });
  assert.equal(new URL(profile.url).searchParams.get('personFields'), 'names,emailAddresses');
  const courses = prepareRequest(getOperation('classroom', 'list_courses'), { courseStates: ['ACTIVE', 'ARCHIVED'] });
  assert.deepEqual(new URL(courses.url).searchParams.getAll('courseStates'), ['ACTIVE', 'ARCHIVED']);
});

test('nested JSON bodies retain only declared root fields', () => {
  const result = prepareRequest(getOperation('calendar', 'create_event'), {
    calendarId: 'primary', summary: 'Review', start: { dateTime: '2026-10-29T10:00:00Z' }, end: { dateTime: '2026-10-29T11:00:00Z' },
  });
  assert.deepEqual(JSON.parse(result.body), { summary: 'Review', start: { dateTime: '2026-10-29T10:00:00Z' }, end: { dateTime: '2026-10-29T11:00:00Z' } });
  assert.equal(result.headers['content-type'], 'application/json');
});

test('unknown, missing, wrongly typed, and null arguments fail before dispatch', () => {
  assert.throws(() => prepareRequest(getOperation('gmail', 'search_messages'), { url: 'https://evil.example' }), /unknown/i);
  assert.throws(() => prepareRequest(getOperation('gmail', 'get_message'), {}), /messageId/i);
  assert.throws(() => prepareRequest(getOperation('gmail', 'search_messages'), { pageSize: '1' }), /pageSize/i);
  assert.throws(() => prepareRequest(getOperation('gmail', 'search_messages'), { query: null }), /query/i);
});

test('local operations and oversized bodies are rejected', () => {
  assert.throws(() => prepareRequest(getOperation('universal', 'search'), { query: 'x' }), /local/i);
  assert.throws(() => prepareRequest(getOperation('drive', 'create_file'), {
    metadata: { name: 'large.bin' }, contentBase64: Buffer.alloc(1_100_000, 65).toString('base64'),
  }), /too large|1 MB/i);
});
