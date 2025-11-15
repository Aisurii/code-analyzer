#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { FileAnalyzer } from '../analyzers/FileAnalyzer';
import { ConsoleReporter } from '../reporters/ConsoleReporter';

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
  .description('Generate a detailed report')
  .option('-i, --input <path>', 'Input file or directory')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    console.log(chalk.yellow('Report generation coming soon!'));
  });

program
  .command('stats')
  .description('Show historical statistics')
  .action(() => {
    console.log(chalk.yellow('Historical statistics coming soon!'));
  });

async function analyzeCommand(targetPath: string, options: any) {
  console.log(chalk.cyan.bold('\n🔍 Code Complexity Analyzer\n'));

  // Resolve path
  const absolutePath = path.resolve(targetPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${absolutePath}`);
  }

  const analyzer = new FileAnalyzer();
  const reporter = new ConsoleReporter();

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

  // Output results
  if (options.output === 'json') {
    console.log(JSON.stringify(analyses, null, 2));
  } else if (analyses.length === 1) {
    reporter.reportFile(analyses[0]);
  } else {
    reporter.reportMultipleFiles(analyses);
  }
}

async function getFilesToAnalyze(
  targetPath: string,
  analyzer: FileAnalyzer,
  options: any
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
