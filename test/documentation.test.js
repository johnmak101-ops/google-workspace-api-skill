const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const files = ['README.md', 'references/setup.md', 'references/public-setup.md', 'references/agent-playbook.md', 'references/console-setup-guide.md', 'references/workflows.md', 'SKILL.md', 'skill.yaml'];
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

test('public setup documents the audience switch and verification limits', () => {
  const doc = fs.readFileSync('references/public-setup.md', 'utf8');
  assert.match(doc, /Internal/);
  assert.match(doc, /External/);
  assert.match(doc, /test user/i);
  assert.match(doc, /org_internal/);
  assert.match(doc, /verification/i);
  assert.match(doc, /security assessment/i);
  assert.match(doc, /setup --client-secret-file/);
  assert.match(doc, /doctor/);
  assert.match(doc, /IAP OAuth Admin API/);
  assert.match(doc, /19 March 2026/);
});

test('agent playbook documents launch, polling, hand-off, and failure mapping', () => {
  const doc = fs.readFileSync('references/agent-playbook.md', 'utf8');
  assert.match(doc, /auth --window/);
  assert.match(doc, /auth-status/);
  assert.match(doc, /doctor/);
  assert.match(doc, /org_internal/);
  assert.match(doc, /LAUNCH_FAILED/);
  assert.match(doc, /19 March 2026/);
  assert.match(doc, /never/i);
});

test('console setup guide gives links, scopes, hand-off checks, and consent branches', () => {
  const doc = fs.readFileSync('references/console-setup-guide.md', 'utf8');
  assert.match(doc, /console\.cloud\.google\.com\/auth\/audience/);
  assert.match(doc, /Desktop app/);
  assert.match(doc, /setup --client-secret-file/);
  assert.match(doc, /auth --window/);
  assert.match(doc, /doctor/);
  assert.match(doc, /gmail\.readonly/);
  assert.match(doc, /can only be used within its organization/);
  assert.match(doc, /Never ask the user/i);
});
