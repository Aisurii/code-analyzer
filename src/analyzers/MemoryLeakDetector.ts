import Parser from 'tree-sitter';
import { CodeIssue, IssueType, IssueCategory } from '../types';

/**
 * Detects potential memory leaks in code
 */
export class MemoryLeakDetector {
  private code: string;

  constructor(code: string) {
    this.code = code;
  }

  /**
   * Detect all memory leak issues
   */
  detectLeaks(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    issues.push(...this.detectEventListenerLeaks(node));
    issues.push(...this.detectIntervalLeaks(node));
    issues.push(...this.detectClosureLeaks(node));
    issues.push(...this.detectGlobalLeaks(node));

    return issues;
  }

  /**
   * Detect addEventListener without removeEventListener
   */
  private detectEventListenerLeaks(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const addListenerCalls: Array<{ line: number; element: string; event: string }> = [];
    const removeListenerCalls: Set<string> = new Set();

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'call_expression') {
        const functionNode = n.childForFieldName('function');

        if (functionNode && functionNode.type === 'member_expression') {
          const propertyNode = functionNode.childForFieldName('property');
          const objectNode = functionNode.childForFieldName('object');

          if (propertyNode && objectNode) {
            const method = propertyNode.text;
            const element = objectNode.text;

            if (method === 'addEventListener') {
              const args = n.childForFieldName('arguments');
              const eventType = this.getFirstArgument(args);

              addListenerCalls.push({
                line: n.startPosition.row + 1,
                element,
                event: eventType,
              });
            } else if (method === 'removeEventListener') {
              const args = n.childForFieldName('arguments');
              const eventType = this.getFirstArgument(args);
              removeListenerCalls.add(`${element}:${eventType}`);
            }
          }
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);

    // Check for listeners without corresponding remove
    addListenerCalls.forEach(({ line, element, event }) => {
      const key = `${element}:${event}`;
      if (!removeListenerCalls.has(key)) {
        issues.push({
          type: IssueType.EVENT_LISTENER_LEAK,
          category: IssueCategory.MEMORY_LEAK,
          severity: 'high',
          line,
          message: `Event listener on ${element} for '${event}' is never removed - potential memory leak`,
          suggestion: `Add removeEventListener in cleanup/unmount: ${element}.removeEventListener('${event}', handler)`,
          codeSnippet: this.getLineContent(line),
        });
      }
    });

    return issues;
  }

  /**
   * Detect setInterval without clearInterval
   */
  private detectIntervalLeaks(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    let hasSetInterval = false;
    let hasClearInterval = false;
    let setIntervalLine = 0;

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'call_expression') {
        const functionNode = n.childForFieldName('function');

        if (functionNode && functionNode.type === 'identifier') {
          if (functionNode.text === 'setInterval') {
            hasSetInterval = true;
            setIntervalLine = n.startPosition.row + 1;
          } else if (functionNode.text === 'clearInterval') {
            hasClearInterval = true;
          }
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);

    if (hasSetInterval && !hasClearInterval) {
      issues.push({
        type: IssueType.INTERVAL_LEAK,
        category: IssueCategory.MEMORY_LEAK,
        severity: 'critical',
        line: setIntervalLine,
        message: 'setInterval called without corresponding clearInterval - will run forever',
        suggestion: 'Store interval ID and clear it: const id = setInterval(...); clearInterval(id);',
        codeSnippet: this.getLineContent(setIntervalLine),
      });
    }

    return issues;
  }

  /**
   * Detect closures that might leak memory
   */
  private detectClosureLeaks(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      // Check for arrow functions or function expressions that return functions
      if ((n.type === 'arrow_function' || n.type === 'function') &&
          n.parent?.type === 'return_statement') {

        // Check if it captures variables
        const capturedVars = this.findCapturedVariables(n);

        if (capturedVars.length > 0) {
          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.CLOSURE_LEAK,
            category: IssueCategory.MEMORY_LEAK,
            severity: 'medium',
            line,
            message: `Closure captures ${capturedVars.length} variable(s) - verify they don't hold large objects`,
            suggestion: `Review captured variables: ${capturedVars.join(', ')}. Consider WeakMap for object references.`,
            codeSnippet: this.getLineContent(line),
          });
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return issues;
  }

  /**
   * Detect global variable accumulation
   */
  private detectGlobalLeaks(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      // Detect window.something = or window.something.push()
      if (n.type === 'assignment_expression' || n.type === 'call_expression') {
        const text = n.text;

        if (text.includes('window.') || text.includes('global.')) {
          // Check if it's array push or object assignment that accumulates data
          if (text.includes('.push(') || text.includes('.concat(') ||
              (text.includes('=') && text.includes('||'))) {
            const line = n.startPosition.row + 1;
            issues.push({
              type: IssueType.GLOBAL_LEAK,
              category: IssueCategory.MEMORY_LEAK,
              severity: 'high',
              line,
              message: 'Accumulating data in global scope - may grow unbounded',
              suggestion: 'Use local state or implement cleanup mechanism. Consider using WeakMap for automatic GC.',
              codeSnippet: this.getLineContent(line),
            });
          }
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return issues;
  }

  // Helper methods

  private getFirstArgument(argsNode: Parser.SyntaxNode | null): string {
    if (!argsNode) return 'unknown';

    for (const child of argsNode.children) {
      if (child.type === 'string') {
        return child.text.replace(/['"]/g, '');
      }
    }

    return 'unknown';
  }

  private findCapturedVariables(node: Parser.SyntaxNode): string[] {
    const variables: string[] = [];
    const seen = new Set<string>();

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'identifier' && !seen.has(n.text)) {
        // Simple heuristic: if identifier is used but not defined locally
        variables.push(n.text);
        seen.add(n.text);
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return variables.slice(0, 5); // Limit to first 5 for readability
  }

  private getLineContent(line: number): string {
    const lines = this.code.split('\n');
    return lines[line - 1]?.trim() || '';
  }
}
