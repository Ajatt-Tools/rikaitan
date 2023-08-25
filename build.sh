#!/bin/sh

rm -v -- ./builds/*
./bump_ver
npm run-script build -- "$@"
