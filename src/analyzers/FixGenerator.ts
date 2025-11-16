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

      case IssueType.EVAL_USAGE:
        return this.fixEvalUsage(issue);

      case IssueType.INNERHTML_USAGE:
        return this.fixInnerHTMLUsage(issue);

      case IssueType.HARDCODED_SECRET:
        return this.fixHardcodedSecret(issue);

      case IssueType.DOM_IN_LOOP:
        return this.fixDOMInLoop(issue);

      case IssueType.NESTED_LOOPS:
        return this.fixNestedLoops(issue);

      case IssueType.TOO_MANY_PARAMETERS:
        return this.fixTooManyParameters(issue);

      case IssueType.HIGH_COMPLEXITY:
        return this.fixHighComplexity(issue);

      case IssueType.DEEP_NESTING:
        return this.fixDeepNesting(issue);

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
   * Fix eval() usage
   */
  private fixEvalUsage(issue: CodeIssue): CodeFix {
    return {
      issueType: issue.type,
      description: 'Remove eval() and use safer alternatives',
      originalCode: issue.codeSnippet || this.getLine(issue.line),
      fixedCode: `// SECURITY: Replace eval() with JSON.parse() for JSON, or Function() constructor for specific cases\n// Consider using a sandboxed environment if dynamic code execution is required`,
      automated: false,
    };
  }

  /**
   * Fix innerHTML usage
   */
  private fixInnerHTMLUsage(issue: CodeIssue): CodeFix {
    const originalCode = issue.codeSnippet || this.getLine(issue.line);
    const fixed = originalCode
      .replace(/\.innerHTML\s*=/, '.textContent =')
      .replace(/\.outerHTML\s*=/, '.textContent =');

    return {
      issueType: issue.type,
      description: 'Use textContent instead of innerHTML to prevent XSS',
      originalCode,
      fixedCode: fixed + '\n// Or use DOMPurify.sanitize() if HTML is required',
      automated: false, // May break functionality if HTML is needed
    };
  }

  /**
   * Fix hardcoded secrets
   */
  private fixHardcodedSecret(issue: CodeIssue): CodeFix {
    const originalCode = issue.codeSnippet || this.getLine(issue.line);

    return {
      issueType: issue.type,
      description: 'Move secret to environment variable',
      originalCode,
      fixedCode: `// Load from environment: process.env.SECRET_NAME\n// Or use a secrets manager like AWS Secrets Manager, HashiCorp Vault`,
      automated: false,
    };
  }

  /**
   * Fix DOM queries in loops
   */
  private fixDOMInLoop(issue: CodeIssue): CodeFix {
    return {
      issueType: issue.type,
      description: 'Cache DOM query outside the loop',
      originalCode: issue.codeSnippet || this.getLine(issue.line),
      fixedCode: `// Before loop:\nconst element = document.querySelector('.selector');\n// Use 'element' inside loop`,
      automated: false,
    };
  }

  /**
   * Fix nested loops
   */
  private fixNestedLoops(issue: CodeIssue): CodeFix {
    return {
      issueType: issue.type,
      description: 'Consider algorithmic optimization',
      originalCode: issue.codeSnippet || this.getLine(issue.line),
      fixedCode: `// Consider:\n// 1. Using Map/Set for O(1) lookups instead of nested loops\n// 2. Breaking into separate functions\n// 3. Using array methods like filter/map/reduce`,
      automated: false,
    };
  }

  /**
   * Fix too many parameters
   */
  private fixTooManyParameters(issue: CodeIssue): CodeFix {
    return {
      issueType: issue.type,
      description: 'Use options object pattern',
      originalCode: issue.codeSnippet || this.getLine(issue.line),
      fixedCode: `// function name(options) {\n//   const { param1, param2, param3 } = options;\n//   ...\n// }`,
      automated: false,
    };
  }

  /**
   * Fix high complexity
   */
  private fixHighComplexity(issue: CodeIssue): CodeFix {
    return {
      issueType: issue.type,
      description: 'Refactor into smaller functions',
      originalCode: issue.codeSnippet || this.getLine(issue.line),
      fixedCode: `// Break this function into smaller, focused functions\n// Extract conditional logic into separate functions\n// Use early returns to reduce complexity`,
      automated: false,
    };
  }

  /**
   * Fix deep nesting
   */
  private fixDeepNesting(issue: CodeIssue): CodeFix {
    return {
      issueType: issue.type,
      description: 'Use early returns and guard clauses',
      originalCode: issue.codeSnippet || this.getLine(issue.line),
      fixedCode: `// Use early returns:\n// if (!condition) return;\n// Continue with main logic...\n// Or extract nested blocks into separate functions`,
      automated: false,
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
