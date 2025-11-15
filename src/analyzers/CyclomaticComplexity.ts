import Parser from 'tree-sitter';

/**
 * Calculate Cyclomatic Complexity
 *
 * Formula: M = E - N + 2P
 * Simplified: Count decision points + 1
 *
 * Decision points:
 * - if, else if
 * - for, while, do-while
 * - case (in switch)
 * - catch
 * - &&, ||, ??
 * - ternary operator (? :)
 */
export class CyclomaticComplexityCalculator {
  private decisionNodes: Set<string>;

  constructor(language: 'javascript' | 'typescript' | 'python') {
    this.decisionNodes = this.getDecisionNodes(language);
  }

  /**
   * Get decision node types for a specific language
   */
  private getDecisionNodes(language: string): Set<string> {
    const common = new Set([
      'if_statement',
      'for_statement',
      'while_statement',
      'do_statement',
      'switch_case',
      'catch_clause',
      'ternary_expression',
      'conditional_expression',
    ]);

    if (language === 'javascript' || language === 'typescript') {
      common.add('logical_expression'); // && and ||
      common.add('binary_expression');  // For ?? operator
    }

    if (language === 'python') {
      common.add('boolean_operator');
      common.add('elif_clause');
      common.add('except_clause');
    }

    return common;
  }

  /**
   * Calculate cyclomatic complexity for a function node
   */
  calculate(functionNode: Parser.SyntaxNode): number {
    let complexity = 1; // Base complexity

    const traverse = (node: Parser.SyntaxNode) => {
      // Count decision points
      if (this.decisionNodes.has(node.type)) {
        complexity++;

        // Special handling for logical operators (each && or || adds 1)
        if (node.type === 'logical_expression' || node.type === 'boolean_operator') {
          const operator = this.getOperator(node);
          if (operator === '&&' || operator === '||' || operator === 'and' || operator === 'or') {
            // Already counted above
          }
        }
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(functionNode);
    return complexity;
  }

  /**
   * Get operator from a binary/logical expression node
   */
  private getOperator(node: Parser.SyntaxNode): string {
    const operatorNode = node.childForFieldName('operator');
    return operatorNode ? operatorNode.text : '';
  }

  /**
   * Get complexity rating
   */
  static getRating(complexity: number): { rating: string; color: string } {
    if (complexity <= 5) return { rating: 'Simple', color: 'green' };
    if (complexity <= 10) return { rating: 'Moderate', color: 'yellow' };
    if (complexity <= 20) return { rating: 'Complex', color: 'orange' };
    return { rating: 'Very Complex', color: 'red' };
  }
}
