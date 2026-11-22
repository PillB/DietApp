#!/bin/bash
# R3 — execute every regression layer, preserving portable diagnostic logs.
# Colons and other path-metacharacters in npm script names must not enter
# artifact filenames (GitHub upload-artifact rejects them cross-platform).
set -u
cd "$(dirname "$0")/.."
LOG_DIR="${R3_LOG_DIR:-/tmp}"
mkdir -p "$LOG_DIR" || exit 2
echo "=== R3 RELEASE REGRESSION — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
FAIL=0
for layer in test lint privacy check e2e staging live redteam redteam2 geometry audit boot:regression; do
  # npm script names are input data, not filesystem-safe names.
  safe_layer=$(printf '%s' "$layer" | tr -c '[:alnum:]_-' '_')
  logfile="$LOG_DIR/r3_${safe_layer}.log"
  echo "--- npm run $layer"
  if npm run -s "$layer" > "$logfile" 2>&1; then
    echo "PASS: $layer"
  else
    echo "FAIL: $layer (see $logfile)"
    FAIL=$((FAIL+1))
  fi
done
echo "=== R3 RESULT: $FAIL failed layers ==="
exit "$FAIL"
