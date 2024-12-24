#!/bin/sh

set -euo pipefail

rm -v -rf -- ./builds/*
mkdir -p -- ./builds
npm run-script build -- --all --version "$(./bump_ver)" "$@"
mv -- ./builds/rikaitan-firefox-dev.zip ./builds/rikaitan-firefox-dev.xpi
