#!/bin/bash
# Minimal script to build production-ready VS Code extension package

set -e  # Exit on any error

echo "🧹 Cleaning previous build artifacts..."
rm -rf out
rm -f *.vsix

echo "🏗️ Compiling TypeScript..."
npx tsc -p ./ --sourceMap false --removeComments true

echo "📦 Packaging extension..."
npx vsce package --no-dependencies

echo "✅ Build complete! Extension package is ready."
echo "📁 Extension file: $(ls *.vsix)"
echo ""
echo "To install the extension, run:"
echo "code --install-extension $(ls *.vsix)" 