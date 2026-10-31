#!/bin/bash
# R3 — final release regression: run EVERY layer in sequence, record results.
# Per docs/QA_RELEASE.md §pyramid + §reporting standard: exact commands + PASS/FAIL counts.
set -u
cd "$(dirname "$0")/.."
echo "=== R3 RELEASE REGRESSION — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
FAIL=0
for layer in test lint privacy check e2e staging live redteam redteam2 geometry audit; do
  echo "--- npm run $layer"
  if npm run -s $layer > /tmp/r3_$layer.log 2>&1; then
    echo "PASS: $layer"
  else
    echo "FAIL: $layer (see /tmp/r3_$layer.log)"
    FAIL=$((FAIL+1))
  fi
done
echo "=== R3 RESULT: $FAIL failed layers ==="
exit $FAIL
