import chalk from 'chalk';
import Table from 'cli-table3';
import { FileAnalysis, FunctionInfo, CodeIssue, IssueCategory } from '../types';

/**
 * Console reporter for displaying analysis results
 */
export class ConsoleReporter {
  /**
   * Display analysis for a single file
   */
  reportFile(analysis: FileAnalysis) {
    console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
    console.log(chalk.bold.cyan(`📄 File: ${analysis.filePath}`));
    console.log(chalk.bold.cyan('═'.repeat(80)));

    this.printOverallMetrics(analysis);
    this.printFunctionTable(analysis.functions);
    this.printIssues(analysis);

    console.log('\n');
  }

  /**
   * Display analysis for multiple files
   */
  reportMultipleFiles(analyses: FileAnalysis[]) {
    console.log('\n' + chalk.bold.magenta('═'.repeat(80)));
    console.log(chalk.bold.magenta(`📊 Analysis Summary (${analyses.length} files)`));
    console.log(chalk.bold.magenta('═'.repeat(80)));

    // Overall statistics
    const totalIssues = analyses.reduce((sum, a) => sum + a.totalIssues, 0);
    const totalFunctions = analyses.reduce((sum, a) => sum + a.functions.length, 0);
    const avgComplexity = analyses.reduce((sum, a) => sum + a.overallMetrics.cyclomaticComplexity, 0) / analyses.length;

    console.log(chalk.white(`\n📈 Statistics:`));
    console.log(chalk.white(`   Total Files: ${analyses.length}`));
    console.log(chalk.white(`   Total Functions: ${totalFunctions}`));
    console.log(chalk.white(`   Total Issues: ${this.colorizeIssueCount(totalIssues)}`));
    console.log(chalk.white(`   Average Complexity: ${this.colorizeComplexity(avgComplexity)}\n`));

    // Per-file summary
    const table = new Table({
      head: [
        chalk.bold('File'),
        chalk.bold('Functions'),
        chalk.bold('Avg Cyclomatic'),
        chalk.bold('Avg Cognitive'),
        chalk.bold('Issues'),
      ],
      colWidths: [40, 12, 18, 18, 10],
    });

    analyses.forEach(analysis => {
      const avgCyclo = analysis.overallMetrics.cyclomaticComplexity;
      const avgCog = analysis.overallMetrics.cognitiveComplexity;

      table.push([
        this.truncate(analysis.filePath, 38),
        analysis.functions.length.toString(),
        this.colorizeComplexity(avgCyclo),
        this.colorizeComplexity(avgCog),
        this.colorizeIssueCount(analysis.totalIssues),
      ]);
    });

    console.log(table.toString());

    // Most complex functions across all files
    this.printTopComplexFunctions(analyses);

    console.log('\n');
  }

  private printOverallMetrics(analysis: FileAnalysis) {
    const m = analysis.overallMetrics;

    console.log(chalk.white('\n📊 Overall Metrics:'));
    console.log(chalk.white(`   Lines of Code: ${m.linesOfCode} (${m.effectiveLinesOfCode} effective)`));
    console.log(chalk.white(`   Functions: ${analysis.functions.length}`));
    console.log(chalk.white(`   Avg Cyclomatic Complexity: ${this.colorizeComplexity(m.cyclomaticComplexity)}`));
    console.log(chalk.white(`   Avg Cognitive Complexity: ${this.colorizeComplexity(m.cognitiveComplexity)}`));
    console.log(chalk.white(`   Max Nesting Depth: ${this.colorizeNesting(m.nestingDepth)}`));
  }

  private printFunctionTable(functions: FunctionInfo[]) {
    if (functions.length === 0) {
      console.log(chalk.yellow('\n⚠️  No functions found'));
      return;
    }

    console.log(chalk.white('\n🔍 Functions:'));

    const table = new Table({
      head: [
        chalk.bold('Function'),
        chalk.bold('Lines'),
        chalk.bold('Cyclomatic'),
        chalk.bold('Cognitive'),
        chalk.bold('Nesting'),
        chalk.bold('Issues'),
      ],
      colWidths: [30, 8, 13, 12, 10, 8],
    });

    functions.forEach(fn => {
      const cyclo = fn.metrics.cyclomaticComplexity;
      const cogni = fn.metrics.cognitiveComplexity;
      const nesting = fn.metrics.nestingDepth;

      table.push([
        this.truncate(fn.name, 28),
        `${fn.startLine}-${fn.endLine}`,
        this.colorizeComplexity(cyclo),
        this.colorizeComplexity(cogni),
        this.colorizeNesting(nesting),
        fn.issues.length > 0 ? chalk.red(fn.issues.length.toString()) : chalk.green('0'),
      ]);
    });

    console.log(table.toString());
  }

  private printIssues(analysis: FileAnalysis) {
    const allIssues: Array<{ fn: string; issue: CodeIssue }> = [];

    analysis.functions.forEach(fn => {
      fn.issues.forEach(issue => {
        allIssues.push({ fn: fn.name, issue });
      });
    });

    if (allIssues.length === 0) {
      console.log(chalk.green('\n✅ No issues found!'));
      return;
    }

    // Group issues by category
    const issuesByCategory = new Map<IssueCategory, Array<{ fn: string; issue: CodeIssue }>>();
    allIssues.forEach(item => {
      const category = item.issue.category;
      if (!issuesByCategory.has(category)) {
        issuesByCategory.set(category, []);
      }
      issuesByCategory.get(category)!.push(item);
    });

    console.log(chalk.white(`\n⚠️  Total Issues: ${allIssues.length}\n`));

    // Print issues by category with icons
    const categoryOrder = [
      IssueCategory.SECURITY,
      IssueCategory.MEMORY_LEAK,
      IssueCategory.PERFORMANCE,
      IssueCategory.COMPLEXITY,
      IssueCategory.ARCHITECTURE,
      IssueCategory.CODE_SMELL,
      IssueCategory.MAINTAINABILITY,
    ];

    const categoryIcons = {
      [IssueCategory.SECURITY]: '🔒',
      [IssueCategory.MEMORY_LEAK]: '💧',
      [IssueCategory.PERFORMANCE]: '⚡',
      [IssueCategory.COMPLEXITY]: '🔀',
      [IssueCategory.ARCHITECTURE]: '🏗️',
      [IssueCategory.CODE_SMELL]: '👃',
      [IssueCategory.MAINTAINABILITY]: '🔧',
    };

    const categoryColors = {
      [IssueCategory.SECURITY]: chalk.red.bold,
      [IssueCategory.MEMORY_LEAK]: chalk.hex('#FF1493').bold, // Deep pink
      [IssueCategory.PERFORMANCE]: chalk.yellow.bold,
      [IssueCategory.COMPLEXITY]: chalk.blue.bold,
      [IssueCategory.ARCHITECTURE]: chalk.hex('#9370DB').bold, // Medium purple
      [IssueCategory.CODE_SMELL]: chalk.cyan.bold,
      [IssueCategory.MAINTAINABILITY]: chalk.magenta.bold,
    };

    categoryOrder.forEach(category => {
      const issues = issuesByCategory.get(category);
      if (!issues || issues.length === 0) return;

      const icon = categoryIcons[category];
      const categoryColor = categoryColors[category];
      const categoryName = category.replace('_', ' ');

      console.log(categoryColor(`${icon} ${categoryName} Issues (${issues.length}):`));

      issues.forEach(({ fn, issue }) => {
        const severityIcon = this.getSeverityIcon(issue.severity);
        const color = this.getSeverityColor(issue.severity);

        console.log(color(`   ${severityIcon} [Line ${issue.line}] ${fn}: ${issue.message}`));
        if (issue.suggestion) {
          console.log(chalk.gray(`      💡 ${issue.suggestion}`));
        }

        // Display fix if available
        if (issue.fix) {
          const autoIcon = issue.fix.automated ? '🤖' : '👨‍💻';
          const autoLabel = issue.fix.automated ? 'Auto-fixable' : 'Manual fix';
          console.log(chalk.green(`      ${autoIcon} ${autoLabel}: ${issue.fix.description}`));
          console.log(chalk.red(`      ❌ ${issue.fix.originalCode}`));
          console.log(chalk.green(`      ✅ ${issue.fix.fixedCode}`));
        }
      });

      console.log(''); // Empty line between categories
    });
  }

  private printTopComplexFunctions(analyses: FileAnalysis[]) {
    const allFunctions: Array<{ file: string; fn: FunctionInfo }> = [];

    analyses.forEach(analysis => {
      analysis.functions.forEach(fn => {
        allFunctions.push({ file: analysis.filePath, fn });
      });
    });

    // Sort by cyclomatic complexity
    allFunctions.sort((a, b) => b.fn.metrics.cyclomaticComplexity - a.fn.metrics.cyclomaticComplexity);

    const top10 = allFunctions.slice(0, 10);

    if (top10.length === 0) return;

    console.log(chalk.white('\n🔥 Top 10 Most Complex Functions:'));

    const table = new Table({
      head: [
        chalk.bold('Rank'),
        chalk.bold('Function'),
        chalk.bold('File'),
        chalk.bold('Cyclomatic'),
        chalk.bold('Cognitive'),
      ],
      colWidths: [6, 25, 30, 13, 12],
    });

    top10.forEach((item, index) => {
      table.push([
        (index + 1).toString(),
        this.truncate(item.fn.name, 23),
        this.truncate(item.file, 28),
        this.colorizeComplexity(item.fn.metrics.cyclomaticComplexity),
        this.colorizeComplexity(item.fn.metrics.cognitiveComplexity),
      ]);
    });

    console.log(table.toString());
  }

  // Utility methods
  private colorizeComplexity(complexity: number): string {
    if (complexity <= 5) return chalk.green(complexity.toString());
    if (complexity <= 10) return chalk.yellow(complexity.toString());
    if (complexity <= 20) return chalk.hex('#FFA500')(complexity.toString()); // orange
    return chalk.red(complexity.toString());
  }

  private colorizeNesting(depth: number): string {
    if (depth <= 2) return chalk.green(depth.toString());
    if (depth <= 4) return chalk.yellow(depth.toString());
    return chalk.red(depth.toString());
  }

  private colorizeIssueCount(count: number): string {
    if (count === 0) return chalk.green(count.toString());
    if (count <= 3) return chalk.yellow(count.toString());
    return chalk.red(count.toString());
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  }

  private getSeverityColor(severity: string): (text: string) => string {
    switch (severity) {
      case 'critical': return chalk.red.bold;
      case 'high': return chalk.red;
      case 'medium': return chalk.yellow;
      case 'low': return chalk.blue;
      default: return chalk.white;
    }
  }

  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}
