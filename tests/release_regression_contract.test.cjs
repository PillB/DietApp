'use strict';
// Negative-control integration test: run the REAL r3 shell script with an
// isolated fake npm executable; intentionally fail e2e and require the log.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function withHarness(failLayer, inspect) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dietapp-r3-'));
  const binary = path.join(dir, 'npm');
  const logs = path.join(dir, 'logs');
  try {
    fs.writeFileSync(binary, '#!/bin/sh\nprintf "script %s\\n" "$3"\nif [ "$3" = "$FAIL_LAYER" ]; then echo "seeded failed layer" >&2; exit 7; fi\n');
    fs.chmodSync(binary, 0o755);
    const run = spawnSync('bash', [path.join(__dirname, 'release_regression.sh')], {
      encoding: 'utf8',
      timeout: 15000,
      env: {
        ...process.env, PATH: dir + path.delimiter + process.env.PATH,
        FAIL_LAYER: failLayer, R3_LOG_DIR: logs,
      },
    });
    assert.equal(run.error, undefined, String(run.error));
    inspect({ run, logs, filenames: fs.readdirSync(logs) });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('r3 negative control: failing e2e is nonzero and preserves diagnostic log', () => {
  withHarness('e2e', ({ run, logs, filenames }) => {
    assert.equal(run.status, 1, run.stdout + run.stderr);
    assert.match(run.stdout, /FAIL: e2e/);
    assert.match(run.stdout, /R3 RESULT: 1 failed layers/);
    assert.match(fs.readFileSync(path.join(logs, 'r3_e2e.log'), 'utf8'), /seeded failed layer/);
    assert.equal(filenames.length, 12, 'all layers must leave independent logs');
  });
});

test('r3 platform gate: colon-bearing script names create portable artifact names', () => {
  withHarness('__none__', ({ run, logs, filenames }) => {
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.equal(filenames.some((name) => /[:<>|?*"\\]/.test(name)), false);
    assert.ok(filenames.includes('r3_boot_regression.log'), 'previous upload-artifact failure must not recur');
    assert.match(fs.readFileSync(path.join(logs, 'r3_boot_regression.log'), 'utf8'), /script boot:regression/);
  });
});
