import Parser from 'tree-sitter';

/**
 * Calculate Cognitive Complexity
 *
 * Measures how difficult code is to understand
 * More sophisticated than cyclomatic complexity
 *
 * Rules:
 * 1. Increment for breaks in linear flow (if, for, while, etc.)
 * 2. Increment for nesting (each level adds to increment)
 * 3. Don't increment for else if (it's continuation of if)
 * 4. Binary logical operators increment
 */
export class CognitiveComplexityCalculator {
  private breakFlowNodes: Set<string>;

  constructor(language: 'javascript' | 'typescript' | 'python') {
    this.breakFlowNodes = this.getBreakFlowNodes(language);
  }

  private getBreakFlowNodes(language: string): Set<string> {
    const common = new Set([
      'if_statement',
      'for_statement',
      'while_statement',
      'do_statement',
      'switch_statement',
      'catch_clause',
      'ternary_expression',
      'conditional_expression',
    ]);

    if (language === 'python') {
      common.add('except_clause');
      common.add('with_statement');
    }

    return common;
  }

  /**
   * Calculate cognitive complexity
   */
  calculate(functionNode: Parser.SyntaxNode): number {
    let complexity = 0;
    let nestingLevel = 0;

    const traverse = (node: Parser.SyntaxNode, parentNesting: number) => {
      const isBreakFlow = this.breakFlowNodes.has(node.type);

      if (isBreakFlow) {
        // Add 1 + nesting level
        complexity += 1 + parentNesting;

        // Special case: else if doesn't increase complexity
        if (this.isElseIf(node)) {
          complexity -= (1 + parentNesting); // Undo the addition
        }

        // Increase nesting for children
        nestingLevel = parentNesting + 1;
      } else {
        nestingLevel = parentNesting;
      }

      // Binary logical operators (&&, ||)
      if (this.isLogicalOperator(node)) {
        complexity += 1;
      }

      // Recursion and loops add complexity
      if (this.isRecursiveCall(node, functionNode)) {
        complexity += 1;
      }

      // Traverse children with appropriate nesting
      for (const child of node.children) {
        traverse(child, nestingLevel);
      }
    };

    traverse(functionNode, 0);
    return complexity;
  }

  /**
   * Check if node is an else-if statement
   */
  private isElseIf(node: Parser.SyntaxNode): boolean {
    if (node.type !== 'if_statement') return false;

    const parent = node.parent;
    if (!parent) return false;

    // Check if this if_statement is the child of an else clause
    return parent.type === 'else_clause';
  }

  /**
   * Check if node is a logical operator (&& or ||)
   */
  private isLogicalOperator(node: Parser.SyntaxNode): boolean {
    if (node.type === 'logical_expression' || node.type === 'boolean_operator') {
      const operator = node.childForFieldName('operator');
      if (operator) {
        const op = operator.text;
        return op === '&&' || op === '||' || op === 'and' || op === 'or';
      }
    }
    return false;
  }

  /**
   * Check if node is a recursive call
   */
  private isRecursiveCall(node: Parser.SyntaxNode, functionNode: Parser.SyntaxNode): boolean {
    if (node.type !== 'call_expression') return false;

    const functionName = this.getFunctionName(functionNode);
    const callName = this.getCallName(node);

    return functionName !== '<anonymous>' && functionName === callName;
  }

  private getFunctionName(node: Parser.SyntaxNode): string {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : '<anonymous>';
  }

  private getCallName(node: Parser.SyntaxNode): string {
    const functionField = node.childForFieldName('function');
    return functionField ? functionField.text : '';
  }

  /**
   * Get complexity rating
   */
  static getRating(complexity: number): { rating: string; color: string } {
    if (complexity <= 5) return { rating: 'Simple', color: 'green' };
    if (complexity <= 10) return { rating: 'Moderate', color: 'yellow' };
    if (complexity <= 15) return { rating: 'Complex', color: 'orange' };
    return { rating: 'Very Complex', color: 'red' };
  }
}
