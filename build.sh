#!/bin/sh

rm -v -rf -- ./builds/*
mkdir -p -- ./builds
npm run-script build -- --all --rikaitan-version "$(./bump_ver)" "$@"
