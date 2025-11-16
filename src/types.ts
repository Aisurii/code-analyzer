/**
 * Core types for the Code Complexity Analyzer
 */

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  effectiveLinesOfCode: number;
  nestingDepth: number;
  functionLength: number;
  parameterCount: number;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  metrics: ComplexityMetrics;
  issues: CodeIssue[];
}

export interface FileAnalysis {
  filePath: string;
  language: string;
  overallMetrics: ComplexityMetrics;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  totalIssues: number;
  analysisDate: Date;
}

export interface ClassInfo {
  name: string;
  startLine: number;
  endLine: number;
  methods: FunctionInfo[];
  metrics: ComplexityMetrics;
}

export interface CodeFix {
  description: string;
  originalCode: string;
  fixedCode: string;
  automated: boolean;
}

export interface CodeIssue {
  type: IssueType;
  category: IssueCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  message: string;
  suggestion?: string;
  codeSnippet?: string;
  fix?: CodeFix;
}

export enum IssueCategory {
  COMPLEXITY = 'COMPLEXITY',
  CODE_SMELL = 'CODE_SMELL',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  MAINTAINABILITY = 'MAINTAINABILITY',
  MEMORY_LEAK = 'MEMORY_LEAK',
  ARCHITECTURE = 'ARCHITECTURE',
}

export enum IssueType {
  // Complexity issues
  HIGH_COMPLEXITY = 'HIGH_COMPLEXITY',
  DEEP_NESTING = 'DEEP_NESTING',
  LONG_FUNCTION = 'LONG_FUNCTION',
  TOO_MANY_PARAMETERS = 'TOO_MANY_PARAMETERS',

  // Code smells
  MAGIC_NUMBER = 'MAGIC_NUMBER',
  POOR_NAMING = 'POOR_NAMING',
  DUPLICATED_CODE = 'DUPLICATED_CODE',
  DEAD_CODE = 'DEAD_CODE',
  CONSOLE_LOG = 'CONSOLE_LOG',
  EMPTY_CATCH = 'EMPTY_CATCH',
  TODO_COMMENT = 'TODO_COMMENT',
  COMMENTED_CODE = 'COMMENTED_CODE',
  TYPE_COERCION = 'TYPE_COERCION',

  // Performance issues
  NESTED_LOOPS = 'NESTED_LOOPS',
  DOM_IN_LOOP = 'DOM_IN_LOOP',
  STRING_CONCAT_IN_LOOP = 'STRING_CONCAT_IN_LOOP',
  REGEX_IN_LOOP = 'REGEX_IN_LOOP',
  INEFFICIENT_ARRAY_OPS = 'INEFFICIENT_ARRAY_OPS',

  // Security issues
  EVAL_USAGE = 'EVAL_USAGE',
  INNERHTML_USAGE = 'INNERHTML_USAGE',
  HARDCODED_SECRET = 'HARDCODED_SECRET',
  SQL_INJECTION_RISK = 'SQL_INJECTION_RISK',

  // Maintainability
  POTENTIAL_BUG = 'POTENTIAL_BUG',
  MISSING_ERROR_HANDLING = 'MISSING_ERROR_HANDLING',

  // Memory leaks
  EVENT_LISTENER_LEAK = 'EVENT_LISTENER_LEAK',
  INTERVAL_LEAK = 'INTERVAL_LEAK',
  TIMEOUT_LEAK = 'TIMEOUT_LEAK',
  CLOSURE_LEAK = 'CLOSURE_LEAK',
  GLOBAL_LEAK = 'GLOBAL_LEAK',

  // Architecture issues
  GOD_CLASS = 'GOD_CLASS',
  FEATURE_ENVY = 'FEATURE_ENVY',
  TIGHT_COUPLING = 'TIGHT_COUPLING',
  MISSING_ABSTRACTION = 'MISSING_ABSTRACTION',
  INCONSISTENT_NAMING = 'INCONSISTENT_NAMING',
}

export interface AnalyzerConfig {
  cyclomaticThreshold: number;
  cognitiveThreshold: number;
  maxNestingDepth: number;
  maxFunctionLength: number;
  maxParameters: number;
  trackHistory: boolean;
}

export interface ParserInterface {
  parse(code: string, filePath: string): FileAnalysis;
  getSupportedExtensions(): string[];
  getLanguageName(): string;
}

export const DEFAULT_CONFIG: AnalyzerConfig = {
  cyclomaticThreshold: 10,
  cognitiveThreshold: 15,
  maxNestingDepth: 4,
  maxFunctionLength: 50,
  maxParameters: 5,
  trackHistory: false,
};

export interface CLIOptions {
  language?: string;
  output?: 'table' | 'json' | 'html';
  threshold?: string;
  history?: boolean;
  recursive?: boolean;
}

export interface AnalysisError {
  filePath: string;
  error: string;
  errorType: 'FILE_NOT_FOUND' | 'UNSUPPORTED_EXTENSION' | 'PARSE_ERROR' | 'READ_ERROR';
}

export interface AnalysisResult {
  successful: FileAnalysis[];
  failed: AnalysisError[];
}
