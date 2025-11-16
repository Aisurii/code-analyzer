import { FileAnalyzer } from '../FileAnalyzer';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs for testing
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileAnalyzer', () => {
  let analyzer: FileAnalyzer;

  beforeEach(() => {
    analyzer = new FileAnalyzer();
    jest.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should support JavaScript files', () => {
      expect(analyzer.isSupported('test.js')).toBe(true);
    });

    it('should support TypeScript files', () => {
      expect(analyzer.isSupported('test.ts')).toBe(true);
    });

    it('should support Python files', () => {
      expect(analyzer.isSupported('test.py')).toBe(true);
    });

    it('should not support unsupported extensions', () => {
      expect(analyzer.isSupported('test.java')).toBe(false);
      expect(analyzer.isSupported('test.cpp')).toBe(false);
      expect(analyzer.isSupported('test.txt')).toBe(false);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return all supported extensions', () => {
      const extensions = analyzer.getSupportedExtensions();
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.py');
      expect(extensions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('analyzeFile', () => {
    it('should throw error if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(() => analyzer.analyzeFile('nonexistent.js')).toThrow('File not found');
    });

    it('should throw error for unsupported file type', () => {
      mockFs.existsSync.mockReturnValue(true);
      expect(() => analyzer.analyzeFile('test.java')).toThrow('No parser available');
    });

    it('should analyze a JavaScript file', () => {
      const code = 'function test() { return 1; }';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(code);

      const result = analyzer.analyzeFile('test.js');

      expect(result).toBeDefined();
      expect(result.language).toBe('JavaScript');
      expect(result.filePath).toBe('test.js');
      expect(result.functions).toBeDefined();
    });

    it('should analyze a TypeScript file', () => {
      const code = 'function test(): number { return 1; }';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(code);

      const result = analyzer.analyzeFile('test.ts');

      expect(result).toBeDefined();
      expect(result.language).toBe('TypeScript');
      expect(result.filePath).toBe('test.ts');
    });

    it('should analyze a Python file', () => {
      const code = 'def test():\n    return 1';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(code);

      const result = analyzer.analyzeFile('test.py');

      expect(result).toBeDefined();
      expect(result.language).toBe('Python');
      expect(result.filePath).toBe('test.py');
    });
  });

  describe('analyzeFilesWithErrors', () => {
    it('should return successful and failed analyses', () => {
      const jsCode = 'function test() { return 1; }';
      mockFs.existsSync.mockImplementation((filepath) => {
        return filepath === 'exists.js';
      });
      mockFs.readFileSync.mockReturnValue(jsCode);

      const result = analyzer.analyzeFilesWithErrors(['exists.js', 'missing.js', 'test.java']);

      expect(result.successful.length).toBe(1);
      expect(result.failed.length).toBe(2);
      expect(result.failed[0].errorType).toBe('FILE_NOT_FOUND');
      expect(result.failed[1].errorType).toBe('UNSUPPORTED_EXTENSION');
    });

    it('should categorize errors correctly', () => {
      mockFs.existsSync.mockImplementation((filepath) => {
        return filepath === 'test.java';
      });

      const result = analyzer.analyzeFilesWithErrors(['missing.js', 'test.java']);

      const missingError = result.failed.find(e => e.filePath === 'missing.js');
      const unsupportedError = result.failed.find(e => e.filePath === 'test.java');

      expect(missingError?.errorType).toBe('FILE_NOT_FOUND');
      expect(unsupportedError?.errorType).toBe('UNSUPPORTED_EXTENSION');
    });
  });
});
