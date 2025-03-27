#!/bin/bash
# Script to build the Apex Test Runner VS Code extension

set -e  # Exit on any error

echo "🧹 Cleaning previous build artifacts..."
npm run clean

echo "🔧 Installing dependencies..."
npm install

echo "🔍 Trying to lint code (will continue if this fails)..."
npm run lint || echo "Linting failed, but continuing build..."

echo "🏗️ Compiling production build..."
npm run compile:prod

echo "📦 Packaging extension..."
npm run package

echo "✅ Build complete! Extension package is ready."
echo "📁 Extension file: $(ls *.vsix)"
echo ""
echo "To install the extension, run:"
echo "code --install-extension $(ls *.vsix)" 