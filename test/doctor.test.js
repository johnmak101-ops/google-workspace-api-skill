const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { ApiError } = require('../dist/api-error.js');
const { runCli } = require('../dist/cli.js');
const { runDoctor } = require('../dist/doctor.js');
const { WorkspaceError } = require('../dist/errors.js');

function ioFor(api) {
  let out = '';
  return {
    stdout: (value) => { out += value; }, stderr: () => undefined,
    stdin: Object.assign(Readable.from([]), { isTTY: true }),
    env: {}, api, readStdout: () => out,
  };
}

test('doctor separates enabled, disabled, unauthorized, forbidden, and failed services', async () => {
  const behavior = {
    gmail: async () => ({ labels: [] }),
    drive: async () => {
      throw new ApiError(403, 'Google Drive API has not been used in project 123 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=123 then retry.');
    },
    calendar: async () => { throw new WorkspaceError('AUTH_REQUIRED', 'Authentication required for calendar. Run the auth command.'); },
    people: async () => { throw new ApiError(403, 'The caller does not have permission'); },
    tasks: async () => { throw new ApiError(500, 'boom'); },
    chat: async () => ({}),
    classroom: async () => ({}),
  };
  const report = await runDoctor(async (service) => behavior[service]());
  const byService = Object.fromEntries(report.checks.map((check) => [check.service, check]));
  assert.equal(byService.gmail.status, 'enabled');
  assert.equal(byService.drive.status, 'disabled');
  assert.match(byService.drive.enableUrl, /drive\.googleapis\.com\/overview\?project=123$/);
  assert.equal(byService.calendar.status, 'unauthorized');
  assert.equal(byService.people.status, 'forbidden');
  assert.equal(byService.tasks.status, 'error');
  assert.equal(byService.chat.status, 'enabled');
  assert.equal(report.skipped.length, 5);
  assert.ok(report.skipped.some((entry) => entry.service === 'sheets'));
});

test('doctor exits non-zero when a probed service is not usable', async () => {
  const api = { invoke: async (service) => { if (service === 'drive') throw new ApiError(403, 'Google Drive API has not been used in project 1 before or it is disabled.'); return {}; } };
  const io = ioFor(api);
  assert.equal(await runCli(['doctor', '--json'], io), 1);
  const content = JSON.parse(io.readStdout()).content;
  assert.equal(content.checks.find((check) => check.service === 'drive').status, 'disabled');

  const healthy = ioFor({ invoke: async () => ({}) });
  assert.equal(await runCli(['doctor', '--json'], healthy), 0);
  assert.equal(JSON.parse(healthy.readStdout()).content.checks.length, 7);
});
