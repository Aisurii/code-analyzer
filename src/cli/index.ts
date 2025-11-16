#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { FileAnalyzer } from '../analyzers/FileAnalyzer';
import { ConsoleReporter } from '../reporters/ConsoleReporter';
import { HTMLReporter } from '../reporters/HTMLReporter';
import { HistoryDatabase } from '../database/HistoryDatabase';
import { CLIOptions } from '../types';
import { ConfigLoader } from '../config/ConfigLoader';

const program = new Command();

program
  .name('complexity')
  .description('Code Complexity Analyzer - Analyze code quality and complexity')
  .version('0.1.0');

program
  .command('analyze <path>')
  .description('Analyze a file or directory')
  .option('-l, --language <lang>', 'Filter by language (js, ts, py)')
  .option('-o, --output <format>', 'Output format (table, json, html)', 'table')
  .option('-t, --threshold <number>', 'Complexity threshold for warnings', '10')
  .option('--history', 'Track in database for historical analysis')
  .option('--recursive', 'Recursively analyze directories', true)
  .action(async (targetPath: string, options) => {
    try {
      await analyzeCommand(targetPath, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate a detailed report from history')
  .option('-i, --id <id>', 'Analysis ID from history')
  .option('-o, --output <path>', 'Output file path', 'complexity-report.html')
  .option('-f, --format <format>', 'Output format (html, json)', 'html')
  .action(async (options) => {
    try {
      const db = new HistoryDatabase();

      let analyses;

      if (options.id) {
        const record = db.getAnalysis(options.id);
        if (!record) {
          console.log(chalk.red(`❌ Analysis not found: ${options.id}`));
          return;
        }
        analyses = record.analyses;
        console.log(chalk.cyan(`📊 Generating report for analysis ${options.id}`));
      } else {
        const recent = db.getRecentAnalyses(1);
        if (recent.length === 0) {
          console.log(chalk.yellow('⚠️  No analyses found in history'));
          console.log(chalk.white('Run "complexity analyze <path> --history" to save analyses'));
          return;
        }
        analyses = recent[0].analyses;
        console.log(chalk.cyan(`📊 Generating report for latest analysis`));
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(analyses, null, 2));
      } else {
        const htmlReporter = new HTMLReporter();
        htmlReporter.generateReport(analyses, options.output);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show historical statistics')
  .option('-l, --list', 'List recent analyses')
  .option('-c, --compare <id1,id2>', 'Compare two analyses')
  .option('-f, --file <path>', 'Show history for a specific file')
  .action((options) => {
    try {
      const db = new HistoryDatabase();

      if (options.list) {
        const recent = db.getRecentAnalyses(10);
        if (recent.length === 0) {
          console.log(chalk.yellow('⚠️  No analyses found in history'));
          return;
        }

        console.log(chalk.cyan.bold('\n📋 Recent Analyses\n'));
        recent.forEach(record => {
          const date = new Date(record.timestamp).toLocaleString();
          console.log(chalk.white(`  ${record.id}`));
          console.log(chalk.gray(`  └─ ${date} - ${record.files} files, ${record.totalIssues} issues, avg complexity: ${record.avgComplexity}`));
          console.log('');
        });
        return;
      }

      if (options.compare) {
        const [id1, id2] = options.compare.split(',');
        const comparison = db.compareAnalyses(id1, id2);

        if (!comparison) {
          console.log(chalk.red('❌ One or both analysis IDs not found'));
          return;
        }

        console.log(chalk.cyan.bold('\n📊 Analysis Comparison\n'));
        console.log(chalk.white(`First:  ${new Date(comparison.timestamp1).toLocaleString()}`));
        console.log(chalk.white(`Second: ${new Date(comparison.timestamp2).toLocaleString()}`));
        console.log('');

        const filesDiff = comparison.filesDiff >= 0 ? `+${comparison.filesDiff}` : `${comparison.filesDiff}`;
        const issuesDiff = comparison.issuesDiff >= 0 ? `+${comparison.issuesDiff}` : `${comparison.issuesDiff}`;
        const complexityDiff = comparison.complexityDiff >= 0 ? `+${comparison.complexityDiff}` : `${comparison.complexityDiff}`;

        console.log(chalk.white(`Files:      ${filesDiff}`));
        console.log(comparison.issuesDiff > 0 ? chalk.red(`Issues:     ${issuesDiff}`) : chalk.green(`Issues:     ${issuesDiff}`));
        console.log(comparison.complexityDiff > 0 ? chalk.red(`Complexity: ${complexityDiff}`) : chalk.green(`Complexity: ${complexityDiff}`));
        console.log('');

        if (comparison.improvement) {
          console.log(chalk.green('✓ Code quality improved!'));
        } else {
          console.log(chalk.yellow('⚠ Code quality degraded'));
        }
        console.log('');
        return;
      }

      if (options.file) {
        const history = db.getFileHistory(options.file);

        if (history.length === 0) {
          console.log(chalk.yellow(`⚠️  No history found for ${options.file}`));
          return;
        }

        console.log(chalk.cyan.bold(`\n📈 History for ${options.file}\n`));
        history.forEach(record => {
          const date = new Date(record.timestamp).toLocaleString();
          console.log(chalk.white(`${date}:`));
          console.log(chalk.gray(`  Complexity: ${record.metrics.cyclomaticComplexity}, Issues: ${record.issues}`));
        });
        console.log('');
        return;
      }

      // Default: show overall statistics
      const stats = db.getStatistics();

      if (stats.totalAnalyses === 0) {
        console.log(chalk.yellow('⚠️  No analyses found in history'));
        console.log(chalk.white('Run "complexity analyze <path> --history" to save analyses'));
        return;
      }

      console.log(chalk.cyan.bold('\n📊 Historical Statistics\n'));
      console.log(chalk.white(`Total Analyses:    ${stats.totalAnalyses}`));
      console.log(chalk.white(`Total Files:       ${stats.totalFiles}`));
      console.log(chalk.white(`Avg Issues/File:   ${stats.avgIssuesPerFile}`));
      console.log(chalk.white(`Avg Complexity:    ${stats.avgComplexity}`));
      console.log('');

      const trendSymbol = stats.trend === 'improving' ? '↓' :
                          stats.trend === 'degrading' ? '↑' : '→';
      const trendColor = stats.trend === 'improving' ? chalk.green :
                         stats.trend === 'degrading' ? chalk.red : chalk.yellow;

      console.log(trendColor(`Trend: ${trendSymbol} ${stats.trend.toUpperCase()}`));
      console.log('');
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a default configuration file')
  .option('-o, --output <path>', 'Output file path', '.complexityrc.json')
  .action((options) => {
    ConfigLoader.createDefaultConfig(options.output);
  });

async function analyzeCommand(targetPath: string, options: CLIOptions) {
  console.log(chalk.cyan.bold('\n🔍 Code Complexity Analyzer\n'));

  // Load configuration
  const config = ConfigLoader.loadConfig(process.cwd());

  // Override threshold from CLI if provided
  if (options.threshold) {
    config.cyclomaticThreshold = parseInt(options.threshold, 10);
  }

  // Resolve path
  const absolutePath = path.resolve(targetPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${absolutePath}`);
  }

  const analyzer = new FileAnalyzer();
  const consoleReporter = new ConsoleReporter();
  const htmlReporter = new HTMLReporter();

  // Get files to analyze
  const filesToAnalyze = await getFilesToAnalyze(absolutePath, analyzer, options);

  if (filesToAnalyze.length === 0) {
    console.log(chalk.yellow('⚠️  No supported files found'));
    return;
  }

  console.log(chalk.white(`Analyzing ${filesToAnalyze.length} file(s)...\n`));

  // Analyze files
  const analyses = analyzer.analyzeFiles(filesToAnalyze);

  if (analyses.length === 0) {
    console.log(chalk.red('❌ No files could be analyzed'));
    return;
  }

  // Save to history database if requested
  if (options.history) {
    const db = new HistoryDatabase();
    const analysisId = db.saveAnalysis(analyses);
    console.log(chalk.green(`✓ Saved to history database (ID: ${analysisId})`));
  }

  // Output results
  if (options.output === 'json') {
    console.log(JSON.stringify(analyses, null, 2));
  } else if (options.output === 'html') {
    const outputFile = 'complexity-report.html';
    htmlReporter.generateReport(analyses, outputFile);
  } else {
    // Default: console output
    if (analyses.length === 1) {
      consoleReporter.reportFile(analyses[0]);
    } else {
      consoleReporter.reportMultipleFiles(analyses);
    }
  }
}

async function getFilesToAnalyze(
  targetPath: string,
  analyzer: FileAnalyzer,
  options: CLIOptions
): Promise<string[]> {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    if (!analyzer.isSupported(targetPath)) {
      throw new Error(`File type not supported: ${path.extname(targetPath)}`);
    }
    return [targetPath];
  }

  // Directory - glob for supported files
  const extensions = analyzer.getSupportedExtensions();
  const patterns = extensions.map(ext => `**/*${ext}`);

  let files: string[] = [];
  for (const pattern of patterns) {
    const globPattern = path.join(targetPath, pattern).replace(/\\/g, '/');
    const matches = await glob(globPattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    });
    files = files.concat(matches);
  }

  return files;
}

// Display banner
function showBanner() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         Code Complexity Analyzer v0.1.0                   ║
║         Multi-language code quality analysis              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `));
}

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  showBanner();
  program.outputHelp();
}
