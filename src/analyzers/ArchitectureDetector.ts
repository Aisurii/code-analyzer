import Parser from 'tree-sitter';
import { CodeIssue, IssueType, IssueCategory } from '../types';

/**
 * Detects architectural and design issues
 */
export class ArchitectureDetector {
  private code: string;

  constructor(code: string) {
    this.code = code;
  }

  /**
   * Detect all architectural issues
   */
  detectArchitectureIssues(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    issues.push(...this.detectGodClass(node));
    issues.push(...this.detectFeatureEnvy(node));
    issues.push(...this.detectTightCoupling(node));
    issues.push(...this.detectMissingAbstraction(node));

    return issues;
  }

  /**
   * Detect God Class - class with too many methods/responsibilities
   */
  private detectGodClass(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'class_declaration' || n.type === 'class') {
        const className = this.getClassName(n);
        const methods = this.getClassMethods(n);
        const methodCount = methods.length;

        // God class threshold: >10 methods
        if (methodCount > 10) {
          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.GOD_CLASS,
            category: IssueCategory.ARCHITECTURE,
            severity: methodCount > 20 ? 'critical' : 'high',
            line,
            message: `Class '${className}' has ${methodCount} methods - likely has too many responsibilities (God Class)`,
            suggestion: `Consider splitting into multiple smaller classes. Single Responsibility Principle suggests ${Math.ceil(methodCount / 10)} separate classes.`,
            codeSnippet: this.getLineContent(line),
          });
        }

        // Check for methods with unrelated names (different domains)
        const domains = this.identifyMethodDomains(methods);
        if (domains.size > 3 && methodCount > 5) {
          const line = n.startPosition.row + 1;
          issues.push({
            type: IssueType.GOD_CLASS,
            category: IssueCategory.ARCHITECTURE,
            severity: 'high',
            line,
            message: `Class '${className}' handles ${domains.size} different concerns: ${Array.from(domains).join(', ')}`,
            suggestion: 'Split class by concern/domain (e.g., separate Email, Payment, User logic)',
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
   * Detect Feature Envy - method using another object's data excessively
   */
  private detectFeatureEnvy(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'method_definition' || n.type === 'function_declaration') {
        const externalAccess = this.countExternalPropertyAccess(n);

        // If accessing another object's properties >3 times
        Object.entries(externalAccess).forEach(([objectName, count]) => {
          if (count > 3 && objectName !== 'this' && objectName !== 'self') {
            const line = n.startPosition.row + 1;
            const methodName = this.getMethodName(n);

            issues.push({
              type: IssueType.FEATURE_ENVY,
              category: IssueCategory.ARCHITECTURE,
              severity: 'medium',
              line,
              message: `Method '${methodName}' accesses '${objectName}' properties ${count} times - Feature Envy`,
              suggestion: `Consider moving this logic into '${objectName}' class or create a new class to handle this behavior`,
              codeSnippet: this.getLineContent(line),
            });
          }
        });
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return issues;
  }

  /**
   * Detect tight coupling - too many dependencies
   */
  private detectTightCoupling(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const imports = this.countImports(node);

    if (imports.count > 10) {
      issues.push({
        type: IssueType.TIGHT_COUPLING,
        category: IssueCategory.ARCHITECTURE,
        severity: imports.count > 15 ? 'high' : 'medium',
        line: 1,
        message: `File has ${imports.count} imports - indicates tight coupling`,
        suggestion: 'Consider grouping related imports into facade modules or using dependency injection',
        codeSnippet: `${imports.count} import statements`,
      });
    }

    return issues;
  }

  /**
   * Detect missing abstraction - complex parameter destructuring
   */
  private detectMissingAbstraction(node: Parser.SyntaxNode): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'method_definition' || n.type === 'function_declaration') {
        const params = n.childForFieldName('parameters');

        if (params) {
          // Check for object destructuring with many properties
          const destructuredProps = this.countDestructuredProperties(params);

          if (destructuredProps > 5) {
            const line = n.startPosition.row + 1;
            const methodName = this.getMethodName(n);

            issues.push({
              type: IssueType.MISSING_ABSTRACTION,
              category: IssueCategory.ARCHITECTURE,
              severity: 'medium',
              line,
              message: `Function '${methodName}' destructures ${destructuredProps} properties - missing domain object`,
              suggestion: `Create a domain class/type to encapsulate these ${destructuredProps} properties`,
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

  private getClassName(node: Parser.SyntaxNode): string {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : '<anonymous>';
  }

  private getMethodName(node: Parser.SyntaxNode): string {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : '<anonymous>';
  }

  private getClassMethods(classNode: Parser.SyntaxNode): string[] {
    const methods: string[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'method_definition') {
        const nameNode = n.childForFieldName('name');
        if (nameNode) {
          methods.push(nameNode.text);
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(classNode);
    return methods;
  }

  private identifyMethodDomains(methods: string[]): Set<string> {
    const domains = new Set<string>();

    const domainKeywords: Record<string, string> = {
      'email': 'Email',
      'send': 'Email',
      'mail': 'Email',
      'payment': 'Payment',
      'charge': 'Payment',
      'pay': 'Payment',
      'invoice': 'Payment',
      'user': 'User',
      'auth': 'Auth',
      'login': 'Auth',
      'logout': 'Auth',
      'validate': 'Validation',
      'verify': 'Validation',
      'report': 'Reporting',
      'generate': 'Reporting',
      'log': 'Logging',
      'track': 'Logging',
      'save': 'Persistence',
      'update': 'Persistence',
      'delete': 'Persistence',
      'create': 'Persistence',
      'get': 'Query',
      'fetch': 'Query',
      'find': 'Query',
    };

    methods.forEach(method => {
      const lowerMethod = method.toLowerCase();
      let found = false;

      for (const [keyword, domain] of Object.entries(domainKeywords)) {
        if (lowerMethod.includes(keyword)) {
          domains.add(domain);
          found = true;
          break;
        }
      }

      if (!found) {
        domains.add('Other');
      }
    });

    return domains;
  }

  private countExternalPropertyAccess(node: Parser.SyntaxNode): Record<string, number> {
    const access: Record<string, number> = {};

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'member_expression') {
        const objectNode = n.childForFieldName('object');
        if (objectNode && objectNode.type === 'identifier') {
          const objName = objectNode.text;
          access[objName] = (access[objName] || 0) + 1;
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return access;
  }

  private countImports(node: Parser.SyntaxNode): { count: number } {
    let count = 0;

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'import_statement' || n.type === 'import_declaration') {
        count++;
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return { count };
  }

  private countDestructuredProperties(paramsNode: Parser.SyntaxNode): number {
    let count = 0;

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'object_pattern') {
        // Count properties in destructuring
        for (const child of n.children) {
          if (child.type === 'shorthand_property_identifier' ||
              child.type === 'pair' ||
              child.type === 'shorthand_property_identifier_pattern') {
            count++;
          }
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(paramsNode);
    return count;
  }

  private getLineContent(line: number): string {
    const lines = this.code.split('\n');
    return lines[line - 1]?.trim() || '';
  }
}
