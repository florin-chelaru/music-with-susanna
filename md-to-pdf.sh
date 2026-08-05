#!/bin/bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <input.md>" >&2
  exit 1
fi

input="$1"
output="${input%.md}.pdf"

npx md-to-pdf "$input"
echo "Generated: $output"
