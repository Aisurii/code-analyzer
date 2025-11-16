import { JavaScriptParser } from '../JavaScriptParser';
import { IssueCategory } from '../../types';

describe('JavaScriptParser', () => {
  let parser: JavaScriptParser;

  beforeEach(() => {
    parser = new JavaScriptParser(false);
  });

  describe('getSupportedExtensions', () => {
    it('should support .js and .jsx for JavaScript', () => {
      const extensions = parser.getSupportedExtensions();
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.jsx');
    });

    it('should support .ts and .tsx for TypeScript', () => {
      const tsParser = new JavaScriptParser(true);
      const extensions = tsParser.getSupportedExtensions();
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.tsx');
    });
  });

  describe('parse', () => {
    it('should parse a simple function', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
      `;

      const result = parser.parse(code, 'test.js');

      expect(result.filePath).toBe('test.js');
      expect(result.language).toBe('JavaScript');
      expect(result.functions.length).toBe(1);
      expect(result.functions[0].name).toBe('add');
      expect(result.functions[0].metrics.parameterCount).toBe(2);
    });

    it('should detect high complexity', () => {
      const code = `
        function complex(x, y, z) {
          if (x > 0) {
            if (y > 0) {
              if (z > 0) {
                return 1;
              } else if (z < 0) {
                return -1;
              }
            }
          } else if (x < 0) {
            return 0;
          }
          return null;
        }
      `;

      const result = parser.parse(code, 'test.js');

      expect(result.functions[0].metrics.cyclomaticComplexity).toBeGreaterThan(1);
      expect(result.functions[0].metrics.nestingDepth).toBeGreaterThan(1);

      const complexityIssues = result.functions[0].issues.filter(
        i => i.category === IssueCategory.COMPLEXITY
      );
      expect(complexityIssues.length).toBeGreaterThan(0);
    });

    it('should parse classes', () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }

          subtract(a, b) {
            return a - b;
          }
        }
      `;

      const result = parser.parse(code, 'test.js');

      expect(result.classes.length).toBe(1);
      expect(result.classes[0].name).toBe('Calculator');
      expect(result.classes[0].methods.length).toBe(2);
      expect(result.classes[0].methods[0].name).toBe('add');
      expect(result.classes[0].methods[1].name).toBe('subtract');
    });

    it('should parse arrow functions', () => {
      const code = `
        const double = (x) => x * 2;
        const triple = x => x * 3;
      `;

      const result = parser.parse(code, 'test.js');

      expect(result.functions.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate overall metrics', () => {
      const code = `
        function func1() { return 1; }
        function func2() { return 2; }
        function func3() { return 3; }
      `;

      const result = parser.parse(code, 'test.js');

      expect(result.overallMetrics).toBeDefined();
      expect(result.overallMetrics.linesOfCode).toBeGreaterThan(0);
      expect(result.overallMetrics.effectiveLinesOfCode).toBeGreaterThan(0);
    });

    it('should detect code smells', () => {
      const code = `
        function hasSmells() {
          const x = 42; // magic number
          console.log(x); // console.log
          let a = 1; // poor naming
        }
      `;

      const result = parser.parse(code, 'test.js');

      const codeSmells = result.functions[0].issues.filter(
        i => i.category === IssueCategory.CODE_SMELL
      );
      expect(codeSmells.length).toBeGreaterThan(0);
    });

    it('should detect security issues', () => {
      const code = `
        function unsafe(input) {
          eval(input);
          document.getElementById('div').innerHTML = input;
        }
      `;

      const result = parser.parse(code, 'test.js');

      const securityIssues = result.functions[0].issues.filter(
        i => i.category === IssueCategory.SECURITY
      );
      expect(securityIssues.length).toBeGreaterThan(0);
    });

    it('should detect performance issues', () => {
      const code = `
        function slow(arr) {
          for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length; j++) {
              document.querySelector('.item');
            }
          }
        }
      `;

      const result = parser.parse(code, 'test.js');

      const perfIssues = result.functions[0].issues.filter(
        i => i.category === IssueCategory.PERFORMANCE
      );
      expect(perfIssues.length).toBeGreaterThan(0);
    });

    it('should handle empty files', () => {
      const code = '';

      const result = parser.parse(code, 'test.js');

      expect(result.functions.length).toBe(0);
      expect(result.classes.length).toBe(0);
      expect(result.totalIssues).toBe(0);
    });

    it('should count total issues correctly', () => {
      const code = `
        function test() {
          eval('1+1');
          console.log('test');
        }
      `;

      const result = parser.parse(code, 'test.js');

      const manualCount = result.functions.reduce((sum, fn) => sum + fn.issues.length, 0) +
        result.classes.reduce((sum, cls) =>
          sum + cls.methods.reduce((methodSum, method) => methodSum + method.issues.length, 0), 0);

      expect(result.totalIssues).toBe(manualCount);
    });
  });
});
