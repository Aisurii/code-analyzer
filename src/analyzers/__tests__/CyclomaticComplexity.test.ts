import { CyclomaticComplexityCalculator } from '../CyclomaticComplexity';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';

describe('CyclomaticComplexityCalculator', () => {
  let calculator: CyclomaticComplexityCalculator;
  let parser: Parser;

  beforeEach(() => {
    calculator = new CyclomaticComplexityCalculator('javascript');
    parser = new Parser();
    parser.setLanguage(JavaScript);
  });

  it('should calculate complexity 1 for simple function', () => {
    const code = `
      function simple() {
        return 1;
      }
    `;
    const tree = parser.parse(code);
    const functionNode = tree.rootNode.descendantsOfType('function_declaration')[0];
    const complexity = calculator.calculate(functionNode);
    expect(complexity).toBe(1);
  });

  it('should calculate complexity 2 for function with if statement', () => {
    const code = `
      function withIf(x) {
        if (x > 0) {
          return 1;
        }
        return 0;
      }
    `;
    const tree = parser.parse(code);
    const functionNode = tree.rootNode.descendantsOfType('function_declaration')[0];
    const complexity = calculator.calculate(functionNode);
    expect(complexity).toBe(2);
  });

  it('should calculate complexity 3 for function with if-else', () => {
    const code = `
      function withIfElse(x) {
        if (x > 0) {
          return 1;
        } else {
          return -1;
        }
      }
    `;
    const tree = parser.parse(code);
    const functionNode = tree.rootNode.descendantsOfType('function_declaration')[0];
    const complexity = calculator.calculate(functionNode);
    expect(complexity).toBe(3);
  });

  it('should calculate complexity for function with loops', () => {
    const code = `
      function withLoop(arr) {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] > 0) {
            return i;
          }
        }
        return -1;
      }
    `;
    const tree = parser.parse(code);
    const functionNode = tree.rootNode.descendantsOfType('function_declaration')[0];
    const complexity = calculator.calculate(functionNode);
    expect(complexity).toBeGreaterThanOrEqual(3); // for + if
  });

  it('should calculate complexity for function with switch statement', () => {
    const code = `
      function withSwitch(x) {
        switch(x) {
          case 1:
            return 'one';
          case 2:
            return 'two';
          default:
            return 'other';
        }
      }
    `;
    const tree = parser.parse(code);
    const functionNode = tree.rootNode.descendantsOfType('function_declaration')[0];
    const complexity = calculator.calculate(functionNode);
    expect(complexity).toBeGreaterThanOrEqual(3); // switch + 2 cases
  });

  it('should calculate complexity for function with logical operators', () => {
    const code = `
      function withLogical(a, b, c) {
        if (a && b || c) {
          return true;
        }
        return false;
      }
    `;
    const tree = parser.parse(code);
    const functionNode = tree.rootNode.descendantsOfType('function_declaration')[0];
    const complexity = calculator.calculate(functionNode);
    expect(complexity).toBeGreaterThanOrEqual(4); // if + && + ||
  });
});
