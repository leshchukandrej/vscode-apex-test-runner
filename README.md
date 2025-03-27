# Apex Test Runner for VS Code

A Visual Studio Code extension that enables running Salesforce Apex tests directly from your editor. Run individual test methods, entire test classes, or view test results with detailed logs - all without leaving VS Code.

## Features

- 🎯 Run individual test methods
- 📁 Run all tests in a file
- 🔍 View test results with detailed logs
- ⚡ CodeLens integration for quick test execution
- 🔄 Automatic test discovery
- 💻 Context menu integration

![Apex Test Class](https://raw.githubusercontent.com/example/vscode-apex-test-runner/main/media/class.png)

## Prerequisites

- Visual Studio Code 1.60.0 or higher
- Salesforce CLI installed and authenticated
- Salesforce DX project

## Usage

### Running Tests

There are several ways to run tests:

1. **Using CodeLens**
   - Look for the "Run Test" and "Debug Test" links above test methods
   - Click the link to run or debug the test

   ![Running Tests with CodeLens](https://raw.githubusercontent.com/example/vscode-apex-test-runner/main/media/running_tests.png)

2. **Using Context Menu**
   - Right-click in a test file
   - Select "Apex: Run Single Test Method" or "Apex: Run All Tests in File"

3. **From Command Palette**
   - Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   - Type "Apex: Run" to see available test commands

### Test Results

Test results are displayed in a dedicated panel showing:
- Test execution status (Pass/Fail)
- Execution time
- Test coverage information
- Detailed logs
- Stack traces for failures

![Test Results Panel](https://raw.githubusercontent.com/example/vscode-apex-test-runner/main/media/results.png)

### Features in Detail

#### CodeLens Integration
CodeLens provides convenient "Run Test" and "Debug Test" links above each test method, making it easy to run tests without leaving your code.

#### Test Results Panel
The test results panel provides:
- Summary of test execution
- Detailed logs for each test
- Stack traces for failed tests
- Code coverage information
- Performance metrics

#### Test Analysis

The extension provides detailed analysis of test execution, including performance metrics and error details:

**Success Analysis**
![Success Analysis](https://raw.githubusercontent.com/example/vscode-apex-test-runner/main/media/success_analyze.png)

**Error Analysis**
![Error Analysis](https://raw.githubusercontent.com/example/vscode-apex-test-runner/main/media/error_analyze.png)

#### Context Menu Integration
Right-click in any Apex test file to access test running commands directly from the context menu.

## Extension Settings

This extension contributes the following settings:

* `apexTestRunner.showCodeLens`: Enable/disable CodeLens for test methods
* `apexTestRunner.defaultOrg`: Default org to use for running tests
* `apexTestRunner.logLevel`: Log level for test execution (ERROR, WARN, INFO, DEBUG, TRACE)

## Keyboard Shortcuts

You can add custom keyboard shortcuts in VS Code's keybindings.json:

```json
{
  "key": "ctrl+shift+t",
  "command": "apexTestRunner.runTest",
  "when": "editorLangId == apex"
}
```

## Known Issues

- Test execution might be slower in scratch orgs compared to production/sandbox orgs
- Large log files might impact performance

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Building from Source

### Simple One-Command Build (with dependencies included)

The simplest approach that works reliably (includes node_modules):

```bash
# Build with dependencies included (recommended)
./build-simple.sh
```

Or directly:

```bash
npm install && npm run compile:prod && node_modules/.bin/vsce package
```

### Alternative Build Options

```bash
# Clone the repository
git clone https://github.com/yourusername/vscode-apex-test-runner.git

# Install dependencies
npm install

# Quick build (all-in-one command)
npm run clean && npx tsc -p ./ --sourceMap false --removeComments true && npx vsce package --no-dependencies

# For step-by-step build
npm run clean        # Clean previous builds
npm run compile:prod # Compile TypeScript
npm run package      # Package the extension
```

For detailed build instructions, see [BUILDING.md](BUILDING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Release Notes

### 0.0.1
- Initial release
- Basic test running functionality
- CodeLens integration
- Test results panel
- Context menu integration

**Enjoy testing your Apex code directly in VS Code!** 🚀 