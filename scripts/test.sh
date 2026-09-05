#!/usr/bin/env bash
# Contract + behavior suite. No npm, no build — plain Node.
# Netlify runs this as the build command so a broken pin cannot publish.
set -euo pipefail
shopt -s nullglob
tests=(test/*.test.mjs)
if [[ ${#tests[@]} -eq 0 ]]; then
  echo "No test/*.test.mjs files found" >&2
  exit 1
fi
for t in "${tests[@]}"; do
  echo ":: group :: $t"
  node "$t"
done
echo "ALL PASS (${#tests[@]} files)"
