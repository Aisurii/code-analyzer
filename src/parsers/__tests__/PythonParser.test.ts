import { PythonParser } from '../PythonParser';

describe('PythonParser', () => {
  let parser: PythonParser;

  beforeEach(() => {
    parser = new PythonParser();
  });

  describe('getSupportedExtensions', () => {
    it('should support .py extension', () => {
      const extensions = parser.getSupportedExtensions();
      expect(extensions).toContain('.py');
    });
  });

  describe('parse', () => {
    it('should parse a simple Python function', () => {
      const code = `
def add(a, b):
    return a + b
      `;

      const result = parser.parse(code, 'test.py');

      expect(result.filePath).toBe('test.py');
      expect(result.language).toBe('Python');
      expect(result.functions.length).toBe(1);
      expect(result.functions[0].name).toBe('add');
      expect(result.functions[0].metrics.parameterCount).toBe(2);
    });

    it('should parse Python classes', () => {
      const code = `
class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b
      `;

      const result = parser.parse(code, 'test.py');

      expect(result.classes.length).toBe(1);
      expect(result.classes[0].name).toBe('Calculator');
      expect(result.classes[0].methods.length).toBe(2);
    });

    it('should not count self parameter in Python methods', () => {
      const code = `
class MyClass:
    def method(self, param1, param2):
        pass
      `;

      const result = parser.parse(code, 'test.py');

      const method = result.classes[0].methods[0];
      // Should not count 'self'
      expect(method.metrics.parameterCount).toBe(2);
    });

    it('should not count cls parameter in class methods', () => {
      const code = `
class MyClass:
    @classmethod
    def method(cls, param1):
        pass
      `;

      const result = parser.parse(code, 'test.py');

      const method = result.classes[0].methods[0];
      // Should not count 'cls'
      expect(method.metrics.parameterCount).toBe(1);
    });

    it('should detect high complexity in Python', () => {
      const code = `
def complex_function(x, y, z):
    if x > 0:
        if y > 0:
            if z > 0:
                return 1
            elif z < 0:
                return -1
    elif x < 0:
        return 0
    return None
      `;

      const result = parser.parse(code, 'test.py');

      expect(result.functions[0].metrics.cyclomaticComplexity).toBeGreaterThan(1);
      expect(result.functions[0].metrics.nestingDepth).toBeGreaterThan(1);
    });

    it('should separate module-level functions from class methods', () => {
      const code = `
def module_function():
    return 1

class MyClass:
    def class_method(self):
        return 2

def another_module_function():
    return 3
      `;

      const result = parser.parse(code, 'test.py');

      // Should have 2 module-level functions
      expect(result.functions.length).toBe(2);
      expect(result.functions[0].name).toBe('module_function');
      expect(result.functions[1].name).toBe('another_module_function');

      // Should have 1 class with 1 method
      expect(result.classes.length).toBe(1);
      expect(result.classes[0].methods.length).toBe(1);
    });

    it('should calculate overall metrics for Python', () => {
      const code = `
def func1():
    return 1

def func2():
    return 2
      `;

      const result = parser.parse(code, 'test.py');

      expect(result.overallMetrics).toBeDefined();
      expect(result.overallMetrics.linesOfCode).toBeGreaterThan(0);
      expect(result.overallMetrics.effectiveLinesOfCode).toBeGreaterThan(0);
    });

    it('should handle empty Python files', () => {
      const code = '';

      const result = parser.parse(code, 'test.py');

      expect(result.functions.length).toBe(0);
      expect(result.classes.length).toBe(0);
      expect(result.totalIssues).toBe(0);
    });

    it('should detect nested loops in Python', () => {
      const code = `
def nested_loops(matrix):
    for row in matrix:
        for item in row:
            if item > 0:
                return item
      `;

      const result = parser.parse(code, 'test.py');

      expect(result.functions[0].metrics.cyclomaticComplexity).toBeGreaterThan(2);
    });
  });
});
