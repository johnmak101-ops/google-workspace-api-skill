const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const files = ['README.md', 'references/setup.md', 'references/workflows.md', 'SKILL.md', 'skill.yaml'];
const text = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

test('setup uses ordinary APIs and a Desktop OAuth client without MCP or preview', () => {
  assert.match(text, /24\.22\.1/);
  assert.match(text, /Desktop app/);
  assert.match(text, /http:\/\/localhost:8080\/callback/);
  assert.match(text, /GOOGLE_OAUTH_CLIENT_SECRET_FILE/);
  assert.match(text, /ordinary (?:product )?APIs/i);
  assert.match(text, /Windows, macOS, and Linux/);
  assert.doesNotMatch(text, /mcp\.googleapis\.com|\/mcp\/v1|Developer Preview Program|Use this client for an AI-powered agent/i);
});

test('workflow documents consent, token lifecycle, safety, and account limits', () => {
  assert.match(text, /partial/i);
  assert.match(text, /seven days|7 days/i);
  assert.match(text, /revoke|revoked/i);
  assert.match(text, /untrusted/);
  assert.match(text, /never retry/i);
  assert.match(text, /same-project/i);
  assert.match(text, /administrator/i);
});
