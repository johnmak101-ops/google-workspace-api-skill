const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('CI verifies Windows, macOS, and Linux on Node 24.22.1', () => {
  const workflow = fs.readFileSync('.github/workflows/test.yml', 'utf8');
  for (const platform of ['windows-latest', 'macos-latest', 'ubuntu-latest']) {
    assert.ok(workflow.includes(platform), `missing ${platform}`);
  }
  assert.match(workflow, /node-version:\s*24\.22\.1/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm audit/);
});

test('documentation states cross-platform support and verification boundaries', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  assert.match(readme, /Windows, macOS, and Linux/);
  assert.match(readme, /GitHub Actions/);
});
