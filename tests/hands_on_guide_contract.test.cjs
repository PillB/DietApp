'use strict';
// Red-team contract for docs/HANDS_ON_GUIDE.md (the owner hands-on manual).
// Guards: (1) all four procedures present; (2) each has Prerequisites/Steps/Verification sections;
// (3) no unresolved placeholders; (4) every cited test/fixture path exists on disk.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const guide = fs.readFileSync(path.join(ROOT, 'docs/HANDS_ON_GUIDE.md'), 'utf8');

test('contract: the guide covers all four hands-on procedures (LEDGER-2, labels, LEDGER-5, LEDGER-7)', () => {
  for (const marker of [
    'Kitchen weigh-in', 'Brand-label capture', 'Store walk', 'Dedup decision',
  ]) assert.ok(guide.includes(marker), `missing procedure: ${marker}`);
});

test('contract: every procedure declares Prerequisites…Steps…Verification (in order)', () => {
  // split by procedure headings (## N.)
  const procedures = guide.split(/^## [0-9]+\./m).slice(1);
  assert.ok(procedures.length >= 4, 'four procedures expected');
  for (const proc of procedures) {
    const pre = proc.indexOf('What you need');
    const ver = proc.indexOf('Verification');
    const steps = proc.indexOf('**Steps');
    assert.ok(pre !== -1 && steps !== -1 && ver !== -1, 'procedure missing prereqs/steps/verification');
    assert.ok(pre < steps && steps < ver, 'procedure sections must be ordered prereqs → steps → verification');
  }
});

test('contract: no unresolved placeholders or invented numbers markers', () => {
  assert.ok(!guide.includes('TODO'), 'TODO placeholders forbidden in the shipped guide');
  assert.ok(!guide.includes('TBD'));
});

test('contract: every test path the guide cites exists on disk (referential integrity)', () => {
  const refs = [...guide.matchAll(/(tests\/[a-z_0-9]+\.test\.cjs|data\/fixtures\/[a-z0-9._-]+\.json|scripts\/[a-z0-9_.-]+\.cjs)/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4, 'the guide must cite its verification gates');
  for (const ref of refs) assert.ok(fs.existsSync(path.join(ROOT, ref)), `cited path missing on disk: ${ref}`);
});

test('contract: steps are numbered and consecutive within each procedure', () => {
  const procedures = guide.split(/^## [0-9]+\./m).slice(1);
  for (const proc of procedures) {
    const nums = [...proc.matchAll(/^([0-9]+)\. /gm)].map((m) => Number(m[1]));
    // each procedure's numbered steps must start at 1 and run consecutively
    const seq = nums.filter((n) => Number.isInteger(n));
    if (seq.length) {
      assert.strictEqual(seq[0], 1);
      assert.strictEqual(seq.length, seq[seq.length - 1], 'no gaps in step numbering');
    }
  }
});
