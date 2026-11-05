#!/bin/bash
# doctor wrapper for the rulebook's `doctor` requirement
set -e
cd "$(dirname "$0")/.."
npm run build --silent
node scripts/doctor.mjs
