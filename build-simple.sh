#!/bin/bash
# Ultra simple build script

echo "Building extension with dependencies included..."
npm install && npm run compile:prod && node_modules/.bin/vsce package 