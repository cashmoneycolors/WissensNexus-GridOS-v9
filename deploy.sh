#!/usr/bin/env bash
set -euo pipefail

npm ci
npm run build

echo "Build fertig: dist/"
