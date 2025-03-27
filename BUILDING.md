# Building the Apex Test Runner Extension

This document provides instructions for building the Apex Test Runner VS Code extension from source code.

## Prerequisites

- Node.js 14.x or higher
- npm 7.x or higher
- Visual Studio Code (for testing)

## Quick Build

The fastest way to build the extension with all the necessary files is:

```bash
# Clean, compile, and package in one command
npm run clean && npx tsc -p ./ --sourceMap false --removeComments true && npx vsce package --no-dependencies
```

This will:
1. Clean any previous build artifacts
2. Compile TypeScript to JavaScript without source maps and comments
3. Package the extension into a .vsix file

## Manual Build Steps

If you prefer to build step by step:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Clean previous build artifacts**:
   ```bash
   npm run clean
   ```

3. **Compile for production**:
   ```bash
   npm run compile:prod
   ```

4. **Package the extension**:
   ```bash
   npm run package
   ```

## Testing the Extension

After building, you can install the extension directly in VS Code:

```bash
code --install-extension vscode-apex-test-runner-0.0.1.vsix
```

## Extension Files

The extension package includes only necessary files:

- `out/`: Compiled JavaScript code
- `media/`: Images for the README
- `language-configuration.json`: Language configuration
- `README.md`: Documentation
- `LICENSE.md`: License information

## Troubleshooting

If you encounter build issues:

1. Try deleting `node_modules` and run `npm install` again
2. Ensure your Node.js is up to date
3. Check the VS Code Extension API compatibility

## Publishing

If you have publishing rights:

```bash
npm run publish
``` 