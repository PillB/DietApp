'use strict';
// P0.2 test: validate docs/source-inventory.json against reality.
// Non-tautological by design: after validating the real repo, re-run the same
// verifier against seeded fixture roots where (a) a recorded hash is wrong,
// (b) an entry claims git-tracked private data, (c) a listed file is missing —
// each expected to FAIL, proving the verifier is live evidence, not a rubber stamp.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');

function verifyInventory(root) {
  const inventoryPath = path.join(root, 'docs/source-inventory.json');
  const doc = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  assert.strictEqual(doc.schema, 'source-inventory/v1', 'inventory schema version must be v1');
  const problems = [];
  for (const e of doc.entries) {
    assert.match(e.sha256, /^[0-9a-f]{64}$/, `hash format invalid for ${e.path}`);
    const abs = path.join(root, e.path);
    if (!fs.existsSync(abs)) {
      problems.push(`listed artifact is missing on disk: ${e.path}`);
      continue;
    }
    if (e.gitTracked) problems.push(`private artifact is git-tracked (must never happen): ${e.path}`);
    const actual = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    if (actual !== e.sha256) problems.push(`sha256 drift for ${e.path}: inventory ${e.sha256.slice(0, 12)} != actual ${actual.slice(0, 12)}`);
  }
  return { doc, problems };
}

test('real repo inventory: schema valid, no tracked private artifacts, no hash drift', () => {
  const { problems } = verifyInventory(ROOT);
  assert.deepStrictEqual(problems, []);
});

function makeFixtureRoot(doc) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-fixture-'));
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/source-inventory.json'), JSON.stringify(doc));
  return dir;
}

function fixtureEntry(filePath, content, gitTracked = false) {
  return {
    path: filePath,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    sizeBytes: content.length,
    mediaType: 'text/plain',
    confidentiality: 'PRIVATE',
    gitTracked,
  };
}

test('seeded negative: a tampered artifact (hash mismatch) is detected', () => {
  const dir = makeFixtureRoot({
    schema: 'source-inventory/v1',
    entries: [fixtureEntry('AGENTS.md', bufferOf(path.join(ROOT, 'AGENTS.md')))],
  });
  try {
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), fs.readFileSync(path.join(ROOT, 'AGENTS.md')));
    assert.deepStrictEqual(verifyInventory(dir).problems, []);
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'tampered content\n');
    const { problems } = verifyInventory(dir);
    assert.strictEqual(problems.length, 1, JSON.stringify(problems));
    assert.match(problems[0], /sha256 drift for AGENTS\.md/, 'verifier must catch drift');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('seeded negative: git-tracked private artifact is rejected', () => {
  const dir = makeFixtureRoot({
    schema: 'source-inventory/v1',
    entries: [Object.assign(fixtureEntry('AGENTS.md', bufferOf(path.join(ROOT, 'AGENTS.md'))), { gitTracked: true })],
  });
  try {
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), fs.readFileSync(path.join(ROOT, 'AGENTS.md')));
    const { problems } = verifyInventory(dir);
    assert.strictEqual(problems.length, 1, JSON.stringify(problems));
    assert.match(problems[0], /git-tracked/, 'tracker check must fire');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('seeded negative: listed-but-missing artifact is reported', () => {
  const dir = makeFixtureRoot({
    schema: 'source-inventory/v1',
    entries: [fixtureEntry('does/not/exist.txt', Buffer.from('x'))],
  });
  try {
    const { problems } = verifyInventory(dir);
    assert.match(problems.join('\n'), /missing on disk: does\/not\/exist\.txt/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function bufferOf(file) {
  return fs.readFileSync(file);
}
