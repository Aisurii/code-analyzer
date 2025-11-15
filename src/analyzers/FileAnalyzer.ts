import * as fs from 'fs';
import * as path from 'path';
import { FileAnalysis, ParserInterface } from '../types';
import { JavaScriptParser } from '../parsers/JavaScriptParser';

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

    // TODO: Add Python parser
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
    return filePaths.map(filePath => {
      try {
        return this.analyzeFile(filePath);
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error);
        return null;
      }
    }).filter((analysis): analysis is FileAnalysis => analysis !== null);
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
