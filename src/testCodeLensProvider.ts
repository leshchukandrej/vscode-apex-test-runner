import * as vscode from 'vscode';

export class ApexTestCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        console.log('ApexTestCodeLensProvider initialized');
    }

    public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        console.log(`Providing CodeLenses for file: ${document.fileName}`);
        
        // Skip non-Apex files
        if (document.languageId !== 'apex') {
            console.log('Not an Apex file, skipping CodeLens');
            return [];
        }

        const text = document.getText();
        const codeLenses: vscode.CodeLens[] = [];
        
        // Find test classes
        const classLenses = this.findTestClasses(document, text);
        codeLenses.push(...classLenses);
        
        // Find test methods (avoid duplicates using a Map)
        const methodLensesMap = this.findAllTestMethods(document, text);
        
        // Add all method lenses to the result
        for (const lens of methodLensesMap.values()) {
            codeLenses.push(lens);
        }

        console.log(`Returning ${codeLenses.length} CodeLenses`);
        return codeLenses;
    }
    
    /**
     * Find classes annotated with @IsTest
     */
    private findTestClasses(document: vscode.TextDocument, text: string): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        let classCount = 0;
        
        // Find all @IsTest annotations that are not in comments
        const isTestAnnotationRegex = /^(?:[^\/\n]*?)@IsTest(?:\s*\([^)]*\))?/gm;
        const annotations = new Set<number>();
        let match: RegExpExecArray | null;
        
        while ((match = isTestAnnotationRegex.exec(text)) !== null) {
            annotations.add(match.index);
        }
        
        // Find classes
        const classRegex = /(?:(?:public|private|global)\s+)?(?:(?:with|without)\s+sharing\s+)?class\s+(\w+)/g
        
        while ((match = classRegex.exec(text)) !== null) {
            const className = match[1];
            
            // Check if there's an @IsTest annotation nearby
            const hasNearbyAnnotation = Array.from(annotations).some(index => {
                const distance = match!.index - index;
                return distance > 0 && distance < 200; // Within reasonable distance
            });

            if (hasNearbyAnnotation) {
                classCount++;
                
                const position = document.positionAt(match.index);
                const range = document.lineAt(position.line).range;
                
                codeLenses.push(new vscode.CodeLens(range, {
                    title: `[CLASS] Run All Tests in ${className}`,
                    command: 'apexTestRunner.runFile',
                    arguments: [document.uri]
                }));
            }
        }
        
        console.log(`Found ${classCount} test classes`);
        return codeLenses;
    }
    
    /**
     * Find all test methods using various patterns
     */
    private findAllTestMethods(document: vscode.TextDocument, text: string): Map<number, vscode.CodeLens> {
        const codeLensesMap = new Map<number, vscode.CodeLens>();
        
        // Find methods with @IsTest + static void
        this.findTestMethodsByPattern(
            document, 
            text, 
            /^(?:[^\/\n]*?)@IsTest(?:\s*\([^)]*\))?\s*(?:[\s\S]{0,200}?)(?:public|private|global|protected)?\s*static\s+void\s+(\w+)\s*\(/gm,
            "modern @IsTest with static void",
            codeLensesMap
        );

        // Find methods with standalone testmethod void (legacy)
        this.findTestMethodsByPattern(
            document, 
            text, 
            /^(?:[^\/\n]*?)(?:public|private|global|protected)?\s*(?:static\s+)?testmethod\s+void\s+(\w+)\s*\(/gmi,
            "legacy testmethod",
            codeLensesMap
        );
        
        console.log(`Found ${codeLensesMap.size} total test methods`);
        return codeLensesMap;
    }
    
    /**
     * Find test methods by a specific regex pattern
     */
    private findTestMethodsByPattern(
        document: vscode.TextDocument, 
        text: string, 
        pattern: RegExp, 
        patternName: string,
        codeLensesMap: Map<number, vscode.CodeLens>
    ): void {
        let match: RegExpExecArray | null;
        let count = 0;
        
        while ((match = pattern.exec(text)) !== null) {
            const methodName = match[1];
            
            // Find the actual method name position
            const positionOffset = text.indexOf(methodName, match.index);
            const position = document.positionAt(positionOffset);
            const lineNumber = position.line;
            
            // Only add if this line doesn't already have a CodeLens
            if (!codeLensesMap.has(lineNumber)) {
                count++;
                const range = document.lineAt(lineNumber).range;
                
                codeLensesMap.set(lineNumber, new vscode.CodeLens(range, {
                    title: `[METHOD] Run Single Test: ${methodName}`,
                    command: 'apexTestRunner.runTestFromLens',
                    arguments: [document.uri, methodName]
                }));
            }
        }
        
        console.log(`Found ${count} test methods with ${patternName} pattern`);
    }
} 