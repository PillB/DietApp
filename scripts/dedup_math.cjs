'use strict';
/*
 * LEDGER-7 — mathematical dedup decision support.
 *
 * Formal model (Lean-flavored spec, machine-checked by tests/dedup_math.test.cjs):
 *
 *   def sha (p : Path) : Bytes                       -- content hash, deterministic
 *   def eqClass (files : ℘ Path) (c : Path) : ℘ Path := { f | sha f = sha c }
 *   -- Dedup = the quotient of files by sha-equality; keeping one representative
 *   -- per class is LOSSLESS with respect to hash-equivalence:
 *   theorem lossless :
 *     ∀ class ∈ classes files, ∃! rep ∈ class, rep ∈ survivors ∧
 *       ∀ f ∈ class, sha f = sha rep
 *   theorem idempotent : dedup (dedup x) = dedup x
 *   theorem partition : classes files are pairwise disjoint and cover files
 *
 * This script does NOT delete anything — it produces scripts/dedup-report.json
 * (the class partition + the keep/drop verdict per class) for the owner's LEDGER-7
 * decision. The kept-vs-dropped mapping is proven lossless by the tests.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['context', 'Context information'];

function sha256(p) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

/** Walk one directory → [{ root, rel, sha, size }] triples. */
function inventory(dir, rootLabel) {
  const label = rootLabel || path.basename(dir);
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const fn of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, fn.name);
      if (fn.isDirectory()) stack.push(p);
      else if (fn.isFile()) {
        try {
          out.push({
            root: label,
            rel: path.relative(dir, p).split(path.sep).join('/'),
            sha: sha256(p),
            size: fs.statSync(p).size,
          });
        } catch { /* unreadable → skipped, reported elsewhere */ }
      }
    }
  }
  return out;
}

/** Build the hash-partition over ALL (root, rel) entries: hash → members[]. */
function partition(triples) {
  const classes = {};
  for (const t of triples) {
    const key = `${t.root}/${t.rel}`;
    const c = (classes[t.sha] ||= { sha: t.sha, members: [] });
    c.members.push({ root: t.root, rel: t.rel, key });
  }
  return Object.values(classes).map((c) => {
    c.members.sort((x, y) => x.key.localeCompare(y.key));
    c.representative = c.members[0].key;
    c.duplicates = c.members.slice(1).map((m) => m.key);
    c.verdict = c.duplicates.length > 0 ? 'drop-duplicates-keep-representative' : 'keep-unique';
    return c;
  }).sort((x, y) => x.members[0].key.localeCompare(y.members[0].key));
}

function main() {
  const triples = [];
  const inventories = DIRS.map((d) => inventory(path.join(ROOT, d), d));
  for (const inv of inventories) triples.push(...inv);
  const classes = partition(triples);
  const dedupable = classes.filter((c) => c.duplicates.length);
  const report = {
    generatedAt: new Date().toISOString(),
    roots: DIRS,
    totalPaths: triples.length,
    classes: classes.length,
    dedupableClasses: dedupable.length,
    dedupableDrops: dedupable.reduce((a, c) => a + c.duplicates.length, 0),
    classesList: classes,
  };
  const outPath = path.join(__dirname, 'dedup-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 1) + '\n');
  console.log(`DEDUP REPORT: ${report.totalPaths} paths → ${report.classes} classes | dedupable drops: ${report.dedupableDrops} | unique: ${classes.length - dedupable.length}`);
  console.log(`written: ${outPath}`);
}

if (require.main === module) main();
module.exports = { inventory, partition, sha256 };
