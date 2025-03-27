import * as vscode from 'vscode';
import { TestResultsView } from './testResultsView';
import { ApexTestCodeLensProvider } from './testCodeLensProvider';
import { LogAnalyzerHandler } from './logAnalyzerHandler';
import { SalesforceClient } from './salesforceClient';

/**
 * Main controller class for the Apex Test Runner extension
 */
class ApexTestRunner {
    private context: vscode.ExtensionContext;
    private salesforceClient: SalesforceClient;
    private disposables: vscode.Disposable[] = [];
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.salesforceClient = new SalesforceClient();
    }
    
    /**
     * Initialize the extension, register commands and providers
     */
    public initialize(): void {
        console.log('Apex Test Runner extension is now active!');
        
        // Register CodeLens provider
        this.registerCodeLensProvider();
        
        // Register commands
        this.registerCommands();
    }
    
    /**
     * Register the CodeLens provider for Apex files
     */
    private registerCodeLensProvider(): void {
        console.log('Registering CodeLens provider for Apex files...');
        
        const codeLensProvider = new ApexTestCodeLensProvider();
        const codeLensDisposable = vscode.languages.registerCodeLensProvider(
            { language: 'apex', scheme: 'file' },
            codeLensProvider
        );
        
        this.disposables.push(codeLensDisposable);
        console.log('CodeLens provider registered successfully');
    }
    
    /**
     * Register all commands for the extension
     */
    private registerCommands(): void {
        // Register all commands
        this.registerCommand('apexTestRunner.runTestFromLens', this.runTestFromLens.bind(this));
        this.registerCommand('apexTestRunner.runSpecificTests', this.runSpecificTests.bind(this));
        this.registerCommand('apexTestRunner.runTest', this.runTest.bind(this));
        this.registerCommand('apexTestRunner.runFile', this.runFile.bind(this));
        this.registerCommand('apex-test-runner.runAllTests', this.runAllTests.bind(this));
        this.registerCommand('apex-test-runner.runFailedTests', this.runFailedTests.bind(this));
        this.registerCommand('apex-test-runner.goToTestMethod', this.goToTestMethod.bind(this));
        
        // Add disposables to context
        this.context.subscriptions.push(...this.disposables);
    }
    
    /**
     * Helper method to register a command
     */
    private registerCommand(commandId: string, handler: (...args: any[]) => any): void {
        const disposable = vscode.commands.registerCommand(commandId, handler);
        this.disposables.push(disposable);
    }
    
    /**
     * Command handler: Run a test method from CodeLens
     */
    private async runTestFromLens(uri: vscode.Uri, methodName: string): Promise<void> {
        console.log(`Running test method: ${methodName} from file: ${uri.fsPath}`);
        if (uri) {
            await this.runApexTest(uri.fsPath, methodName);
        }
    }
    
    /**
     * Command handler: Run specific test methods (for retry functionality)
     */
    private async runSpecificTests(uri: vscode.Uri, methodNames: string): Promise<void> {
        console.log(`Running specific test methods: ${methodNames} from file: ${uri.fsPath}`);
        if (uri) {
            await this.runApexTest(uri.fsPath, methodNames);
        }
    }
    
    /**
     * Command handler: Run a test method selected via QuickPick
     */
    private async runTest(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'apex') {
            vscode.window.showErrorMessage('This command only works with Apex files');
            return;
        }

        // Get the current file content
        const text = document.getText();
        
        // Simple regex to find test methods
        const testMethodRegex = /@IsTest\s+(?:static\s+)?(?:void|String|Integer|Boolean|Object)\s+(\w+)/g;
        const matches = [...text.matchAll(testMethodRegex)];
        
        if (matches.length === 0) {
            vscode.window.showErrorMessage('No test methods found in this file');
            return;
        }

        // Create QuickPick items for each test method
        const items = matches.map(match => ({
            label: match[1],
            description: `Run test method ${match[1]}`
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select test method to run'
        });

        if (selected) {
            await this.runApexTest(document.fileName, selected.label);
        }
    }
    
    /**
     * Command handler: Run all tests in a file
     */
    private async runFile(uri?: vscode.Uri): Promise<void> {
        if (uri) {
            await this.runApexTest(uri.fsPath);
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'apex') {
            vscode.window.showErrorMessage('This command only works with Apex files');
            return;
        }

        await this.runApexTest(document.fileName);
    }
    
    /**
     * Command handler: Run all tests in current file
     */
    private async runAllTests(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'apex') {
            vscode.window.showErrorMessage('This command only works with Apex files');
            return;
        }

        await this.runApexTest(document.fileName);
    }
    
    /**
     * Command handler: Run failed tests
     */
    private async runFailedTests(): Promise<void> {
        vscode.window.showInformationMessage('Select a failed test from the Test Results view to retry');
    }
    
    /**
     * Command handler: Go to test method in code
     */
    private async goToTestMethod(className: string, methodName: string): Promise<void> {
        // Find the file containing the test method
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        
        // Try to find the file with the class name
        const filePattern = new vscode.RelativePattern(workspaceFolders[0], `**/${className}.cls`);
        const files = await vscode.workspace.findFiles(filePattern);
        
        if (files.length === 0) {
            vscode.window.showErrorMessage(`Could not find file for class: ${className}`);
            return;
        }
        
        // Open the file
        const document = await vscode.workspace.openTextDocument(files[0]);
        const editor = await vscode.window.showTextDocument(document);
        
        // Find the test method in the file
        const text = document.getText();
        const methodPattern = new RegExp(`@IsTest[\\s\\S]*?${methodName}\\s*\\(`, 'i');
        const methodMatch = methodPattern.exec(text);
        
        if (methodMatch) {
            const position = document.positionAt(methodMatch.index);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
                new vscode.Range(position, position),
                vscode.TextEditorRevealType.InCenter
            );
        }
    }
    
    /**
     * Core function to run Apex tests
     */
    private async runApexTest(filePath: string, methodName?: string): Promise<void> {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.text = '$(testing-loading-icon) Running Apex tests...';
        statusBarItem.show();

        // Create test results view and show loading spinner
        const resultsView = TestResultsView.show(this.context);
        
        let debugLog = '';

        try {
            // Extract class name from file path
            const classNameRaw = filePath.split('/').pop()?.replace('.cls', '');
            
            if (!classNameRaw) {
                throw new Error('Could not determine class name');
            }
            
            // Run the test through the Salesforce client
            const testOutput = await this.salesforceClient.runApexTest(classNameRaw, methodName);
            
            if (!testOutput) {
                throw new Error('No test output received');
            }
            
            // Parse the test results
            const testResults = JSON.parse(testOutput);

            // Get additional information from logs if test results exist
            if (testResults?.result?.tests?.length > 0) {
                debugLog = await this.retrieveTestLogs(testResults);
            }
            
            // Display the test results in the UI
            this.handleTestResults(testResults, resultsView, debugLog, statusBarItem);
        } catch (error) {
            this.handleTestError(error, resultsView, debugLog, statusBarItem);
        }
    }
    
    /**
     * Retrieve logs for test execution
     */
    private async retrieveTestLogs(testResults: any): Promise<string> {
        try {
            const testStartTime = testResults?.result?.summary?.testStartTime;
            let apexClassIds = new Set<string>();

            testResults?.result?.tests?.forEach((test: any) => {
                apexClassIds.add(test.ApexClass.Id);
            });

            console.log(`Class IDs: ${Array.from(apexClassIds).join(', ')}`);

            // Pull the logs for all apex class ids using query
            if (apexClassIds.size > 0) {
                // Create a time range for filtering test results
                const testStartDate = testStartTime ? new Date(testStartTime) : new Date();
                testStartDate.setSeconds(testStartDate.getSeconds() - 30); // 30 seconds before test start
                const startTimeStr = testStartDate.toISOString();
                
                const endDate = new Date(testStartDate);
                endDate.setMinutes(endDate.getMinutes() + 10); // 10 minutes after test start
                const endTimeStr = endDate.toISOString();
                
                // Query for test results and logs
                const queryResults = await this.salesforceClient.queryTestResults(
                    Array.from(apexClassIds),
                    startTimeStr,
                    endTimeStr
                );

                const setupMethodByClass = new Map<string, string>();
                
                queryResults.result.records.forEach((record: any) => {
                    if (record.IsTestSetup) {
                        setupMethodByClass.set(record.ApexClass.Name, record.MethodName);
                    }
                });

                console.log(`Setup method by class: ${JSON.stringify(setupMethodByClass)}`);

                // Add setup method info to test results
                testResults.result.tests.forEach((test: any) => {
                    const setupMethod = setupMethodByClass.get(test.ApexClass.Name);
                    if (setupMethod) {
                        test.SetupMethod = setupMethod;
                    }
                });

                const logId = queryResults.result.records.find((record: any) => record.ApexLogId)?.ApexLogId;
                
                if (logId) {
                    // Get log content
                    return await this.salesforceClient.getLogContent(logId);
                } else {
                    return 'No logs found';
                }
            }
        } catch (error) {
            console.error('Error retrieving logs:', error);
            return 'Error retrieving logs';
        }
        
        return '';
    }
    
    /**
     * Handle errors during test execution
     */
    private handleTestError(error: unknown, resultsView: TestResultsView | undefined, debugLog: string, statusBarItem: vscode.StatusBarItem): void {
        let errorMessage: string;
        
        // Sanitize error messages to prevent implementation details leakage
        if (error instanceof Error) {
            // Create generic error messages for specific cases
            if (error.message.includes('Command failed')) {
                errorMessage = 'Failed to run test. Please check your connection and try again.';
            } else if (error.message.includes('INVALID_ID_FIELD')) {
                errorMessage = 'Invalid Salesforce ID format.';
            } else if (error.message.includes('INVALID_FIELD')) {
                errorMessage = 'Invalid field in query.';
            } else if (error.message.includes('MALFORMED_QUERY')) {
                errorMessage = 'Invalid query format.';
            } else if (error.message.includes('Invalid characters')) {
                errorMessage = error.message; // We can show our own validation errors
            } else if (error.message.includes('Could not determine class name')) {
                errorMessage = error.message; // This is also a safe message
            } else if (error.message.includes('Failed to parse test results')) {
                errorMessage = 'Unable to process test results. Please try again.';
            } else {
                // Generic message for other cases to avoid leaking info
                errorMessage = 'An error occurred while running tests.';
                console.error('Original error:', error.message); // Log the original error for debugging
            }
        } else {
            errorMessage = 'An unexpected error occurred.';
        }
        
        // Show execution errors in the results view
        const errorHtml = `
            <div class="error-summary">
                <h3>Test Execution Failed</h3>
                <div class="error-message">
                    <strong>Error:</strong><br/>
                    ${errorMessage}
                </div>
            </div>
        `;
        resultsView?.updateContent(errorHtml, debugLog);
        statusBarItem.hide();
        vscode.window.showInformationMessage('Test run failed. Check results in the Test Results view.');
    }
    
    /**
     * Handle successful test results
     */
    private handleTestResults(testResults: any, resultsView: TestResultsView | undefined, debugLog: string, statusBarItem: vscode.StatusBarItem): void {
        // Format test results as HTML
        const formattedResults = this.formatTestResultsAsHtml(testResults, debugLog);

        // Update the webview with results and logs
        resultsView?.updateContent(formattedResults, debugLog);

        statusBarItem.hide();
        
        // Show a simple notification without modal
        if (testResults.result.summary.outcome === 'Passed') {
            vscode.window.showInformationMessage('Test run completed successfully.');
        } else {
            vscode.window.showInformationMessage('Test run completed. Check results in the Test Results View.');
        }
    }
    
    /**
     * Format test results as HTML for display
     */
    private formatTestResultsAsHtml(results: any, debugLog: string): string {
        const summary = results.result.summary;
        const tests = results.result.tests || [];

        let html = `<div class="summary">
            <h3>Test Results</h3>
            <div class="status ${summary.outcome === 'Passed' ? 'success' : 'failure'}">
                <h4>Status: ${summary.outcome}</h4>
                <div class="details">
                    <p>Tests Run: ${summary.testsRun}</p>
                    <p>Passing: ${summary.passing}</p>
                    <p>Failing: ${summary.failing}</p>
                    <p>Pass Rate: ${summary.passRate}</p>
                    <p>Execution Time: ${summary.testExecutionTime}</p>
                </div>
            </div>
            <div class="test-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="action-button" onclick="retryAllTests()">Run All Tests in ${tests.length > 0 ? tests[0].ApexClass.Name : 'Class'}</button>
                ${summary.failing > 0 ? `<button class="action-button" onclick="retryFailedTests()">Retry Failed Tests</button>` : ''}
            </div>
        </div>`;

        // Add test methods list
        if (tests.length > 0) {
            html += `
                <div class="test-methods-list">
                    <h3>Test Methods</h3>
                    <ul>
                        ${tests.map((test: any) => {
                            // Filter logs for this specific test method
                            const methodLogs = this.filterLogsForMethod(debugLog, test.ApexClass.Name, test.MethodName, test.SetupMethod);
                            
                            return `<li onclick="viewMethodLogData('${test.ApexClass.Name}-${test.MethodName}')" class="${test.Outcome === 'Pass' ? 'success' : 'failure'}" data-method-id="${test.ApexClass.Name}-${test.MethodName}" data-method-name="${test.ApexClass.Name}.${test.MethodName}" data-setup-method="${test.SetupMethod || ''}">
                                <div class="method-name" >
                                    ${test.MethodName}() <span class="method-result">${test.Outcome} (${test.RunTime}ms)</span> <span class="toggle-icon">▶</span>
                                </div>
                                ${test.Outcome !== 'Pass' ? `<div class="test-error-message">${test.Message?.replace('System.AssertException: ', '').trim() || 'Test failed without specific message'}</div>` : ''}
                                ${test.SetupMethod ? `<div class="setup-method-info">Setup Method: ${test.SetupMethod}</div>` : ''}
                                <div id="log-${test.ApexClass.Name}-${test.MethodName}" style="display:none;" class="method-log-data">
                                    <pre>${methodLogs || 'No specific logs found for this method.'}</pre>
                                </div>
                            </li>`;
                        }).join('')}
                    </ul>
                </div>`;
        }

        return html;
    }
    
    /**
     * Filter logs to show only the entries relevant to a specific test method and its setup
     */
    private filterLogsForMethod(debugLog: string, className: string, methodName: string, setupMethodName?: string): string {
        if (!debugLog || debugLog === 'No logs found') {
            return 'No logs available for this method.';
        }
        
        // Validate inputs
        if (typeof className !== 'string' || typeof methodName !== 'string' || 
            (setupMethodName !== undefined && typeof setupMethodName !== 'string')) {
            return 'Invalid inputs for log filtering.';
        }
        
        // Sanitize inputs for use in string includes() to avoid regex DoS
        const safeClassName = className.replace(/[^a-zA-Z0-9_\.]/g, '');
        const safeMethodName = methodName.replace(/[^a-zA-Z0-9_\.]/g, '');
        const safeSetupMethodName = setupMethodName ? setupMethodName.replace(/[^a-zA-Z0-9_\.]/g, '') : '';
        
        // Add size limits to prevent excessive memory usage
        const MAX_LOG_SIZE = 1024 * 1024; // 1MB
        if (debugLog.length > MAX_LOG_SIZE) {
            return 'Log is too large to display. Please check the raw logs on Salesforce.';
        }

        // Split log into lines for processing
        const logLines = debugLog.split('\n');
        
        // Limit number of lines to prevent excessive processing
        const MAX_LINES = 50000;
        if (logLines.length > MAX_LINES) {
            return 'Log is too large to display. Please check the raw logs on Salesforce.';
        }
        
        let filteredLines: string[] = [];
        let inSetupMethod = false;
        let inTestMethod = false;
        let setupMethodSections: string[] = [];
        let testMethodSections: string[] = [];
        let currentSection: string[] = [];
        let lastCodeUnitStarted = '';

        // Process each line to find method boundaries and capture relevant sections
        for (let i = 0; i < logLines.length; i++) {
            const line = logLines[i];
            
            // Track METHOD_ENTRY or CODE_UNIT_STARTED to identify method boundaries
            if (line.includes('CODE_UNIT_STARTED')) {
                lastCodeUnitStarted = line;
                
                // Check if this is the setup method
                if (safeSetupMethodName && line.includes(`${safeClassName}.${safeSetupMethodName}`)) {
                    if (currentSection.length > 0) {
                        // Save current section before starting a new one
                        if (inSetupMethod) {
                            setupMethodSections.push(...currentSection);
                        } else if (inTestMethod) {
                            testMethodSections.push(...currentSection);
                        }
                        currentSection = [];
                    }
                    inSetupMethod = true;
                    inTestMethod = false;
                    currentSection.push(line);
                    continue;
                }
                
                // Check if this is the test method
                if (line.includes(`${safeClassName}.${safeMethodName}`)) {
                    if (currentSection.length > 0) {
                        // Save current section before starting a new one
                        if (inSetupMethod) {
                            setupMethodSections.push(...currentSection);
                        } else if (inTestMethod) {
                            testMethodSections.push(...currentSection);
                        }
                        currentSection = [];
                    }
                    inTestMethod = true;
                    inSetupMethod = false;
                    currentSection.push(line);
                    continue;
                }
            }
            
            // Track METHOD_EXIT or CODE_UNIT_FINISHED to identify method end
            if (line.includes('CODE_UNIT_FINISHED')) {
                if (inSetupMethod && setupMethodName && line.includes(`${safeClassName}.${safeSetupMethodName}`)) {
                    currentSection.push(line);
                    setupMethodSections.push(...currentSection);
                    currentSection = [];
                    inSetupMethod = false;
                    continue;
                }
                
                if (inTestMethod && line.includes(`${safeClassName}.${safeMethodName}`)) {
                    currentSection.push(line);
                    testMethodSections.push(...currentSection);
                    currentSection = [];
                    inTestMethod = false;
                    continue;
                }
            }
            
            // Add line to current section if we're in a relevant method
            if (inSetupMethod || inTestMethod) {
                currentSection.push(line);
            }
        }
        
        // Add any remaining sections
        if (currentSection.length > 0) {
            if (inSetupMethod) {
                setupMethodSections.push(...currentSection);
            } else if (inTestMethod) {
                testMethodSections.push(...currentSection);
            }
        }
        
        // Combine sections with headers
        if (setupMethodSections.length > 0) {
            filteredLines.push('==== TEST SETUP METHOD ====');
            filteredLines.push(`${safeClassName}.${safeSetupMethodName || 'Unknown Setup Method'}`);
            filteredLines.push('');
            filteredLines.push(...setupMethodSections);
            filteredLines.push('');
        }
        
        if (testMethodSections.length > 0) {
            filteredLines.push('==== TEST METHOD ====');
            filteredLines.push(`${safeClassName}.${safeMethodName}`);
            filteredLines.push('');
            filteredLines.push(...testMethodSections);
        }
        
        // If we couldn't find specific method sections, look for any relevant log entries
        if (filteredLines.length === 0) {
            filteredLines.push(`No specific method boundaries found for ${safeClassName}.${safeMethodName}`);
            filteredLines.push('Showing any log entries containing references to this method:');
            filteredLines.push('');
            
            // Find any lines with references to this method
            const relevantLines = logLines.filter(line => 
                line.includes(`${safeClassName}.${safeMethodName}`) || 
                (safeSetupMethodName && line.includes(`${safeClassName}.${safeSetupMethodName}`))
            );
            
            if (relevantLines.length > 0) {
                filteredLines.push(...relevantLines);
            } else {
                filteredLines.push(`No references to ${safeClassName}.${safeMethodName} found in the logs.`);
            }
        }
        
        return filteredLines.join('\n');
    }
}

/**
 * Activates the extension
 */
export async function activate(context: vscode.ExtensionContext) {
    const testRunner = new ApexTestRunner(context);
    testRunner.initialize();
}

/**
 * Deactivates the extension
 */
export function deactivate() {} 