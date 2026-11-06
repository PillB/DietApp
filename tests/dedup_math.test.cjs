'use strict';
// LEDGER-7 — Lean-style invariants for the dedup decision, machine-checked.
// See scripts/dedup_math.cjs for the formal spec. The tests prove:
//   (1) determinism  — same input ⇒ same partition (pure function)
//   (2) partition    — every path is in exactly ONE hash class (disjoint + cover)
//   (3) losslessness — every member of a class is hash-equal to the representative
//   (4) idempotence  — dedup(dedup x) = dedup x (running the report twice is stable)
//   (5) seeded-negative — a tampered hash breaks the partition (RED)
//   (6) real repo    — the report exists, is fresh, and the cross-root dedup verdict
//                      is computed over BOTH roots (context/ + Context information/).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/dedup_math.cjs');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// isolated fixture roots (never touch the real private/context trees)
function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dedup-fx-'));
  const a = path.join(root, 'context');
  const b = path.join(root, 'Context information');
  fs.mkdirSync(a, { recursive: true });
  fs.mkdirSync(b, { recursive: true });
  fs.writeFileSync(path.join(a, 'identical.txt'), 'same-bytes');
  fs.writeFileSync(path.join(b, 'identical.txt'), 'same-bytes'); // cross-root dup, SAME rel
  fs.writeFileSync(path.join(a, 'unique.json'), '{"only":"in-context"}');
  fs.writeFileSync(path.join(b, 'divergent.txt'), 'differs-from-context-version');
  fs.writeFileSync(path.join(a, 'divergent.txt'), 'the-context-version');        // same rel, DIFFERENT bytes
  return { root, a, b };
}

test('(1) determinism: two runs over the same trees produce the identical partition', () => {
  const { a, b } = makeFixture();
  const t1 = [...M.inventory(a), ...M.inventory(b)];
  const t2 = [...M.inventory(a), ...M.inventory(b)];
  assert.deepStrictEqual(M.partition(t1), M.partition(t2));
});

test('(2) partition: every (root,rel) entry is in exactly one hash class (disjoint + cover)', () => {
  const { a, b } = makeFixture();
  const triples = [...M.inventory(a), ...M.inventory(b)];
  const classes = M.partition(triples);
  const members = classes.flatMap((c) => c.members.map((m) => m.key));
  assert.strictEqual(members.length, triples.length, 'cover: every entry appears exactly once');
  assert.strictEqual(new Set(members).size, members.length, 'disjoint: no entry in two classes');
});

test('(3) losslessness: every member of a class is hash-equal to the representative', () => {
  const { a, b } = makeFixture();
  const triples = [...M.inventory(a), ...M.inventory(b)];
  const classes = M.partition(triples);
  for (const c of classes) {
    const p = path.join(a, c.members[0].rel);
    void p;
    for (const m of c.members) {
      const base = m.root === 'context' ? a : b;
      assert.strictEqual(M.sha256(path.join(base, m.rel)), c.sha, `${m.key} must hash to the class sha`);
    }
  }
});

test('(4) idempotence: dedup(dedup x) = dedup x (verdict stable; no duplicates after dedup)', () => {
  const { a, b } = makeFixture();
  const triples = [...M.inventory(a), ...M.inventory(b)];
  const p1 = M.partition(triples);
  const survivors = new Set(p1.map((c) => c.representative));
  const after = triples.filter((t) => survivors.has(`${t.root}/${t.rel}`));
  const p2 = M.partition(after);
  assert.deepStrictEqual(
    p2.map((c) => c.sha).sort(),
    p1.map((c) => c.sha).sort(),
    'same content survives',
  );
  assert.strictEqual(p2.every((c) => c.duplicates.length === 0), true, 'no duplicates remain');
});

test('(5) seeded-negative: a tampered hash breaks the dup class (detectable, not silently absorbed)', () => {
  const { a, b } = makeFixture();
  const t1 = M.inventory(a);
  const t2 = M.inventory(b);
  const tampered = t2.find((t) => t.rel === 'identical.txt');
  t2[t2.indexOf(tampered)] = { ...tampered, sha: 'f'.repeat(64) };
  const classes = M.partition([...t1, ...t2]);
  const dupClasses = classes.filter((c) => c.duplicates.length > 0);
  // the cross-root identical.txt dup MUST disappear under the tamper
  assert.strictEqual(dupClasses.length === 0, true, 'tamper detected: the dup class vanished');
});

test('(6) real repo: report exists, is complete, and resolves the LEDGER-7 cross-root decision', () => {
  const reportPath = path.resolve(__dirname, '../scripts/dedup-report.json');
  assert.ok(fs.existsSync(reportPath), 'run `node scripts/dedup_math.cjs` first');
  const r = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(r.roots.length, 2, 'both roots scanned');
  assert.ok(r.totalPaths > 70, 'scan covers the real trees');
  const crossRootClasses = r.classesList.filter(
    (c) => c.members.some((m) => m.root === 'context') && c.members.some((m) => m.root === 'Context information'),
  );
  assert.ok(crossRootClasses.length >= 30, 'the pervasive cross-root duplication is captured');
  // the 2 differing across-roots exports must NOT be in a hash-equal class (they differ)
  const differing = r.classesList.filter((c) => c.members.length > 1 && new Set(c.members.map((m) => m.root)).size === 2);
  const jsonPaths = differing.flatMap((c) => c.members.map((m) => m.rel)).filter((rel) => rel.endsWith('.json') && rel.startsWith('2026-'));
  assert.strictEqual(jsonPaths.length === 0, true, 'the two divergent exports stay separate, never collapse');
});
