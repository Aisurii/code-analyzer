# Code Complexity Analyzer

A powerful multi-language code complexity analyzer with visualizations and bug prediction capabilities. Analyze your codebase for complexity issues, potential bugs, security vulnerabilities, and code smells.

## Features

- **Multi-Language Support**: Analyzes JavaScript, TypeScript, and Python code using Tree-sitter
- **Comprehensive Metrics**:
  - Cyclomatic Complexity
  - Cognitive Complexity
  - Lines of Code metrics
- **Advanced Detection**:
  - Performance issues
  - Security vulnerabilities
  - Memory leak patterns
  - Code smells
  - Architecture problems
- **Automated Fix Generation**: Suggests and generates fixes for common issues
- **Multiple Output Formats**: Table, JSON, and HTML reports
- **CLI Tool**: Easy-to-use command-line interface

## Installation

### Prerequisites

- Node.js >= 18.0.0

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

## Usage

### Analyze a File or Directory

```bash
# Analyze a single file
complexity analyze src/index.ts

# Analyze a directory (recursive by default)
complexity analyze src/

# Filter by language
complexity analyze src/ --language ts

# Set complexity threshold
complexity analyze src/ --threshold 15

# Output as JSON
complexity analyze src/ --output json
```

### Available Commands

- `complexity analyze <path>` - Analyze a file or directory
- `complexity report` - Generate a detailed HTML/JSON report from history
- `complexity stats` - Show historical statistics and trends
- `complexity init` - Create a default configuration file (.complexityrc.json)

### CLI Options

#### Analyze Command
- `-l, --language <lang>` - Filter by language (js, ts, py)
- `-o, --output <format>` - Output format (table, json, html) - default: table
- `-t, --threshold <number>` - Complexity threshold for warnings - default: 10
- `--history` - Save analysis to database for historical tracking
- `--recursive` - Recursively analyze directories (default: true)

#### Report Command
- `-i, --id <id>` - Analysis ID from history (uses latest if not specified)
- `-o, --output <path>` - Output file path (default: complexity-report.html)
- `-f, --format <format>` - Output format (html, json) - default: html

#### Stats Command
- `-l, --list` - List recent analyses
- `-c, --compare <id1,id2>` - Compare two analyses
- `-f, --file <path>` - Show history for a specific file

#### Init Command
- `-o, --output <path>` - Output file path (default: .complexityrc.json)

## Supported Languages

- JavaScript (`.js`)
- TypeScript (`.ts`)
- Python (`.py`)

## Metrics Explained

### Cyclomatic Complexity
Measures the number of linearly independent paths through a program's source code. Lower is better.

- **1-10**: Simple, low risk
- **11-20**: Moderate complexity
- **21+**: High complexity, consider refactoring

### Cognitive Complexity
Measures how difficult code is to understand. Focuses on human readability rather than execution paths.

### Lines of Code
Tracks total lines and effective lines of code (excluding comments and whitespace).

## Project Structure

```
src/
├── analyzers/          # Core analysis engines
│   ├── FileAnalyzer.ts
│   ├── CyclomaticComplexity.ts
│   ├── CognitiveComplexity.ts
│   ├── PerformanceDetector.ts
│   ├── SecurityDetector.ts
│   ├── MemoryLeakDetector.ts
│   ├── ArchitectureDetector.ts
│   ├── CodeSmellDetector.ts
│   └── FixGenerator.ts
├── parsers/            # Language parsers
│   ├── BaseParser.ts
│   └── JavaScriptParser.ts
├── reporters/          # Output formatters
│   └── ConsoleReporter.ts
├── cli/                # CLI interface
│   └── index.ts
└── types.ts           # TypeScript definitions
```

## Technology Stack

- **Tree-sitter**: Fast, incremental parsing library for multi-language support
- **Commander.js**: Command-line interface framework
- **Chalk**: Terminal string styling
- **cli-table3**: Beautiful table output in the terminal
- **TypeScript**: Type-safe development

## Development

### Watch Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Run the CLI Directly

```bash
npm start
```

## Project Status

✅ Production Ready!

### Completed Features
- [x] Project setup with TypeScript
- [x] Multi-language parsing (JavaScript, TypeScript, Python)
- [x] Core parsing engine (Tree-sitter)
- [x] Complexity calculations (Cyclomatic & Cognitive)
- [x] Class analysis support
- [x] CLI interface with multiple commands
- [x] Performance issue detection
- [x] Security vulnerability detection
- [x] Memory leak detection
- [x] Code smell detection
- [x] Architecture problem detection
- [x] Enhanced fix generation (14 fix types)
- [x] Configuration file support (.complexityrc.json)
- [x] Error handling with detailed reporting
- [x] Comprehensive test suite (Jest)
- [x] HTML report generation
- [x] Historical tracking database
- [x] Statistics and comparison tools
- [x] Type-safe implementation
- [x] Reduced false positives

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
