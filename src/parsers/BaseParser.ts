import Parser from 'tree-sitter';
import { FileAnalysis, ParserInterface, ComplexityMetrics } from '../types';

/**
 * Abstract base class for language parsers
 */
export abstract class BaseParser implements ParserInterface {
  protected parser: Parser;
  protected languageName: string;

  constructor(languageName: string) {
    this.parser = new Parser();
    this.languageName = languageName;
  }

  abstract parse(code: string, filePath: string): FileAnalysis;
  abstract getSupportedExtensions(): string[];

  getLanguageName(): string {
    return this.languageName;
  }

  /**
   * Count lines of code
   */
  protected countLines(code: string): { total: number; effective: number } {
    const lines = code.split('\n');
    const total = lines.length;

    // Count non-empty, non-comment lines
    const effective = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 &&
             !trimmed.startsWith('//') &&
             !trimmed.startsWith('/*') &&
             !trimmed.startsWith('*') &&
             !trimmed.startsWith('#');
    }).length;

    return { total, effective };
  }

  /**
   * Calculate nesting depth of a node
   */
  protected calculateNestingDepth(node: Parser.SyntaxNode, blockTypes: string[]): number {
    let depth = 0;
    let current = node.parent;

    while (current) {
      if (blockTypes.includes(current.type)) {
        depth++;
      }
      current = current.parent;
    }

    return depth;
  }

  /**
   * Extract function/method nodes from AST
   */
  protected extractFunctions(node: Parser.SyntaxNode, functionTypes: string[]): Parser.SyntaxNode[] {
    const functions: Parser.SyntaxNode[] = [];

    const traverse = (n: Parser.SyntaxNode) => {
      if (functionTypes.includes(n.type)) {
        functions.push(n);
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return functions;
  }

  /**
   * Get function name from node
   */
  protected getFunctionName(node: Parser.SyntaxNode): string {
    // Try to find name in common locations
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      return nameNode.text;
    }

    // For anonymous functions
    return '<anonymous>';
  }

  /**
   * Count parameters of a function
   */
  protected countParameters(node: Parser.SyntaxNode): number {
    const params = node.childForFieldName('parameters');
    if (!params) return 0;

    // Count non-punctuation children
    return params.children.filter(child =>
      !['(', ')', ','].includes(child.type)
    ).length;
  }

  /**
   * Initialize base metrics
   */
  protected createEmptyMetrics(): ComplexityMetrics {
    return {
      cyclomaticComplexity: 1,
      cognitiveComplexity: 0,
      linesOfCode: 0,
      effectiveLinesOfCode: 0,
      nestingDepth: 0,
      functionLength: 0,
      parameterCount: 0,
    };
  }
}
