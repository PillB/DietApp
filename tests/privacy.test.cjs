'use strict';
// P0.1 privacy leak scan test (node --test). Pure stdlib.
// Positive case: pristine repo public build set scans clean.
// Negative cases: seeded leaks in a fixture dir ARE detected (proves the
// scanner can fail — an audit test that can never fail is not evidence).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('path');
const { run } = require('../scripts/privacy_check.cjs');

const ROOT = path.resolve(__dirname, '..');

function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'privacy-fixture-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  }
  return dir;
}

test('CDN version tags like alpinejs@3.x.x/dist are not flagged as emails', () => {
  const dir = makeFixture({
    'index.html': '<script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js">',
  });
  try {
    const report = run(dir);
    assert.strictEqual(report.errors.filter((f) => f.type === 'email').length, 0, JSON.stringify(report.errors));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('pristine public build set scans clean (no error findings)', () => {
  const report = run(ROOT);
  assert.ok(report.filesScanned >= 5, `expected at least the explicit public files, got ${report.filesScanned}`);
  assert.deepStrictEqual(
    report.errors,
    [],
    `unexpected error findings: ${JSON.stringify(report.errors.map((e) => `${e.file}:${e.type}`))}`
  );
});

test('private workbook name in a public asset is flagged as error with no echoed text', () => {
  const dir = makeFixture({ 'assets/js/leak.js': 'fetch("data/private/food_delivery_orders_extracted(2).xlsx")' });
  try {
    const report = run(dir);
    assert.strictEqual(report.clean, false);
    const hit = report.errors.find((f) => f.type === 'private_filename:food_delivery_orders_extracted(2).xlsx');
    assert.ok(hit, 'workbook filename leak must be detected');
    assert.strictEqual(hit.file, 'assets/js/leak.js');
    assert.strictEqual(hit.severity, 'error');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('email address in public asset is flagged as error; clean file is not', () => {
  const dir = makeFixture({
    'assets/js/contact.js': 'const email = "compras.wong@gmail.com";',
    'assets/js/clean.js': 'const x = 42;',
  });
  try {
    const report = run(dir);
    assert.strictEqual(report.errors.length, 1);
    assert.strictEqual(report.errors[0].file, 'assets/js/contact.js');
    assert.strictEqual(report.errors[0].type, 'email');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('unreviewed order-derived context JSON reference is flagged', () => {
  const dir = makeFixture({ 'assets/js/data.js': 'const an = fetch("2026-05-01-2026-10-26-flavor-profile-analysis.json");' });
  try {
    const report = run(dir);
    const hit = report.errors.find((f) => f.type === 'unreviewed_context_json');
    assert.ok(hit, 'unreviewed context analysis must not ship');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scan findings never contain the matched secret text', () => {
  const dir = makeFixture({ 'assets/js/mail.js': '"someone@rappi.pe"' });
  try {
    const report = run(dir);
    assert.strictEqual(report.errors.length, 1);
    assert.ok(!JSON.stringify(report.findings).includes('someone@rappi.pe'), 'findings must not echo raw leak text');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
