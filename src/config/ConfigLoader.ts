import * as fs from 'fs';
import * as path from 'path';
import { AnalyzerConfig, DEFAULT_CONFIG } from '../types';

/**
 * Configuration file loader for .complexityrc.json
 */
export class ConfigLoader {
  private static CONFIG_FILES = [
    '.complexityrc.json',
    '.complexityrc',
    'complexity.config.json',
  ];

  /**
   * Load configuration from file, falling back to defaults
   */
  static loadConfig(startPath?: string): AnalyzerConfig {
    const configPath = this.findConfigFile(startPath);

    if (!configPath) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(configContent);

      // Merge with defaults
      return {
        ...DEFAULT_CONFIG,
        ...userConfig,
      };
    } catch (error) {
      console.warn(`Warning: Failed to load config from ${configPath}, using defaults`);
      console.warn(error instanceof Error ? error.message : String(error));
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Find config file in current directory or parent directories
   */
  private static findConfigFile(startPath?: string): string | null {
    let currentPath = startPath || process.cwd();

    // Traverse up to root directory
    while (true) {
      for (const configFile of this.CONFIG_FILES) {
        const fullPath = path.join(currentPath, configFile);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }

      const parentPath = path.dirname(currentPath);

      // Stop if we've reached the root
      if (parentPath === currentPath) {
        break;
      }

      currentPath = parentPath;
    }

    return null;
  }

  /**
   * Create a default config file
   */
  static createDefaultConfig(outputPath: string = '.complexityrc.json'): void {
    const defaultConfig: AnalyzerConfig & { $schema?: string } = {
      $schema: 'https://raw.githubusercontent.com/complexity-analyzer/schema/main/config.schema.json',
      ...DEFAULT_CONFIG,
    };

    const configContent = JSON.stringify(defaultConfig, null, 2);
    fs.writeFileSync(outputPath, configContent, 'utf-8');
    console.log(`Created default configuration file: ${outputPath}`);
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: Partial<AnalyzerConfig>): string[] {
    const errors: string[] = [];

    if (config.cyclomaticThreshold !== undefined && config.cyclomaticThreshold < 1) {
      errors.push('cyclomaticThreshold must be at least 1');
    }

    if (config.cognitiveThreshold !== undefined && config.cognitiveThreshold < 1) {
      errors.push('cognitiveThreshold must be at least 1');
    }

    if (config.maxNestingDepth !== undefined && config.maxNestingDepth < 1) {
      errors.push('maxNestingDepth must be at least 1');
    }

    if (config.maxFunctionLength !== undefined && config.maxFunctionLength < 1) {
      errors.push('maxFunctionLength must be at least 1');
    }

    if (config.maxParameters !== undefined && config.maxParameters < 0) {
      errors.push('maxParameters must be at least 0');
    }

    return errors;
  }
}
