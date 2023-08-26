#!/bin/sh

rm -v -rf -- ./builds/*
mkdir -p -- ./builds
./bump_ver
npm run-script build -- "$@"
