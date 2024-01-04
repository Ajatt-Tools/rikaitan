#!/bin/sh

rm -v -rf -- ./builds/*
mkdir -p -- ./builds
npm run-script build -- --all --version "$(./bump_ver)" "$@"
