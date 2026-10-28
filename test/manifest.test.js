const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Kimi, Claude, and OpenPave expose the same small command set', () => {
  const skill = fs.readFileSync('SKILL.md', 'utf8');
  const manifest = fs.readFileSync('skill.yaml', 'utf8');
  const entrypoint = fs.readFileSync('index.js', 'utf8');
  for (const command of ['services', 'tools', 'call', 'mutate', 'auth-status']) {
    assert.ok(skill.includes(command), `SKILL missing ${command}`);
    assert.ok(manifest.includes(`name: ${command}`), `manifest missing ${command}`);
  }
  assert.match(skill, /allowed-tools: Bash\(node \*\)/);
  assert.match(manifest, /pattern: sandbox/);
  assert.match(manifest, /entrypoint: index.js/);
  assert.match(manifest, /node: 24\.22\.x/);
  assert.match(entrypoint, /dist\/cli\.js/);
  assert.doesNotMatch(manifest, /name: auth\n/);
});

test('OpenPave network permissions include OAuth and every API origin', () => {
  const manifest = fs.readFileSync('skill.yaml', 'utf8');
  for (const domain of ['accounts.google.com', 'oauth2.googleapis.com', 'gmail.googleapis.com', 'people.googleapis.com', 'docs.googleapis.com', 'sheets.googleapis.com', 'slides.googleapis.com', 'chat.googleapis.com', 'classroom.googleapis.com', 'tasks.googleapis.com', 'forms.googleapis.com', 'script.googleapis.com', 'www.googleapis.com']) {
    assert.ok(manifest.includes(`- ${domain}`), `missing ${domain}`);
  }
});
