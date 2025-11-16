import Parser from 'tree-sitter';
import { CodeIssue, IssueType, IssueCategory } from '../types';

/**
 * Detects security vulnerabilities in code
 */
export class SecurityDetector {
  private code: string;

  constructor(code: string) {
    this.code = code;
  }

  /**
   * Detect all security issues in a node
   */
  detectSecurityIssues(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    issues.push(...this.detectEvalUsage(node));
    issues.push(...this.detectInnerHTMLUsage(node));
    issues.push(...this.detectHardcodedSecrets(node));
    issues.push(...this.detectSQLInjectionRisk(node));

    return issues;
  }

  /**
   * Detect eval() usage
   */
  private detectEvalUsage(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'call_expression') {
        const functionNode = n.childForFieldName('function');

        if (functionNode?.type === 'identifier' && functionNode.text === 'eval') {
          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.EVAL_USAGE,
            category: IssueCategory.SECURITY,
            severity: 'critical',
            line,
            message: 'eval() is dangerous - can execute arbitrary code',
            suggestion: 'Use safer alternatives like JSON.parse() or avoid dynamic code execution',
            codeSnippet: this.getLineContent(line),
          });
        }

        // Also check for Function constructor
        if (functionNode?.type === 'identifier' && functionNode.text === 'Function') {
          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.EVAL_USAGE,
            category: IssueCategory.SECURITY,
            severity: 'critical',
            line,
            message: 'Function constructor is similar to eval() - security risk',
            suggestion: 'Avoid dynamic code generation',
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
   * Detect innerHTML usage (XSS risk)
   */
  private detectInnerHTMLUsage(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'assignment_expression' || n.type === 'augmented_assignment_expression') {
        const left = n.childForFieldName('left');

        if (left && left.type === 'member_expression') {
          const propertyNode = left.childForFieldName('property');

          if (propertyNode && (propertyNode.text === 'innerHTML' || propertyNode.text === 'outerHTML')) {
            const line = n.startPosition.row + 1;
            issues.push({
              type: IssueType.INNERHTML_USAGE,
              category: IssueCategory.SECURITY,
              severity: 'high',
              line,
              message: `${propertyNode.text} can cause XSS vulnerabilities if used with untrusted data`,
              suggestion: 'Use textContent for text, or sanitize HTML with a library like DOMPurify',
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
   * Detect hardcoded secrets (API keys, passwords, tokens)
   */
  private detectHardcodedSecrets(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const secretPatterns = [
      { pattern: /api[_-]?key/i, name: 'API key' },
      { pattern: /api[_-]?token/i, name: 'API token' },
      { pattern: /secret[_-]?key/i, name: 'secret key' },
      { pattern: /password/i, name: 'password' },
      { pattern: /bearer[_-]?token/i, name: 'bearer token' },
      { pattern: /auth[_-]?token/i, name: 'auth token' },
      { pattern: /private[_-]?key/i, name: 'private key' },
      { pattern: /access[_-]?key/i, name: 'access key' },
      { pattern: /client[_-]?secret/i, name: 'client secret' },
      { pattern: /stripe[_-]?key/i, name: 'Stripe key' },
      { pattern: /aws[_-]?secret/i, name: 'AWS secret' },
    ];

    const placeholderPatterns = [
      /YOUR_/i,
      /REPLACE/i,
      /EXAMPLE/i,
      /TEST/i,
      /DEMO/i,
      /xxx+/i,
      /\.\.\./,
      /changeme/i,
      /placeholder/i,
    ];

    const isPlaceholder = (value: string): boolean => {
      return placeholderPatterns.some(pattern => pattern.test(value));
    };

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'variable_declarator' || n.type === 'property_identifier') {
        const nameNode = n.childForFieldName('name') || n;
        const valueNode = n.childForFieldName('value');

        if (nameNode && valueNode) {
          const name = nameNode.text.toLowerCase();

          for (const { pattern, name: secretType } of secretPatterns) {
            if (pattern.test(name) && valueNode.type === 'string') {
              const value = valueNode.text;
              // Skip empty strings, short values, and obvious placeholders
              if (value.length > 6 && !isPlaceholder(value)) {
                const line = n.startPosition.row + 1;
                issues.push({
                  type: IssueType.HARDCODED_SECRET,
                  category: IssueCategory.SECURITY,
                  severity: 'critical',
                  line,
                  message: `Possible hardcoded ${secretType} detected`,
                  suggestion: 'Use environment variables or a secure secrets management system',
                  codeSnippet: this.getLineContent(line).replace(/['"].*['"]/, '"***"'),
                });
              }
            }
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
   * Detect SQL injection risks (string concatenation in SQL queries)
   */
  private detectSQLInjectionRisk(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE'];

    const traverse = (n: Parser.SyntaxNode) => {
      // Check for template literals or string concatenation with SQL keywords
      if (n.type === 'template_string' || n.type === 'binary_expression') {
        const text = n.text.toUpperCase();

        // Check if contains SQL keywords
        const hasSQLKeyword = sqlKeywords.some(keyword => text.includes(keyword));

        if (hasSQLKeyword) {
          // Check if it contains interpolation or concatenation
          const hasInterpolation = n.type === 'template_string' && n.text.includes('${');
          const isConcatenation = n.type === 'binary_expression';

          if (hasInterpolation || isConcatenation) {
            const line = n.startPosition.row + 1;
            issues.push({
              type: IssueType.SQL_INJECTION_RISK,
              category: IssueCategory.SECURITY,
              severity: 'critical',
              line,
              message: 'SQL query with string interpolation - SQL injection risk',
              suggestion: 'Use parameterized queries or prepared statements',
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

  private getLineContent(line: number): string {
    const lines = this.code.split('\n');
    return lines[line - 1]?.trim() || '';
  }
}
