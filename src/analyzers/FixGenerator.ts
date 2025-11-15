import { CodeIssue, IssueType } from '../types';

/**
 * Generates automatic fixes for detected issues
 */
export interface CodeFix {
  issueType: IssueType;
  description: string;
  originalCode: string;
  fixedCode: string;
  automated: boolean; // Can this be auto-applied?
}

export class FixGenerator {
  private code: string;
  private lines: string[];

  constructor(code: string) {
    this.code = code;
    this.lines = code.split('\n');
  }

  /**
   * Generate a fix for an issue
   */
  generateFix(issue: CodeIssue): CodeFix | null {
    switch (issue.type) {
      case IssueType.TYPE_COERCION:
        return this.fixTypeCoercion(issue);

      case IssueType.CONSOLE_LOG:
        return this.fixConsoleLog(issue);

      case IssueType.DEAD_CODE:
        return this.fixDeadCode(issue);

      case IssueType.MAGIC_NUMBER:
        return this.fixMagicNumber(issue);

      case IssueType.STRING_CONCAT_IN_LOOP:
        return this.fixStringConcat(issue);

      case IssueType.EMPTY_CATCH:
        return this.fixEmptyCatch(issue);

      default:
        return null;
    }
  }

  /**
   * Fix == to ===
   */
  private fixTypeCoercion(issue: CodeIssue): CodeFix {
    const originalCode = issue.codeSnippet || this.getLine(issue.line);
    const fixed = originalCode.replace(/\s==\s/g, ' === ').replace(/\s!=\s/g, ' !== ');

    return {
      issueType: issue.type,
      description: 'Replace == with === for strict equality',
      originalCode,
      fixedCode: fixed,
      automated: true,
    };
  }

  /**
   * Remove console.log
   */
  private fixConsoleLog(issue: CodeIssue): CodeFix {
    const originalCode = issue.codeSnippet || this.getLine(issue.line);

    return {
      issueType: issue.type,
      description: 'Remove console.log statement',
      originalCode,
      fixedCode: '// ' + originalCode + ' // Removed by analyzer',
      automated: true,
    };
  }

  /**
   * Remove unused variable
   */
  private fixDeadCode(issue: CodeIssue): CodeFix {
    const originalCode = issue.codeSnippet || this.getLine(issue.line);

    return {
      issueType: issue.type,
      description: 'Remove unused variable declaration',
      originalCode,
      fixedCode: '// ' + originalCode + ' // Unused - removed',
      automated: true,
    };
  }

  /**
   * Extract magic number to constant
   */
  private fixMagicNumber(issue: CodeIssue): CodeFix {
    const originalCode = issue.codeSnippet || this.getLine(issue.line);

    // Extract the number from the message
    const match = issue.message.match(/'([^']+)'/);
    const number = match ? match[1] : '';

    return {
      issueType: issue.type,
      description: 'Extract magic number to named constant',
      originalCode,
      fixedCode: `const CONSTANT_NAME = ${number};\n${originalCode.replace(number, 'CONSTANT_NAME')}`,
      automated: false, // Needs human to name the constant
    };
  }

  /**
   * Fix string concatenation in loop
   */
  private fixStringConcat(issue: CodeIssue): CodeFix {
    const originalCode = issue.codeSnippet || this.getLine(issue.line);

    return {
      issueType: issue.type,
      description: 'Use array.join() instead of string concatenation',
      originalCode,
      fixedCode: `// Before loop: const parts = [];\n// In loop: parts.push(value);\n// After loop: const result = parts.join('');`,
      automated: false, // Requires context
    };
  }

  /**
   * Safely get a line
   */
  private getLine(lineNumber: number): string {
    const line = this.lines[lineNumber - 1];
    return line ? line.trim() : '<code not available>';
  }

  /**
   * Fix empty catch block
   */
  private fixEmptyCatch(issue: CodeIssue): CodeFix {
    const originalCode = issue.codeSnippet || this.getLine(issue.line);

    return {
      issueType: issue.type,
      description: 'Add error handling to empty catch block',
      originalCode,
      fixedCode: `catch (error) {\n  console.error('Error:', error);\n  // TODO: Handle error appropriately\n}`,
      automated: false, // Needs human to decide how to handle
    };
  }

  /**
   * Helper to extract string value from a line
   */
  private extractStringValue(line: string): string {
    const match = line.match(/['"`]([^'"`]+)['"`]/);
    return match ? match[1] : 'value';
  }
}
