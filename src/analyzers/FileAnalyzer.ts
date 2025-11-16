import * as fs from 'fs';
import * as path from 'path';
import { FileAnalysis, ParserInterface, AnalysisResult, AnalysisError } from '../types';
import { JavaScriptParser } from '../parsers/JavaScriptParser';
import { PythonParser } from '../parsers/PythonParser';

/**
 * Main file analyzer that coordinates parsing and analysis
 */
export class FileAnalyzer {
  private parsers: Map<string, ParserInterface>;

  constructor() {
    this.parsers = new Map();
    this.registerDefaultParsers();
  }

  private registerDefaultParsers() {
    // JavaScript
    const jsParser = new JavaScriptParser(false);
    jsParser.getSupportedExtensions().forEach(ext => {
      this.parsers.set(ext, jsParser);
    });

    // TypeScript
    const tsParser = new JavaScriptParser(true);
    tsParser.getSupportedExtensions().forEach(ext => {
      this.parsers.set(ext, tsParser);
    });

    // Python
    const pyParser = new PythonParser();
    pyParser.getSupportedExtensions().forEach(ext => {
      this.parsers.set(ext, pyParser);
    });
  }

  /**
   * Analyze a single file
   */
  analyzeFile(filePath: string): FileAnalysis {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath);
    const parser = this.parsers.get(ext);

    if (!parser) {
      throw new Error(`No parser available for file extension: ${ext}`);
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    return parser.parse(code, filePath);
  }

  /**
   * Analyze multiple files
   */
  analyzeFiles(filePaths: string[]): FileAnalysis[] {
    const result = this.analyzeFilesWithErrors(filePaths);

    // Log errors but still return successful analyses
    if (result.failed.length > 0) {
      console.error(`\n⚠️  Failed to analyze ${result.failed.length} file(s):`);
      result.failed.forEach(err => {
        console.error(`  - ${err.filePath}: ${err.error}`);
      });
    }

    return result.successful;
  }

  /**
   * Analyze multiple files and return both successful and failed analyses
   */
  analyzeFilesWithErrors(filePaths: string[]): AnalysisResult {
    const successful: FileAnalysis[] = [];
    const failed: AnalysisError[] = [];

    for (const filePath of filePaths) {
      try {
        const analysis = this.analyzeFile(filePath);
        successful.push(analysis);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        let errorType: AnalysisError['errorType'] = 'PARSE_ERROR';

        if (!fs.existsSync(filePath)) {
          errorType = 'FILE_NOT_FOUND';
        } else if (errorMessage.includes('No parser available')) {
          errorType = 'UNSUPPORTED_EXTENSION';
        } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
          errorType = 'READ_ERROR';
        }

        failed.push({
          filePath,
          error: errorMessage,
          errorType,
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Check if a file is supported
   */
  isSupported(filePath: string): boolean {
    const ext = path.extname(filePath);
    return this.parsers.has(ext);
  }

  /**
   * Get all supported extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.parsers.keys());
  }
}
