import Parser from 'tree-sitter';
import { CodeIssue, IssueType, IssueCategory } from '../types';

/**
 * Detects performance issues in code
 */
export class PerformanceDetector {
  private code: string;

  constructor(code: string) {
    this.code = code;
  }

  /**
   * Detect all performance issues in a node
   */
  detectPerformanceIssues(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    issues.push(...this.detectNestedLoops(node));
    issues.push(...this.detectDOMInLoop(node));
    issues.push(...this.detectStringConcatInLoop(node));
    issues.push(...this.detectRegexInLoop(node));
    issues.push(...this.detectInefficientArrayOps(node));

    return issues;
  }

  /**
   * Detect nested loops (O(n²) or worse)
   */
  private detectNestedLoops(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const loopTypes = ['for_statement', 'while_statement', 'for_in_statement', 'for_of_statement'];

    const countLoopDepth = (n: Parser.SyntaxNode, depth = 0): number => {
      if (loopTypes.includes(n.type)) {
        depth++;
      }

      let maxDepth = depth;
      for (const child of n.children) {
        const childDepth = countLoopDepth(child, depth);
        maxDepth = Math.max(maxDepth, childDepth);
      }

      return maxDepth;
    };

    const traverse = (n: Parser.SyntaxNode) => {
      if (loopTypes.includes(n.type)) {
        const depth = countLoopDepth(n);
        if (depth >= 2) {
          const line = n.startPosition.row + 1;
          const complexity = depth === 2 ? 'O(n²)' : depth === 3 ? 'O(n³)' : `O(n^${depth})`;

          issues.push({
            type: IssueType.NESTED_LOOPS,
            category: IssueCategory.PERFORMANCE,
            severity: depth >= 3 ? 'critical' : 'high',
            line,
            message: `Nested loops detected - ${complexity} complexity`,
            suggestion: 'Consider using a Map/Set for lookups, or restructure algorithm',
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
   * Detect DOM queries inside loops
   */
  private detectDOMInLoop(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const domMethods = ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName'];

    const isInLoop = (n: Parser.SyntaxNode): boolean => {
      const loopTypes = ['for_statement', 'while_statement', 'for_in_statement', 'for_of_statement'];
      let current = n.parent;
      while (current) {
        if (loopTypes.includes(current.type)) return true;
        current = current.parent;
      }
      return false;
    };

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'call_expression' && isInLoop(n)) {
        const functionNode = n.childForFieldName('function');
        if (functionNode && functionNode.type === 'member_expression') {
          const propertyNode = functionNode.childForFieldName('property');

          if (propertyNode && domMethods.includes(propertyNode.text)) {
            const line = n.startPosition.row + 1;
            issues.push({
              type: IssueType.DOM_IN_LOOP,
              category: IssueCategory.PERFORMANCE,
              severity: 'high',
              line,
              message: `DOM query '${propertyNode.text}' inside loop - very slow`,
              suggestion: 'Move DOM queries outside the loop and cache results',
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

  /**
   * Detect string concatenation in loops
   */
  private detectStringConcatInLoop(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const isInLoop = (n: Parser.SyntaxNode): boolean => {
      const loopTypes = ['for_statement', 'while_statement', 'for_in_statement', 'for_of_statement'];
      let current = n.parent;
      while (current) {
        if (loopTypes.includes(current.type)) return true;
        current = current.parent;
      }
      return false;
    };

    const traverse = (n: Parser.SyntaxNode) => {
      // Check for += with strings
      if (n.type === 'augmented_assignment_expression' && isInLoop(n)) {
        const operator = n.childForFieldName('operator');
        if (operator?.text === '+=') {
          const left = n.childForFieldName('left');
          const right = n.childForFieldName('right');

          // Check if it might be a string (has quotes or template literal)
          if (right && (right.type === 'string' || right.type === 'template_string')) {
            const line = n.startPosition.row + 1;
            issues.push({
              type: IssueType.STRING_CONCAT_IN_LOOP,
              category: IssueCategory.PERFORMANCE,
              severity: 'medium',
              line,
              message: 'String concatenation in loop is slow',
              suggestion: 'Use an array and join() instead: arr.push(str); return arr.join("")',
              codeSnippet: this.getLineContent(line),
            });
          }
        }
      }

      // Check for + operator with strings
      if (n.type === 'binary_expression' && isInLoop(n)) {
        const operator = n.childForFieldName('operator');
        if (operator?.text === '+') {
          const left = n.childForFieldName('left');
          const right = n.childForFieldName('right');

          if ((left?.type === 'string' || left?.type === 'template_string') ||
              (right?.type === 'string' || right?.type === 'template_string')) {
            const line = n.startPosition.row + 1;
            issues.push({
              type: IssueType.STRING_CONCAT_IN_LOOP,
              category: IssueCategory.PERFORMANCE,
              severity: 'medium',
              line,
              message: 'String concatenation in loop is inefficient',
              suggestion: 'Use an array and join() for better performance',
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

  /**
   * Detect regex creation in loops
   */
  private detectRegexInLoop(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const isInLoop = (n: Parser.SyntaxNode): boolean => {
      const loopTypes = ['for_statement', 'while_statement', 'for_in_statement', 'for_of_statement'];
      let current = n.parent;
      while (current) {
        if (loopTypes.includes(current.type)) return true;
        current = current.parent;
      }
      return false;
    };

    const traverse = (n: Parser.SyntaxNode) => {
      // Check for new RegExp() or regex literal in loop
      if (isInLoop(n)) {
        if (n.type === 'regex') {
          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.REGEX_IN_LOOP,
            category: IssueCategory.PERFORMANCE,
            severity: 'medium',
            line,
            message: 'Regular expression created inside loop',
            suggestion: 'Define regex outside loop as a constant',
            codeSnippet: this.getLineContent(line),
          });
        }

        if (n.type === 'new_expression') {
          const constructorNode = n.childForFieldName('constructor');
          if (constructorNode?.text === 'RegExp') {
            const line = n.startPosition.row + 1;
            issues.push({
              type: IssueType.REGEX_IN_LOOP,
              category: IssueCategory.PERFORMANCE,
              severity: 'medium',
              line,
              message: 'RegExp object created inside loop',
              suggestion: 'Create RegExp outside loop and reuse',
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

  /**
   * Detect inefficient array operations
   */
  private detectInefficientArrayOps(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    let chainedMethods: { line: number; methods: string[] } | null = null;

    const traverse = (n: Parser.SyntaxNode) => {
      // Detect chained array methods that could be combined
      if (n.type === 'call_expression') {
        const methods = this.getChainedMethods(n);

        // Check for multiple map/filter/reduce in a chain
        const mapCount = methods.filter(m => m === 'map').length;
        const filterCount = methods.filter(m => m === 'filter').length;

        if (mapCount > 1 || (mapCount > 0 && filterCount > 0)) {
          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.INEFFICIENT_ARRAY_OPS,
            category: IssueCategory.PERFORMANCE,
            severity: 'medium',
            line,
            message: `Multiple array iterations detected: ${methods.join(' → ')}`,
            suggestion: 'Combine operations into a single pass for better performance',
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

  // Helper methods

  private getChainedMethods(node: Parser.SyntaxNode): string[] {
    const methods: string[] = [];
    let current: Parser.SyntaxNode | null = node;

    while (current && current.type === 'call_expression') {
      const functionNode = current.childForFieldName('function');
      if (functionNode && functionNode.type === 'member_expression') {
        const propertyNode = functionNode.childForFieldName('property');
        if (propertyNode) {
          methods.unshift(propertyNode.text);
        }
        current = functionNode.childForFieldName('object');
      } else {
        break;
      }
    }

    return methods;
  }

  private getLineContent(line: number): string {
    const lines = this.code.split('\n');
    return lines[line - 1]?.trim() || '';
  }
}
