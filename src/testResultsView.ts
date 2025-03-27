import * as vscode from 'vscode';
import { LogAnalyzerHandler } from './logAnalyzerHandler';

export class TestResultsView {
    private static currentPanel: TestResultsView | undefined;
    private readonly panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this.panel.webview.html = this._getWebviewContent();
        
        // Set up message handling
        this.panel.webview.onDidReceiveMessage(
            this.handleWebviewMessage,
            this,
            this._disposables
        );
    }

    public static show(context: vscode.ExtensionContext): TestResultsView {
        if (TestResultsView.currentPanel) {
            TestResultsView.currentPanel.panel.reveal(vscode.ViewColumn.Two);
            // Show loading spinner when opening the panel
            TestResultsView.currentPanel.showLoading();
            return TestResultsView.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'apexTestResults',
            'Apex Test Results',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        TestResultsView.currentPanel = new TestResultsView(panel);
        // Show loading spinner immediately upon creation
        TestResultsView.currentPanel.showLoading();
        return TestResultsView.currentPanel;
    }

    public showLoading() {
        this.panel.webview.postMessage({
            command: 'showLoading'
        });
    }

    public updateContent(testResults: any, logs: string) {
        this.panel.webview.postMessage({
            command: 'updateResults',
            testResults,
            logs
        });
    }

    private _getWebviewContent() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Apex Test Results</title>
            <style>
                body {
                    padding: 20px;
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .summary h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                }
                .summary h4 {
                    margin-top: 5px;
                    margin-bottom: 5px;
                }
                .summary p {
                    margin: 3px 0;
                }
                .details {
                    margin-top: 5px;
                }
                .tab {
                    overflow: hidden;
                    border: 1px solid var(--vscode-panel-border);
                }
                .tab button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    float: left;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    padding: 10px 20px;
                    margin: 2px;
                }
                .tab button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .tab button.active {
                    background-color: var(--vscode-button-secondaryBackground);
                }
                .tabcontent {
                    display: none;
                    padding: 12px;
                    border: 1px solid var(--vscode-panel-border);
                }
                .test-result {
                    margin: 10px 0;
                    padding: 10px;
                    border: 1px solid var(--vscode-panel-border);
                }
                .success { color: #4CAF50; }
                .failure { color: #f44336; }
                pre {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    overflow-x: auto;
                }
                .test-methods-list {
                    margin: 15px 0;
                    border: 1px solid var(--vscode-panel-border);
                    padding: 10px;
                    background-color: var(--vscode-editor-background);
                }
                .test-methods-list h3 {
                    margin-top: 0;
                    margin-bottom: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .test-methods-list ul {
                    list-style-type: none;
                    padding: 0;
                    margin: 0;
                }
                .test-methods-list li {
                    margin: 8px 0;
                    padding: 8px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 3px;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .test-methods-list li:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .test-methods-list li.active {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }
                .method-name {
                    margin-bottom: 4px;
                    font-weight: 500;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .method-name .toggle-icon {
                    font-size: 10px;
                    margin-left: 8px;
                }
                .test-methods-list li.success {
                    border-left: 4px solid #4CAF50;
                }
                .test-methods-list li.failure {
                    border-left: 4px solid #f44336;
                }
                .test-error-message {
                    margin-top: 5px;
                    padding: 8px 12px;
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    border-radius: 3px;
                    font-family: monospace;
                    white-space: pre-wrap;
                    overflow-wrap: break-word;
                    color: var(--vscode-inputValidation-errorForeground, #f44336);
                    line-height: 1.3;
                    text-align: left;
                    text-indent: 0;
                    margin-left: 0;
                }
                .method-log-data pre {
                    margin: 0;
                    white-space: pre-wrap;
                    font-family: monospace;
                    font-size: 12px;
                }
                .setup-method-info {
                    margin-top: 5px;
                    font-style: italic;
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.9em;
                }
                .toggle-icon {
                    display: inline-block;
                    margin-right: 6px;
                    font-size: 10px;
                    transition: transform 0.2s;
                }
                .method-log-data {
                    margin-top: 8px;
                    border: 1px solid var(--vscode-panel-border);
                    padding: 10px;
                    border-radius: 3px;
                    background-color: var(--vscode-textBlockQuote-background);
                    max-height: 400px;
                    overflow-y: auto;
                }
                .method-info {
                    margin-bottom: 10px;
                    padding: 8px 12px;
                    border-radius: 3px;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    font-size: 1.1em;
                    border-left: 4px solid var(--vscode-editor-foreground);
                }
                .method-info.success {
                    border-left-color: #4CAF50;
                }
                .method-info.failure {
                    border-left-color: #f44336;
                }
                .log-analysis-container {
                    padding: 0;
                    margin: 0;
                    width: 100%;
                    overflow: auto;
                }
                .log-analysis-container pre {
                    margin: 0;
                }
                .log-analysis-section {
                    margin-bottom: 20px;
                    padding: 10px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 3px;
                }
                .log-analysis-section h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 5px;
                }
                .log-view-controls {
                    margin-bottom: 10px;
                    display: flex;
                    gap: 10px;
                }
                .log-view-btn {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    padding: 6px 12px;
                    cursor: pointer;
                    border-radius: 3px;
                }
                .log-view-btn:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .log-view-btn.active {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .raw-logs-container {
                    width: 100%;
                    max-height: 600px;
                    overflow: auto;
                    border: 1px solid var(--vscode-panel-border);
                    background-color: var(--vscode-editor-background);
                }
                .raw-logs-container pre {
                    margin: 0;
                    padding: 10px;
                    white-space: pre-wrap;
                    font-family: monospace;
                    font-size: 12px;
                }
                .empty-logs-message {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--vscode-descriptionForeground);
                }
                .empty-logs-message .icon {
                    font-size: 32px;
                    margin-bottom: 16px;
                }
                .empty-logs-message h3 {
                    margin: 0 0 12px 0;
                    color: var(--vscode-foreground);
                }
                .empty-logs-message p {
                    margin: 0;
                    font-size: 14px;
                }
                
                /* Action button styles */
                .action-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    margin-right: 10px;
                    cursor: pointer;
                    border-radius: 3px;
                }
                .action-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                /* Loading spinner styles */
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 50px 0;
                    text-align: center;
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    border-left-color: var(--vscode-progressBar-background);
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .loading-message {
                    font-size: 16px;
                    margin-bottom: 8px;
                    font-weight: 500;
                }
                .loading-submessage {
                    font-size: 13px;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="tab">
                <button class="tablinks" onclick="openTab(event, 'TestResults')" id="defaultOpen">Test Results</button>
                <button class="tablinks" onclick="openTab(event, 'Logs')">Debug Logs</button>
            </div>

            <div id="TestResults" class="tabcontent">
                <!-- Loading spinner that shows by default -->
                <div id="loading-container" class="loading-container">
                    <div class="spinner"></div>
                    <div class="loading-message">Running Apex Tests...</div>
                    <div class="loading-submessage">This may take a few moments</div>
                </div>
                <div id="results-container" style="display: none;"></div>
            </div>

            <div id="Logs" class="tabcontent">
                <div id="current-method-info" class="method-info" style="display:none;"></div>
                <div id="empty-logs-message" class="empty-logs-message">
                    <div class="icon">👆</div>
                    <h3>No Log Selected</h3>
                    <p>Click on a test method from the Test Results tab to view its logs here.</p>
                </div>
                <h3 id="logs-analysis-header" style="display:none;">Log Analysis</h3>
                <div id="logs-container" class="log-analysis-container"></div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'showLoading':
                            showLoadingSpinner();
                            break;
                        case 'updateResults':
                            hideLoadingSpinner();
                            updateResults(message.testResults);
                            updateLogs(message.logs);
                            break;
                        case 'updateLogAnalysis':
                            updateLogAnalysis(message);
                            break;
                    }
                });

                function showLoadingSpinner() {
                    document.getElementById('loading-container').style.display = 'flex';
                    document.getElementById('results-container').style.display = 'none';
                }

                function hideLoadingSpinner() {
                    document.getElementById('loading-container').style.display = 'none';
                    document.getElementById('results-container').style.display = 'block';
                }

                function updateResults(results) {
                    const container = document.getElementById('results-container');
                    container.innerHTML = formatTestResults(results);
                }

                function updateLogs(logs) {
                    const container = document.getElementById('logs-container');
                    const emptyMessage = document.getElementById('empty-logs-message');
                    const analysisHeader = document.getElementById('logs-analysis-header');
                    const methodInfo = document.getElementById('current-method-info');
                    
                    // Always show the empty message when logs are updated initially
                    // This will be replaced when a specific method is clicked
                    emptyMessage.style.display = 'block';
                    analysisHeader.style.display = 'none';
                    methodInfo.style.display = 'none';
                    container.textContent = '';
                    
                    // Keep the original logs content in a data attribute for potential later use
                    if (logs && typeof logs === 'string') {
                        container.setAttribute('data-original-logs', logs);
                    }
                }
                
                function updateLogAnalysis(message) {
                    // Hide the empty message and show the analysis header
                    document.getElementById('empty-logs-message').style.display = 'none';
                    document.getElementById('logs-analysis-header').style.display = 'block';
                    
                    // Update the logs in the Debug Logs tab with the analyzed log
                    const logsContainer = document.getElementById('logs-container');
                    logsContainer.innerHTML = message.analysisHtml;
                    
                    // Show info about which method's logs are being viewed
                    const methodInfo = document.getElementById('current-method-info');
                    if (methodInfo) {
                        methodInfo.innerHTML = '<strong>Viewing logs for:</strong> ' + message.methodName;
                        methodInfo.style.display = 'block';
                        
                        // Apply the same success/failure class as the method's list item
                        const clickedItem = document.querySelector('.test-methods-list li[data-method-id="' + message.methodId + '"]');
                        methodInfo.className = 'method-info';
                        if (clickedItem) {
                            if (clickedItem.classList.contains('success')) {
                                methodInfo.classList.add('success');
                            } else if (clickedItem.classList.contains('failure')) {
                                methodInfo.classList.add('failure');
                            }
                        }
                    }
                }
                
                function showAnalyzedLogs() {
                    const analyzedBtn = document.getElementById('view-analyzed-log');
                    const rawBtn = document.getElementById('view-raw-log');
                    const analyzedContainer = document.getElementById('logs-container');
                    const rawContainer = document.getElementById('raw-logs-container');
                    
                    analyzedBtn.classList.add('active');
                    rawBtn.classList.remove('active');
                    
                    analyzedContainer.style.display = 'block';
                    rawContainer.style.display = 'none';
                }
                
                function showRawLogs() {
                    const analyzedBtn = document.getElementById('view-analyzed-log');
                    const rawBtn = document.getElementById('view-raw-log');
                    const analyzedContainer = document.getElementById('logs-container');
                    const rawContainer = document.getElementById('raw-logs-container');
                    
                    analyzedBtn.classList.remove('active');
                    rawBtn.classList.add('active');
                    
                    analyzedContainer.style.display = 'none';
                    rawContainer.style.display = 'block';
                }

                function formatTestResults(results) {
                    if (!results) return '<p>No test results available</p>';
                    return results;
                }

                function viewMethodLogData(methodId) {
                    const logElement = document.getElementById('log-' + methodId);
                    if (logElement) {
                        // Get the log content from the hidden log element
                        const logContent = logElement.querySelector('pre').textContent;
                        
                        // Switch to the Debug Logs tab
                        document.querySelector('button.tablinks[onclick*="Logs"]').click();
                        
                        // Get method info from clicked item
                        const clickedItem = document.querySelector('.test-methods-list li[data-method-id="' + methodId + '"]');
                        if (!clickedItem) return;
                        
                        // Highlight the clicked item as active and reset others
                        const allItems = document.querySelectorAll('.test-methods-list li');
                        // Reset all items
                        for (let i = 0; i < allItems.length; i++) {
                            allItems[i].classList.remove('active');
                            const icon = allItems[i].querySelector('.toggle-icon');
                            if (icon) icon.textContent = '▶';
                        }
                        
                        // Set the clicked item as active
                        clickedItem.classList.add('active');
                        const icon = clickedItem.querySelector('.toggle-icon');
                        if (icon) icon.textContent = '▼';
                        
                        // Get method details
                        const methodName = clickedItem.getAttribute('data-method-name');
                        const setupMethod = clickedItem.getAttribute('data-setup-method');
                        
                        // Analyze the log (this will happen in VS Code, not in the webview)
                        vscode.postMessage({
                            command: 'analyzeLog',
                            methodId: methodId,
                            methodName: methodName,
                            setupMethod: setupMethod,
                            logContent: logContent
                        });
                    }
                }

                function openTab(evt, tabName) {
                    var i, tabcontent, tablinks;
                    tabcontent = document.getElementsByClassName("tabcontent");
                    for (i = 0; i < tabcontent.length; i++) {
                        tabcontent[i].style.display = "none";
                    }
                    tablinks = document.getElementsByClassName("tablinks");
                    for (i = 0; i < tablinks.length; i++) {
                        tablinks[i].className = tablinks[i].className.replace(" active", "");
                    }
                    document.getElementById(tabName).style.display = "block";
                    evt.currentTarget.className += " active";
                }
                
                function retryAllTests() {
                    showLoadingSpinner();
                    
                    // Get all test class and method names from the DOM
                    const testMethods = Array.from(document.querySelectorAll('.test-methods-list li'));
                    const className = testMethods.length > 0 ? 
                        testMethods[0].getAttribute('data-method-name')?.split('.')[0] : '';
                        
                    vscode.postMessage({
                        command: 'retryTests',
                        retryMode: 'all',
                        className: className
                    });
                }
                
                function retryFailedTests() {
                    showLoadingSpinner();
                    
                    // Get only failed test methods from the DOM
                    const failedTests = Array.from(document.querySelectorAll('.test-methods-list li.failure'));
                    const className = failedTests.length > 0 ? 
                        failedTests[0].getAttribute('data-method-name')?.split('.')[0] : '';
                    
                    // Extract method names from the failed tests
                    const methodNames = failedTests.map(test => {
                        const fullName = test.getAttribute('data-method-name') || '';
                        return fullName.split('.')[1]; // Get just the method name
                    });
                    
                    vscode.postMessage({
                        command: 'retryTests',
                        retryMode: 'failed',
                        className: className,
                        methodNames: methodNames
                    });
                }

                // Show the loading spinner by default
                showLoadingSpinner();
                document.getElementById("defaultOpen").click();
            </script>
        </body>
        </html>`;
    }

    public dispose() {
        TestResultsView.currentPanel = undefined;
        this.panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private handleWebviewMessage = async (message: any) => {
        switch (message.command) {
            case 'analyzeLog':
                this.handleLogAnalysis(message);
                break;
            case 'retryTests':
                this.handleRetryTests(message);
                break;
        }
    }
    
    private handleRetryTests(message: any) {
        const { retryMode, className, methodNames } = message;
        
        if (retryMode === 'all') {
            // Run all tests in the class
            const document = vscode.workspace.textDocuments.find(doc => 
                doc.fileName.includes(`${className}.cls`)
            );
            
            if (document) {
                // Invoke the existing command to run all tests in file
                vscode.commands.executeCommand('apexTestRunner.runFile', document.uri);
            }
        } else if (retryMode === 'failed' && methodNames && methodNames.length > 0) {
            // Run only the failed tests
            const document = vscode.workspace.textDocuments.find(doc => 
                doc.fileName.includes(`${className}.cls`)
            );
            
            if (document) {
                // Instead of running tests one by one, run them all at once using a combined format
                const testsToRun = methodNames.map((method: string) => `${className}.${method}`).join(',');
                
                // This will use the runApexTest function with multiple tests
                vscode.commands.executeCommand('apexTestRunner.runSpecificTests', document.uri, testsToRun);
            }
        }
    }
    
    private handleLogAnalysis(message: any) {
        const { methodId, methodName, setupMethod, logContent } = message;
        
        // Analyze the log content
        const analysis = LogAnalyzerHandler.analyzeApexLog(logContent);
        
        // Render the HTML for the log analysis
        const analysisHtml = LogAnalyzerHandler.renderLogAnalysisAsHtml(analysis, logContent);
        
        // Update the webview with the analysis
        this.panel.webview.postMessage({
            command: 'updateLogAnalysis',
            methodId,
            methodName,
            setupMethod,
            analysisHtml,
            logContent
        });
    }
} 