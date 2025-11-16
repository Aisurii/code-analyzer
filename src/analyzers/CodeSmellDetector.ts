import Parser from 'tree-sitter';
import { CodeIssue, IssueType, IssueCategory } from '../types';

/**
 * Detects code smells in the AST
 */
export class CodeSmellDetector {
  private code: string;

  constructor(code: string) {
    this.code = code;
  }

  /**
   * Detect all code smells in a node
   */
  detectSmells(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    issues.push(...this.detectMagicNumbers(node));
    issues.push(...this.detectPoorNaming(node));
    issues.push(...this.detectConsoleLog(node));
    issues.push(...this.detectEmptyCatch(node));
    issues.push(...this.detectTodoComments(node));
    issues.push(...this.detectTypeCoercion(node));
    issues.push(...this.detectUnusedVariables(node));

    return issues;
  }

  /**
   * Detect magic numbers (hardcoded numbers without meaning)
   */
  private detectMagicNumbers(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Common acceptable numbers that don't need constants
    const acceptableNumbers = new Set([
      0, 1, -1, 2,          // Basic values
      10, 100, 1000,        // Powers of 10
      60, 24, 7,            // Time (seconds, hours, days)
      200, 201, 204,        // HTTP success codes
      400, 401, 403, 404,   // HTTP client errors
      500, 502, 503,        // HTTP server errors
      16, 32, 64, 128, 256, 512, 1024  // Powers of 2 (common in CS)
    ]);

    const isTimeRelated = (n: Parser.SyntaxNode): boolean => {
      const text = n.parent?.text || '';
      return /setTimeout|setInterval|delay|wait|sleep|millisecond|second|minute|hour|day/i.test(text);
    };

    const isHTTPStatus = (value: number): boolean => {
      return value >= 100 && value < 600;
    };

    const isPercentage = (n: Parser.SyntaxNode): boolean => {
      const parentText = n.parent?.text || '';
      return /percent|%|ratio|fraction/i.test(parentText) ||
             (n.text === '100' && parentText.includes('/'));
    };

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'number') {
        const value = parseFloat(n.text);
        const line = n.startPosition.row + 1;

        // Skip acceptable numbers, array indices, time-related, HTTP codes, and percentages
        if (!acceptableNumbers.has(value) &&
            !this.isArrayIndex(n) &&
            !isTimeRelated(n) &&
            !(isHTTPStatus(value) && (n.parent?.parent?.text || '').includes('status')) &&
            !isPercentage(n)) {
          // Get code snippet from parent context - walk up to find meaningful context
          let codeSnippet = n.text;
          if (n.parent) {
            let parentNode: Parser.SyntaxNode | null = n.parent;
            // Walk up the tree to find the most meaningful parent context
            while (parentNode) {
              if (parentNode.type === 'call_expression' ||
                  parentNode.type === 'expression_statement' ||
                  parentNode.type === 'variable_declarator' ||
                  parentNode.type === 'assignment_expression' ||
                  parentNode.type === 'new_expression') {
                codeSnippet = parentNode.text.trim();
                // Limit snippet length for readability
                if (codeSnippet.length > 80) {
                  codeSnippet = codeSnippet.substring(0, 77) + '...';
                }
                break;
              }
              // Don't go too far up
              if (!parentNode.parent || parentNode.type === 'program' || parentNode.type === 'function') {
                break;
              }
              parentNode = parentNode.parent;
            }
          }

          issues.push({
            type: IssueType.MAGIC_NUMBER,
            category: IssueCategory.CODE_SMELL,
            severity: 'low',
            line,
            message: `Magic number '${n.text}' should be replaced with a named constant`,
            suggestion: `const DESCRIPTIVE_NAME = ${n.text}; // Explain what this number means`,
            codeSnippet,
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
   * Detect poor variable naming
   */
  private detectPoorNaming(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const badNames = new Set(['data', 'temp', 'tmp', 'foo', 'bar', 'baz']);
    const loopVariables = new Set(['i', 'j', 'k', 'l', 'm', 'n']);

    // Common acceptable abbreviations in different domains
    const commonAbbreviations = new Set([
      // Web/HTTP
      'req', 'res', 'err', 'msg', 'url', 'uri', 'api', 'id', 'db', 'ctx', 'app',
      // Functions/callbacks
      'fn', 'cb', 'acc', 'cur', 'prev', 'next',
      // Math/coordinates
      'x', 'y', 'z', 'dx', 'dy', 'dz',
      // Common short forms
      'str', 'num', 'arr', 'obj', 'val', 'key', 'idx', 'len', 'max', 'min',
      // Error handling
      'e', 'ex',
      // Configuration
      'cfg', 'env', 'opts', 'args', 'params'
    ]);

    const isInLoopContext = (n: Parser.SyntaxNode): boolean => {
      let parent = n.parent;
      while (parent) {
        if (parent.type === 'for_statement' ||
            parent.type === 'for_in_statement' ||
            parent.type === 'while_statement') {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    };

    const isCallbackParam = (n: Parser.SyntaxNode): boolean => {
      // Check if this identifier is a parameter in an arrow function or callback
      let parent = n.parent;
      while (parent) {
        if (parent.type === 'arrow_function' || parent.type === 'function_expression') {
          // Check if it's a common callback pattern like (a, b) => a - b
          const params = parent.childForFieldName('parameters');
          if (params && params.namedChildCount <= 2) {
            return true;
          }
        }
        parent = parent.parent;
      }
      return false;
    };

    const isCatchParam = (n: Parser.SyntaxNode): boolean => {
      let parent = n.parent;
      while (parent && parent.type !== 'program') {
        if (parent.type === 'catch_clause') {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    };

    const checkIdentifier = (n: Parser.SyntaxNode) => {
      if (n.type === 'identifier') {
        const name = n.text;
        const line = n.startPosition.row + 1;

        // Skip common loop variables if they're in a loop context
        if (loopVariables.has(name) && isInLoopContext(n)) {
          return;
        }

        // Skip common abbreviations
        if (commonAbbreviations.has(name.toLowerCase())) {
          return;
        }

        // Skip callback parameters with short names
        if (isCallbackParam(n)) {
          return;
        }

        // Skip error parameters in catch blocks
        if ((name === 'e' || name === 'err' || name === 'error') && isCatchParam(n)) {
          return;
        }

        // Check for single letter (excluding allowed cases) or common bad names
        if ((name.length === 1 && !loopVariables.has(name) && !commonAbbreviations.has(name)) ||
            badNames.has(name.toLowerCase())) {
          issues.push({
            type: IssueType.POOR_NAMING,
            category: IssueCategory.CODE_SMELL,
            severity: 'low',
            line,
            message: `Poor variable name '${name}' - use descriptive names`,
            suggestion: 'Choose a name that describes what the variable represents',
            codeSnippet: this.getLineContent(line),
          });
        }
      }
    };

    const traverse = (n: Parser.SyntaxNode) => {
      // Check variable declarations
      if (n.type === 'variable_declarator') {
        const nameNode = n.childForFieldName('name');
        if (nameNode) checkIdentifier(nameNode);
      }

      // Check function parameters
      if (n.type === 'formal_parameters' || n.type === 'parameters') {
        for (const child of n.children) {
          if (child.type === 'identifier' || child.type === 'required_parameter') {
            checkIdentifier(child);
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
   * Detect console.log statements (debug code left behind)
   * Allows console.error, console.warn, console.info as they're proper logging methods
   */
  private detectConsoleLog(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Check if the file uses a proper logging framework
    const usesLoggingFramework = (): boolean => {
      const loggingFrameworks = [
        'winston', 'bunyan', 'pino', 'log4js', 'loglevel',
        'logger', 'Logger', 'log.', 'logging'
      ];

      return loggingFrameworks.some(framework => this.code.includes(framework));
    };

    // Check if this appears to be a test or development file
    const isTestOrDevFile = (): boolean => {
      const lines = this.code.split('\n').slice(0, 50); // Check first 50 lines
      const header = lines.join('\n').toLowerCase();

      return header.includes('test') ||
             header.includes('spec') ||
             header.includes('debug') ||
             header.includes('development') ||
             header.includes('example') ||
             header.includes('demo');
    };

    // If file uses a logging framework or is a test file, be more lenient
    const hasProperLogging = usesLoggingFramework();
    const isDevFile = isTestOrDevFile();

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'call_expression') {
        const functionNode = n.childForFieldName('function');
        if (functionNode && functionNode.type === 'member_expression') {
          const objectNode = functionNode.childForFieldName('object');
          const propertyNode = functionNode.childForFieldName('property');

          // Only flag console.log, not console.error/warn/info
          if (objectNode?.text === 'console' && propertyNode?.text === 'log') {
            // Skip if file has proper logging framework or is a dev/test file
            if (hasProperLogging || isDevFile) {
              return;
            }

            const line = n.startPosition.row + 1;
            // Extract code from parent statement node for better context
            let codeSnippet = n.text.trim();
            if (n.parent && n.parent.type === 'expression_statement') {
              codeSnippet = n.parent.text.trim();
            }

            issues.push({
              type: IssueType.CONSOLE_LOG,
              category: IssueCategory.CODE_SMELL,
              severity: 'low',
              line,
              message: 'console.log() statement found - remove before production',
              suggestion: 'Use a proper logging library (winston, pino, etc.) or console.error/warn/info for intentional logging',
              codeSnippet,
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
   * Detect empty catch blocks (without explanatory comments)
   */
  private detectEmptyCatch(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const hasExplanatoryComment = (bodyNode: Parser.SyntaxNode): boolean => {
      // Get the line range of the catch block
      const startLine = bodyNode.startPosition.row;
      const endLine = bodyNode.endPosition.row;

      // Check if there's a comment in the catch block explaining the empty catch
      const lines = this.code.split('\n');
      for (let i = startLine; i <= endLine; i++) {
        const line = lines[i]?.toLowerCase() || '';
        // Look for comments indicating intentional empty catch
        if (line.includes('//') || line.includes('/*')) {
          if (line.includes('intentional') ||
              line.includes('ignore') ||
              line.includes('expected') ||
              line.includes('optional') ||
              line.includes('no-op') ||
              line.includes('noop') ||
              line.includes('safe to ignore')) {
            return true;
          }
        }
      }
      return false;
    };

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'catch_clause') {
        const bodyNode = n.childForFieldName('body');
        if (bodyNode && this.isEmptyBlock(bodyNode)) {
          // Skip if there's an explanatory comment
          if (hasExplanatoryComment(bodyNode)) {
            return;
          }

          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.EMPTY_CATCH,
            category: IssueCategory.MAINTAINABILITY,
            severity: 'medium',
            line,
            message: 'Empty catch block - errors are being silently ignored',
            suggestion: 'Handle the error appropriately, log it, or add a comment explaining why it\'s intentionally ignored',
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
   * Detect TODO/FIXME comments
   */
  private detectTodoComments(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = this.code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      if (trimmed.includes('TODO') || trimmed.includes('FIXME') || trimmed.includes('HACK')) {
        const keyword = trimmed.includes('FIXME') ? 'FIXME' : trimmed.includes('HACK') ? 'HACK' : 'TODO';
        issues.push({
          type: IssueType.TODO_COMMENT,
          category: IssueCategory.MAINTAINABILITY,
          severity: keyword === 'FIXME' ? 'medium' : 'low',
          line: lineNum,
          message: `${keyword} comment found - track as technical debt`,
          suggestion: 'Create a ticket to address this properly',
          codeSnippet: trimmed,
        });
      }
    });

    return issues;
  }

  /**
   * Detect use of == instead of ===
   */
  private detectTypeCoercion(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const isNullCheck = (n: Parser.SyntaxNode): boolean => {
      // Allow == null and != null as it's a common intentional pattern
      // to check for both null and undefined
      const left = n.childForFieldName('left');
      const right = n.childForFieldName('right');

      return (left?.text === 'null' || right?.text === 'null') ||
             (left?.text === 'undefined' || right?.text === 'undefined');
    };

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'binary_expression') {
        const operator = n.childForFieldName('operator');
        if (operator && (operator.text === '==' || operator.text === '!=')) {
          // Skip intentional null/undefined checks
          if (isNullCheck(n)) {
            return;
          }

          const line = n.startPosition.row + 1;
          const replacement = operator.text === '==' ? '===' : '!==';
          issues.push({
            type: IssueType.TYPE_COERCION,
            category: IssueCategory.MAINTAINABILITY,
            severity: 'medium',
            line,
            message: `Using '${operator.text}' instead of '${replacement}' - can cause unexpected behavior`,
            suggestion: `Use '${replacement}' for strict equality comparison (or use == null if checking for null/undefined)`,
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
   * Detect unused variables
   */
  private detectUnusedVariables(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const declaredVars = new Map<string, { line: number; node: Parser.SyntaxNode }>(); // name -> {line, node}
    const usedVars = new Set<string>();

    // Collect all variable declarations
    const collectDeclarations = (n: Parser.SyntaxNode) => {
      if (n.type === 'variable_declarator') {
        const nameNode = n.childForFieldName('name');
        if (nameNode && nameNode.type === 'identifier') {
          declaredVars.set(nameNode.text, {
            line: nameNode.startPosition.row + 1,
            node: n,
          });
        }
      }

      for (const child of n.children) {
        collectDeclarations(child);
      }
    };

    // Collect all identifier usages
    const collectUsages = (n: Parser.SyntaxNode) => {
      if (n.type === 'identifier' && n.parent?.type !== 'variable_declarator') {
        usedVars.add(n.text);
      }

      for (const child of n.children) {
        collectUsages(child);
      }
    };

    collectDeclarations(node);
    collectUsages(node);

    // Find unused variables
    declaredVars.forEach((varInfo, name) => {
      if (!usedVars.has(name) && !name.startsWith('_')) {
        // Get the full variable declaration statement
        let declarationNode = varInfo.node;
        while (declarationNode.parent && declarationNode.parent.type !== 'program' &&
               declarationNode.parent.type !== 'statement_block' &&
               declarationNode.parent.type !== 'function') {
          if (declarationNode.parent.type === 'variable_declaration' ||
              declarationNode.parent.type === 'lexical_declaration') {
            declarationNode = declarationNode.parent;
            break;
          }
          declarationNode = declarationNode.parent;
        }

        issues.push({
          type: IssueType.DEAD_CODE,
          category: IssueCategory.CODE_SMELL,
          severity: 'low',
          line: varInfo.line,
          message: `Variable '${name}' is declared but never used`,
          suggestion: 'Remove unused variable or prefix with _ if intentionally unused',
          codeSnippet: declarationNode.text.trim(),
        });
      }
    });

    return issues;
  }

  // Helper methods

  private isArrayIndex(node: Parser.SyntaxNode): boolean {
    const parent = node.parent;
    return parent?.type === 'subscript_expression';
  }

  private isEmptyBlock(node: Parser.SyntaxNode): boolean {
    if (node.type !== 'statement_block') return false;
    // Check if only has braces (no actual statements)
    const statements = node.children.filter(child =>
      child.type !== '{' && child.type !== '}'
    );
    return statements.length === 0;
  }

  private getLineContent(line: number): string {
    const lines = this.code.split('\n');
    return lines[line - 1]?.trim() || '';
  }
}
