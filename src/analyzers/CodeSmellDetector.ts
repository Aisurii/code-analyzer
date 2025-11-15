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
    const acceptableNumbers = new Set([0, 1, -1, 2, 10, 100, 1000]);

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'number') {
        const value = parseInt(n.text, 10);
        const line = n.startPosition.row + 1;

        // Skip acceptable numbers and array indices
        if (!acceptableNumbers.has(value) && !this.isArrayIndex(n)) {
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
    const badNames = new Set(['x', 'y', 'z', 'data', 'temp', 'tmp', 'foo', 'bar', 'baz', 'obj', 'arr']);

    const checkIdentifier = (n: Parser.SyntaxNode) => {
      if (n.type === 'identifier') {
        const name = n.text;
        const line = n.startPosition.row + 1;

        // Check for single letter or common bad names
        if (name.length === 1 || badNames.has(name.toLowerCase())) {
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
   */
  private detectConsoleLog(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'call_expression') {
        const functionNode = n.childForFieldName('function');
        if (functionNode && functionNode.type === 'member_expression') {
          const objectNode = functionNode.childForFieldName('object');
          const propertyNode = functionNode.childForFieldName('property');

          if (objectNode?.text === 'console' && propertyNode?.text === 'log') {
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
              suggestion: 'Use a proper logging library or remove debug statements',
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
   * Detect empty catch blocks
   */
  private detectEmptyCatch(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'catch_clause') {
        const bodyNode = n.childForFieldName('body');
        if (bodyNode && this.isEmptyBlock(bodyNode)) {
          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.EMPTY_CATCH,
            category: IssueCategory.MAINTAINABILITY,
            severity: 'medium',
            line,
            message: 'Empty catch block - errors are being silently ignored',
            suggestion: 'Handle the error appropriately or at least log it',
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

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'binary_expression') {
        const operator = n.childForFieldName('operator');
        if (operator && (operator.text === '==' || operator.text === '!=')) {
          const line = n.startPosition.row + 1;
          const replacement = operator.text === '==' ? '===' : '!==';
          issues.push({
            type: IssueType.TYPE_COERCION,
            category: IssueCategory.MAINTAINABILITY,
            severity: 'medium',
            line,
            message: `Using '${operator.text}' instead of '${replacement}' - can cause unexpected behavior`,
            suggestion: `Use '${replacement}' for strict equality comparison`,
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
