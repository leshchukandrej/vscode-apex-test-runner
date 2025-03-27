#!/bin/bash
# Build script for VS Code extension with dependencies included

set -e  # Exit on any error

echo "🧹 Cleaning previous build artifacts..."
rm -rf out
rm -f *.vsix

echo "🔧 Installing ALL dependencies (dev + production)..."
npm install

echo "🏗️ Compiling TypeScript..."
npm run compile:prod

echo "📦 Packaging extension with dependencies..."
# We'll use a direct path to vsce to avoid any issues
node_modules/.bin/vsce package

echo "✅ Build complete! Extension package with dependencies is ready."
echo "📁 Extension file: $(ls *.vsix)"
echo ""
echo "To install the extension, run:"
echo "code --install-extension $(ls *.vsix)"
echo ""
echo "Note: This package includes node_modules and is larger than a standard extension." 