'use strict';
/**
 * Privacy leak scanner — P0.1 (docs/IMPLEMENTATION_ROADMAP.md).
 *
 * Scans only files that a GitHub Pages build would actually serve
 * (public build set) and reports evidence-typed leak findings WITHOUT
 * echoing the matched private text back into logs.
 *
 * Stdlib only; importable as a module for tests, runnable via CLI:
 *   node scripts/privacy_check.cjs            (exit 1 on any error-level finding)
 *   node scripts/privacy_check.cjs --root DIR (used by tests on fixture dirs)
 */
const fs = require('node:fs');
const path = require('path');

/** Private source artifacts whose names must never appear in public assets. */
const PRIVATE_FILE_NAMES = [
  'food_delivery_orders_extracted(2).xlsx',
  'dariush-mozaffarian-the-2025-2030-dietary-guidelines.pdf',
];

/** Directory references that would disclose private storage locations. */
const PRIVATE_PATH_PATTERNS = [
  'data/private/',
  'context/private/',
];

/** Name of the unreviewed order-derived analysis drop (gitignored at P0.1). */
const UNREVIEWED_CONTEXT_JSON = '2026-05-01-2026-10-26-flavor-profile-analysis.json';

/** Personal-data shapes that may not ship. Severity: error. */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

/** Peruvian mobile numbers: 9 digits starting with 9. Severity: warn (can false-positive). */
const PERU_MOBILE_RE = /(?<![\d,.])9\d{8}(?![\d,.])/g;

/**
 * Public build set: whitelist, explicit. If you publish a new static asset
 * directory, add it here — the default deny posture means new files under
 * the served root get scanned, but private dirs live OUTSIDE this set.
 */
function publicBuildFiles(root) {
  const explicit = ['index.html', 'manifest.webmanifest', 'service-worker.js', 'meal-plan-data.json', 'nutrition-reviewed.json'];
  const out = [];
  for (const rel of explicit) {
    const p = path.join(root, rel);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) out.push(rel);
  }
  const walk = (dir, prefix) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      else out.push(`${prefix}${entry.name}`);
    }
  };
  walk(path.join(root, 'assets'), 'assets/');
  walk(path.join(root, 'data/fixtures'), 'data/fixtures/');
  walk(path.join(root, 'context/generated'), 'context/generated/');
  return out;
}

/** One RLE of the content → typed findings. Never returns the matched text itself. */
function scanContent(rel, content) {
  const findings = [];
  const add = (type, severity, count) => { if (count > 0) findings.push({ file: rel, type, severity, count }); };
  for (const name of PRIVATE_FILE_NAMES) {
    add(`private_filename:${name}`, 'error', content.split(name).length - 1);
  }
  for (const frag of PRIVATE_PATH_PATTERNS) {
    add(`private_path:${frag}`, 'error', content.split(frag).length - 1);
  }
  add('unreviewed_context_json', 'error', content.split(UNREVIEWED_CONTEXT_JSON).length - 1);
  add('email', 'error', countRealEmails(content));
  add('peru_mobile_number', 'warn', (content.match(PERU_MOBILE_RE) || []).length);
  return findings;
}

/**
 * Count real emails, excluding semver-style package references inside URLs
 * (e.g. `unpkg.com/alpinejs@3.x.x/dist/cdn.min.js` matches a strict email
 * regex but is a version tag, not an address).
 */
function countRealEmails(content) {
  let n = 0;
  for (const m of content.matchAll(EMAIL_RE)) {
    if (m[0].endsWith('@') || m[0].length > 320) continue;
    const after = content[m.index + m[0].length];
    if (after === '/') continue; // "pkg@1.2.3/..." CDN path, not an address
    n++;
  }
  return n;
}

/**
 * Run the scan. Returns { root, filesScanned, findings }.
 * Findings with severity 'error' make the run failed.
 */
function run(root) {
  const files = publicBuildFiles(root);
  const findings = [];
  for (const rel of files) {
    const abs = path.join(root, rel);
    try {
      findings.push(...scanContent(rel, fs.readFileSync(abs, 'utf8')));
    } catch (err) {
      findings.push({ file: rel, type: 'unreadable', severity: 'error', count: 1, detail: String(err.code || err) });
    }
  }
  return {
    root,
    filesScanned: files.length,
    findings,
    errors: findings.filter((f) => f.severity === 'error'),
    clean: findings.every((f) => f.severity !== 'error'),
  };
}

module.exports = { run, scanContent, publicBuildFiles, countRealEmails, PRIVATE_FILE_NAMES, EMAIL_RE };

if (require.main === module) {
  const idx = process.argv.indexOf('--root');
  const root = idx !== -1 ? path.resolve(process.argv[idx + 1]) : path.resolve(__dirname, '..');
  const report = run(root);
  console.log(`Scanned ${report.filesScanned} public build file(s).`);
  for (const f of report.findings) {
    console.log(`[${f.severity.toUpperCase()}] ${f.file} :: ${f.type}${f.detail ? ' :: ' + f.detail : ''}`);
  }
  if (!report.findings.length) console.log('PRIVACY CHECK PASS: no leak patterns found in public build set.');
  process.exit(report.clean ? 0 : 1);
}
