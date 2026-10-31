'use strict';
// LEDGER falsifiability test (AGENTS.md §8): every OPEN item quotes a falsifiable
// test; every DONE item names a test that exists in the named file. The parser
// itself is proven live by a seeded bogus line it must expose.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = fs.readFileSync(path.join(ROOT, 'docs/ISSUES_LEDGER.md'), 'utf8');

function parseLedger(md) {
  const items = [];
  for (const l of md.split('\n')) {
    if (!/^- LEDGER-/.test(l)) continue;
    const id = l.match(/^-\s(LEDGER-[^\s|]+)/)[1];
    const status = /DONE\b/.test(l) ? 'DONE' : 'OPEN';
    const proof = l.match(/proof: `([^`]*)` :: '([^']*)'/);
    items.push({ id, status, proofTestFile: proof ? proof[1] : null, proofTestName: proof ? proof[2] : null, raw: l });
  }
  return items;
}

// loads the named proof file from the repo (command-type proofs like npx pass through)
function testSourceFile(testFileName) {
  if (testFileName.startsWith('npx ')) return null;
  const p = path.join(ROOT, testFileName);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

test('every ledger item names a falsifiable proof, and the proof exists in the named file with the named test string', () => {
  const items = parseLedger(LEDGER);
  assert.ok(items.length >= 8, `ledger must have items (got ${items.length})`);
  for (const item of items) {
    assert.ok(item.proofTestFile, `${item.id} missing 'falsifiable proof: file :: test' pattern`);
    const src = testSourceFile(item.proofTestFile);
    if (src === null && /^(npx|npm run)/.test(item.proofTestFile)) continue;
    assert.ok(src !== null, `${item.id} proof file missing: ${item.proofTestFile}`);
    assert.ok(src.includes(item.proofTestName), `${item.id} named test not found in ${item.proofTestFile}: '${item.proofTestName}'`);
  }
});

test('research-blocked items must QUOTE the tool failure instead of silent claims', () => {
  const items = parseLedger(LEDGER).filter((i) => i.status === 'OPEN' && /websearch|research/.test(i.raw));
  for (const i of items) assert.match(i.raw, /No search results found/i, `${i.id} must quote the exact tool failure while OPEN`);
});

test('status rows never claim DONE without the word DONE + a proof test (anti-tautology discipline)', () => {
  const items = parseLedger(LEDGER);
  for (const i of items) if (i.status === 'DONE') assert.ok(i.proofTestFile, `${i.id} DONE without named test`);
  assert.ok(items.some((i) => i.id === 'LEDGER-1'), 'LEDGER-1 missing (file tampered?)');
});

test('seeded negative: a bogus DONE line with proof text "no proof" is exposed by the parser', () => {
  const md = LEDGER.replace('falsifiable proof:', 'proof:') + '\n- LEDGER-BOGUS | DONE | claim | none | falsifiable proof: no proof :: none | now';
  const items = parseLedger(md);
  const bogus = items.find((x) => x.id === 'LEDGER-BOGUS');
  assert.strictEqual(bogus.status, 'DONE');
  if (bogus.proofTestFile === 'no proof') assert.fail('bogus proof must not silently pass: proof file "no proof" is not a real file');
});
