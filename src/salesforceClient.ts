import execa from 'execa';

/**
 * Client for interacting with Salesforce through SF CLI
 */
export class SalesforceClient {
    /**
     * Sanitizes a value to be used safely in command line arguments
     * Only allows alphanumeric characters, dots, underscores, and commas for method lists
     */
    private sanitizeCliArg(value: string): string {
        return value.replace(/[^a-zA-Z0-9_\.,]/g, '');
    }

    /**
     * Validates a Salesforce ID format (15 or 18 char alphanumeric)
     */
    private isValidSalesforceId(id: string): boolean {
        return /^[a-zA-Z0-9]{15,18}$/.test(id);
    }

    /**
     * Run Apex tests for a specified class and optional method
     */
    public async runApexTest(className: string, methodName?: string): Promise<string> {
        // Sanitize class name to prevent command injection
        const sanitizedClassName = this.sanitizeCliArg(className);
        
        if (sanitizedClassName !== className) {
            throw new Error('Invalid characters in class name');
        }

        // Construct sf command for test run
        const testArgs = ['apex', 'test', 'run'];
        
        if (methodName) {
            // Sanitize method name(s) to prevent command injection
            const sanitizedMethodName = this.sanitizeCliArg(methodName);
            
            if (sanitizedMethodName !== methodName) {
                throw new Error('Invalid characters in method name');
            }
            
            if (methodName.includes(',')) {
                // For multiple test methods (comma-separated)
                testArgs.push('--tests', sanitizedMethodName);
            } else {
                // For a single test method
                testArgs.push('--tests', `${sanitizedClassName}.${sanitizedMethodName}`);
            }
        } else {
            testArgs.push('--class-names', sanitizedClassName);
        }
        
        testArgs.push(
            '--result-format', 'json',
            '--synchronous',
            '--wait', '60'
        );

        try {
            const result = await execa('sf', testArgs);
            return result.stdout;
        } catch (error: any) {
            // Even in case of error, we might have stdout with test results
            if (error.stdout) {
                return error.stdout;
            }
            throw error; // Re-throw if no stdout
        }
    }
    
    /**
     * Query test results from Salesforce
     */
    public async queryTestResults(classIds: string[], startTime: string, endTime: string): Promise<any> {
        // Validate and sanitize class IDs
        const validClassIds = classIds
            .filter(id => this.isValidSalesforceId(id))
            .map(id => `'${id}'`);
        
        if (validClassIds.length === 0) {
            throw new Error('Invalid class IDs');
        }
        
        const classIdList = validClassIds.join(', ');
        
        // Query for test results, including setup method info
        const testResultQuery = `SELECT Id, ApexClass.Name, ApexClassId, MethodName, ApexLogId, IsTestSetup, Outcome
                               FROM ApexTestResult 
                               WHERE ApexClassId IN (${classIdList})
                               AND TestTimestamp >= ${startTime}
                               AND TestTimestamp <= ${endTime}
                               ORDER BY TestTimestamp DESC`;
        
        const { stdout } = await execa('sf', [
            'data', 'query',
            '--query', testResultQuery,
            '--json'
        ]);
        
        return JSON.parse(stdout);
    }
    
    /**
     * Get the log content for a specific log ID
     */
    public async getLogContent(logId: string): Promise<string> {
        // Validate logId format
        if (!this.isValidSalesforceId(logId)) {
            throw new Error('Invalid log ID format');
        }
        
        const { stdout } = await execa('sf', [
            'apex', 'log', 'get',
            '--log-id', logId
        ]);
        
        return stdout;
    }
} 