/**
 * Code Complexity Analyzer
 * Main entry point for programmatic usage
 */

export { FileAnalyzer } from './analyzers/FileAnalyzer';
export { ConsoleReporter } from './reporters/ConsoleReporter';
export { JavaScriptParser } from './parsers/JavaScriptParser';
export { CyclomaticComplexityCalculator } from './analyzers/CyclomaticComplexity';
export { CognitiveComplexityCalculator } from './analyzers/CognitiveComplexity';
export { CodeSmellDetector } from './analyzers/CodeSmellDetector';
export { PerformanceDetector } from './analyzers/PerformanceDetector';
export { SecurityDetector } from './analyzers/SecurityDetector';
export { MemoryLeakDetector } from './analyzers/MemoryLeakDetector';
export { ArchitectureDetector } from './analyzers/ArchitectureDetector';
export { FixGenerator } from './analyzers/FixGenerator';

export type {
  ComplexityMetrics,
  FunctionInfo,
  FileAnalysis,
  ClassInfo,
  CodeIssue,
  CodeFix,
  AnalyzerConfig,
  ParserInterface,
} from './types';

export { IssueType, IssueCategory, DEFAULT_CONFIG } from './types';
