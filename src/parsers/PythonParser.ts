import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
import { BaseParser } from './BaseParser';
import { FileAnalysis, FunctionInfo, ComplexityMetrics, CodeIssue, IssueType, IssueCategory, DEFAULT_CONFIG, ClassInfo } from '../types';
import { CyclomaticComplexityCalculator } from '../analyzers/CyclomaticComplexity';
import { CognitiveComplexityCalculator } from '../analyzers/CognitiveComplexity';
import { CodeSmellDetector } from '../analyzers/CodeSmellDetector';
import { PerformanceDetector } from '../analyzers/PerformanceDetector';
import { SecurityDetector } from '../analyzers/SecurityDetector';
import { MemoryLeakDetector } from '../analyzers/MemoryLeakDetector';
import { ArchitectureDetector } from '../analyzers/ArchitectureDetector';
import { FixGenerator } from '../analyzers/FixGenerator';

export class PythonParser extends BaseParser {
  private cyclomaticCalc: CyclomaticComplexityCalculator;
  private cognitiveCalc: CognitiveComplexityCalculator;

  constructor() {
    super('Python');
    this.parser.setLanguage(Python);
    this.cyclomaticCalc = new CyclomaticComplexityCalculator('python');
    this.cognitiveCalc = new CognitiveComplexityCalculator('python');
  }

  getSupportedExtensions(): string[] {
    return ['.py'];
  }

  parse(code: string, filePath: string): FileAnalysis {
    const tree = this.parser.parse(code);
    const root = tree.rootNode;

    const lineCount = this.countLines(code);
    const functions = this.analyzeFunctions(root, code);
    const classes = this.analyzeClasses(root, code);
    const overallMetrics = this.calculateOverallMetrics(functions, lineCount);

    // Run file-level architecture detection
    const architectureDetector = new ArchitectureDetector(code);
    const fileIssues = architectureDetector.detectArchitectureIssues(root);

    // Add file-level issues to the first function or class
    if (fileIssues.length > 0) {
      if (functions.length > 0) {
        functions[0].issues.push(...fileIssues);
      } else if (classes.length > 0 && classes[0].methods.length > 0) {
        classes[0].methods[0].issues.push(...fileIssues);
      }
    }

    // Calculate total issues including class methods
    const classIssues = classes.reduce((sum, cls) =>
      sum + cls.methods.reduce((methodSum, method) => methodSum + method.issues.length, 0), 0);

    return {
      filePath,
      language: this.languageName,
      overallMetrics,
      functions,
      classes,
      totalIssues: functions.reduce((sum, fn) => sum + fn.issues.length, 0) + classIssues,
      analysisDate: new Date(),
    };
  }

  private analyzeFunctions(root: Parser.SyntaxNode, code: string): FunctionInfo[] {
    const functionTypes = ['function_definition'];
    const functionNodes = this.extractFunctions(root, functionTypes);

    // Filter out class methods (they'll be handled in analyzeClasses)
    const standaloneFunctions = functionNodes.filter(node => {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'class_definition') {
          return false;
        }
        parent = parent.parent;
      }
      return true;
    });

    return standaloneFunctions.map(node => this.analyzeFunction(node, code));
  }

  private analyzeClasses(root: Parser.SyntaxNode, code: string): ClassInfo[] {
    const classTypes = ['class_definition'];
    const classNodes: Parser.SyntaxNode[] = [];

    const traverse = (node: Parser.SyntaxNode) => {
      if (classTypes.includes(node.type)) {
        classNodes.push(node);
      }
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(root);
    return classNodes.map(node => this.analyzeClass(node, code));
  }

  private analyzeClass(node: Parser.SyntaxNode, code: string): ClassInfo {
    const name = this.getClassName(node);
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;

    // Extract methods from the class
    const methods: FunctionInfo[] = [];
    const classBody = node.childForFieldName('body');

    if (classBody) {
      for (const child of classBody.children) {
        if (child.type === 'function_definition') {
          const methodInfo = this.analyzeFunction(child, code);
          methods.push(methodInfo);
        }
      }
    }

    // Calculate class-level metrics
    const classMetrics = this.calculateClassMetrics(methods);

    return {
      name,
      startLine,
      endLine,
      methods,
      metrics: classMetrics,
    };
  }

  private getClassName(node: Parser.SyntaxNode): string {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'AnonymousClass';
  }

  private calculateClassMetrics(methods: FunctionInfo[]): ComplexityMetrics {
    if (methods.length === 0) {
      return this.createEmptyMetrics();
    }

    const totalCyclomatic = methods.reduce((sum, m) => sum + m.metrics.cyclomaticComplexity, 0);
    const totalCognitive = methods.reduce((sum, m) => sum + m.metrics.cognitiveComplexity, 0);
    const maxNesting = Math.max(...methods.map(m => m.metrics.nestingDepth));
    const totalLOC = methods.reduce((sum, m) => sum + m.metrics.linesOfCode, 0);
    const totalEffectiveLOC = methods.reduce((sum, m) => sum + m.metrics.effectiveLinesOfCode, 0);

    return {
      cyclomaticComplexity: Math.round((totalCyclomatic / methods.length) * 10) / 10,
      cognitiveComplexity: Math.round((totalCognitive / methods.length) * 10) / 10,
      linesOfCode: totalLOC,
      effectiveLinesOfCode: totalEffectiveLOC,
      nestingDepth: maxNesting,
      functionLength: methods.length,
      parameterCount: 0,
    };
  }

  private analyzeFunction(node: Parser.SyntaxNode, code: string): FunctionInfo {
    const name = this.getFunctionName(node);
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const functionLength = endLine - startLine + 1;

    // Calculate metrics
    const cyclomaticComplexity = this.cyclomaticCalc.calculate(node);
    const cognitiveComplexity = this.cognitiveCalc.calculate(node);
    const nestingDepth = this.calculateMaxNesting(node);
    const parameterCount = this.countPythonParameters(node);

    const functionCode = code.substring(node.startIndex, node.endIndex);
    const lineCount = this.countLines(functionCode);

    const metrics: ComplexityMetrics = {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode: lineCount.total,
      effectiveLinesOfCode: lineCount.effective,
      nestingDepth,
      functionLength,
      parameterCount,
    };

    // Detect complexity issues
    const issues = this.detectIssues(metrics, name, startLine);

    // Detect code smells, performance, and security issues
    const codeSmellDetector = new CodeSmellDetector(functionCode);
    const performanceDetector = new PerformanceDetector(functionCode);
    const securityDetector = new SecurityDetector(functionCode);
    const memoryLeakDetector = new MemoryLeakDetector(functionCode);
    const architectureDetector = new ArchitectureDetector(functionCode);

    issues.push(...codeSmellDetector.detectSmells(node));
    issues.push(...performanceDetector.detectPerformanceIssues(node));
    issues.push(...securityDetector.detectSecurityIssues(node));
    issues.push(...memoryLeakDetector.detectLeaks(node));
    issues.push(...architectureDetector.detectArchitectureIssues(node));

    // Generate fixes for issues
    const fixGenerator = new FixGenerator(functionCode);
    issues.forEach(issue => {
      const fix = fixGenerator.generateFix(issue);
      if (fix) {
        issue.fix = fix;
      }
    });

    return {
      name,
      startLine,
      endLine,
      metrics,
      issues,
    };
  }

  private calculateMaxNesting(node: Parser.SyntaxNode): number {
    let maxDepth = 0;

    const blockTypes = [
      'if_statement',
      'for_statement',
      'while_statement',
      'with_statement',
      'try_statement',
      'block',
    ];

    const traverse = (n: Parser.SyntaxNode, depth: number) => {
      const isBlock = blockTypes.includes(n.type);
      const currentDepth = isBlock ? depth + 1 : depth;

      maxDepth = Math.max(maxDepth, currentDepth);

      for (const child of n.children) {
        traverse(child, currentDepth);
      }
    };

    traverse(node, 0);
    return maxDepth;
  }

  private countPythonParameters(node: Parser.SyntaxNode): number {
    const params = node.childForFieldName('parameters');
    if (!params) return 0;

    // Count parameter nodes (excluding self, cls, parentheses, commas)
    let count = 0;
    for (const child of params.children) {
      if (child.type === 'identifier' || child.type === 'typed_parameter' ||
          child.type === 'default_parameter' || child.type === 'typed_default_parameter') {
        // Skip 'self' and 'cls' parameters
        const paramName = child.text.split(':')[0].split('=')[0].trim();
        if (paramName !== 'self' && paramName !== 'cls') {
          count++;
        }
      }
    }

    return count;
  }

  private detectIssues(metrics: ComplexityMetrics, functionName: string, line: number): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const config = DEFAULT_CONFIG;

    // High cyclomatic complexity
    if (metrics.cyclomaticComplexity > config.cyclomaticThreshold) {
      issues.push({
        type: IssueType.HIGH_COMPLEXITY,
        category: IssueCategory.COMPLEXITY,
        severity: metrics.cyclomaticComplexity > 20 ? 'critical' : 'high',
        line,
        message: `Function '${functionName}' has cyclomatic complexity of ${metrics.cyclomaticComplexity} (threshold: ${config.cyclomaticThreshold})`,
        suggestion: 'Consider breaking this function into smaller functions',
      });
    }

    // High cognitive complexity
    if (metrics.cognitiveComplexity > config.cognitiveThreshold) {
      issues.push({
        type: IssueType.HIGH_COMPLEXITY,
        category: IssueCategory.COMPLEXITY,
        severity: metrics.cognitiveComplexity > 25 ? 'critical' : 'high',
        line,
        message: `Function '${functionName}' has cognitive complexity of ${metrics.cognitiveComplexity} (threshold: ${config.cognitiveThreshold})`,
        suggestion: 'Simplify logic and reduce nesting levels',
      });
    }

    // Deep nesting
    if (metrics.nestingDepth > config.maxNestingDepth) {
      issues.push({
        type: IssueType.DEEP_NESTING,
        category: IssueCategory.COMPLEXITY,
        severity: 'medium',
        line,
        message: `Function '${functionName}' has nesting depth of ${metrics.nestingDepth} (max: ${config.maxNestingDepth})`,
        suggestion: 'Use early returns or extract nested logic into separate functions',
      });
    }

    // Long function
    if (metrics.functionLength > config.maxFunctionLength) {
      issues.push({
        type: IssueType.LONG_FUNCTION,
        category: IssueCategory.MAINTAINABILITY,
        severity: metrics.functionLength > 100 ? 'high' : 'medium',
        line,
        message: `Function '${functionName}' is ${metrics.functionLength} lines long (max: ${config.maxFunctionLength})`,
        suggestion: 'Break down into smaller, focused functions',
      });
    }

    // Too many parameters
    if (metrics.parameterCount > config.maxParameters) {
      issues.push({
        type: IssueType.TOO_MANY_PARAMETERS,
        category: IssueCategory.MAINTAINABILITY,
        severity: 'medium',
        line,
        message: `Function '${functionName}' has ${metrics.parameterCount} parameters (max: ${config.maxParameters})`,
        suggestion: 'Consider using a dictionary or dataclass for parameters',
      });
    }

    return issues;
  }

  private calculateOverallMetrics(functions: FunctionInfo[], lineCount: { total: number; effective: number }): ComplexityMetrics {
    if (functions.length === 0) {
      return {
        ...this.createEmptyMetrics(),
        linesOfCode: lineCount.total,
        effectiveLinesOfCode: lineCount.effective,
      };
    }

    const avgCyclomatic = functions.reduce((sum, fn) => sum + fn.metrics.cyclomaticComplexity, 0) / functions.length;
    const avgCognitive = functions.reduce((sum, fn) => sum + fn.metrics.cognitiveComplexity, 0) / functions.length;
    const maxNesting = Math.max(...functions.map(fn => fn.metrics.nestingDepth));

    return {
      cyclomaticComplexity: Math.round(avgCyclomatic * 10) / 10,
      cognitiveComplexity: Math.round(avgCognitive * 10) / 10,
      linesOfCode: lineCount.total,
      effectiveLinesOfCode: lineCount.effective,
      nestingDepth: maxNesting,
      functionLength: 0,
      parameterCount: 0,
    };
  }
}
