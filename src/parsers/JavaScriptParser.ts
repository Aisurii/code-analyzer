import Parser from 'tree-sitter';
// @ts-ignore - tree-sitter language packages don't have types
import JavaScript from 'tree-sitter-javascript';
// @ts-ignore
import TypeScript from 'tree-sitter-typescript';
import { BaseParser } from './BaseParser';
import { FileAnalysis, FunctionInfo, ComplexityMetrics, CodeIssue, IssueType, IssueCategory, DEFAULT_CONFIG } from '../types';
import { CyclomaticComplexityCalculator } from '../analyzers/CyclomaticComplexity';
import { CognitiveComplexityCalculator } from '../analyzers/CognitiveComplexity';
import { CodeSmellDetector } from '../analyzers/CodeSmellDetector';
import { PerformanceDetector } from '../analyzers/PerformanceDetector';
import { SecurityDetector } from '../analyzers/SecurityDetector';
import { MemoryLeakDetector } from '../analyzers/MemoryLeakDetector';
import { ArchitectureDetector } from '../analyzers/ArchitectureDetector';
import { FixGenerator } from '../analyzers/FixGenerator';

export class JavaScriptParser extends BaseParser {
  private cyclomaticCalc: CyclomaticComplexityCalculator;
  private cognitiveCalc: CognitiveComplexityCalculator;
  private isTypeScript: boolean;

  constructor(isTypeScript = false) {
    super(isTypeScript ? 'TypeScript' : 'JavaScript');
    this.isTypeScript = isTypeScript;

    // Set the appropriate language
    if (isTypeScript) {
      this.parser.setLanguage(TypeScript.typescript);
    } else {
      this.parser.setLanguage(JavaScript);
    }

    this.cyclomaticCalc = new CyclomaticComplexityCalculator(
      isTypeScript ? 'typescript' : 'javascript'
    );
    this.cognitiveCalc = new CognitiveComplexityCalculator(
      isTypeScript ? 'typescript' : 'javascript'
    );
  }

  getSupportedExtensions(): string[] {
    return this.isTypeScript ? ['.ts', '.tsx'] : ['.js', '.jsx'];
  }

  parse(code: string, filePath: string): FileAnalysis {
    const tree = this.parser.parse(code);
    const root = tree.rootNode;

    const lineCount = this.countLines(code);
    const functions = this.analyzeFunctions(root, code);
    const overallMetrics = this.calculateOverallMetrics(functions, lineCount);

    // Run file-level architecture detection (God Class, Tight Coupling)
    const architectureDetector = new ArchitectureDetector(code);
    const fileIssues = architectureDetector.detectArchitectureIssues(root);

    // Add file-level issues to the first function (or create a pseudo-function for display)
    if (fileIssues.length > 0 && functions.length > 0) {
      functions[0].issues.push(...fileIssues);
    }

    return {
      filePath,
      language: this.languageName,
      overallMetrics,
      functions,
      classes: [], // TODO: Implement class analysis
      totalIssues: functions.reduce((sum, fn) => sum + fn.issues.length, 0),
      analysisDate: new Date(),
    };
  }

  private analyzeFunctions(root: Parser.SyntaxNode, code: string): FunctionInfo[] {
    const functionTypes = [
      'function_declaration',
      'function',
      'arrow_function',
      'method_definition',
      'function_expression',
    ];

    const functionNodes = this.extractFunctions(root, functionTypes);
    return functionNodes.map(node => this.analyzeFunction(node, code));
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
    const parameterCount = this.countParameters(node);

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

    // Detect code smells, performance, security, memory leaks, and architecture issues
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
      'do_statement',
      'switch_statement',
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
        suggestion: 'Consider using an options object or splitting the function',
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
      functionLength: 0, // Not applicable for overall
      parameterCount: 0, // Not applicable for overall
    };
  }
}
