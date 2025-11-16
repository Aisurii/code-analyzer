import { ConfigLoader } from '../ConfigLoader';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_CONFIG } from '../../types';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should return default config if no config file found', () => {
      mockFs.existsSync.mockReturnValue(false);

      const config = ConfigLoader.loadConfig();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load and merge config from .complexityrc.json', () => {
      const userConfig = {
        cyclomaticThreshold: 15,
        cognitiveThreshold: 20,
      };

      mockFs.existsSync.mockImplementation((filepath) => {
        return filepath.toString().endsWith('.complexityrc.json');
      });
      mockFs.readFileSync.mockReturnValue(JSON.stringify(userConfig));

      const config = ConfigLoader.loadConfig();

      expect(config.cyclomaticThreshold).toBe(15);
      expect(config.cognitiveThreshold).toBe(20);
      expect(config.maxNestingDepth).toBe(DEFAULT_CONFIG.maxNestingDepth); // Should keep default
    });

    it('should handle invalid JSON gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{ invalid json }');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const config = ConfigLoader.loadConfig();

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('validateConfig', () => {
    it('should return no errors for valid config', () => {
      const errors = ConfigLoader.validateConfig(DEFAULT_CONFIG);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid cyclomaticThreshold', () => {
      const errors = ConfigLoader.validateConfig({ cyclomaticThreshold: 0 });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('cyclomaticThreshold');
    });

    it('should detect invalid maxNestingDepth', () => {
      const errors = ConfigLoader.validateConfig({ maxNestingDepth: 0 });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('maxNestingDepth');
    });

    it('should detect invalid maxParameters', () => {
      const errors = ConfigLoader.validateConfig({ maxParameters: -1 });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('maxParameters');
    });

    it('should detect multiple errors', () => {
      const errors = ConfigLoader.validateConfig({
        cyclomaticThreshold: 0,
        cognitiveThreshold: -5,
        maxNestingDepth: 0,
      });
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('createDefaultConfig', () => {
    it('should create config file with default values', () => {
      mockFs.writeFileSync.mockImplementation(() => {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      ConfigLoader.createDefaultConfig('.complexityrc.json');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const call = mockFs.writeFileSync.mock.calls[0];
      expect(call[0]).toBe('.complexityrc.json');

      const content = JSON.parse(call[1] as string);
      expect(content.cyclomaticThreshold).toBe(DEFAULT_CONFIG.cyclomaticThreshold);
      expect(content.$schema).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
