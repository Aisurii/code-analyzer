# Setup Guide

## Prerequisites

You need to install Node.js (which includes npm) to run this project.

### Installing Node.js

1. Download Node.js from: https://nodejs.org/
2. Install the LTS (Long Term Support) version
3. Verify installation by opening a new terminal and running:
   ```bash
   node --version
   npm --version
   ```

## Installation Steps

Once Node.js is installed:

1. Open a terminal in the project directory:
   ```bash
   cd "g:\Uma Musuma Pretty Script\TsarDeRGla"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run the analyzer:
   ```bash
   npm run analyze examples/simple.js
   ```

## Usage Examples

### Analyze a single file
```bash
npm run analyze examples/complex.js
```

### Analyze a directory
```bash
npm run analyze examples/
```

### Analyze with specific options
```bash
npm run analyze src/ --output json
npm run analyze examples/ --threshold 5
```

### Get JSON output
```bash
npm run analyze examples/complex.js --output json
```

## What Gets Analyzed

The analyzer checks for:
- **Cyclomatic Complexity**: Number of decision paths
- **Cognitive Complexity**: How hard code is to understand
- **Nesting Depth**: How deeply nested your code is
- **Function Length**: Number of lines in functions
- **Parameter Count**: Number of function parameters

## Thresholds

Default thresholds that trigger warnings:
- Cyclomatic Complexity: > 10
- Cognitive Complexity: > 15
- Nesting Depth: > 4
- Function Length: > 50 lines
- Parameters: > 5

## Troubleshooting

### "npm: command not found"
- Install Node.js (see Prerequisites above)
- Restart your terminal after installation

### Build errors with tree-sitter
- On Windows, you may need to install windows-build-tools:
  ```bash
  npm install --global windows-build-tools
  ```
- Or install Visual Studio Build Tools

### Permission errors
- On Windows, run terminal as Administrator
- On Mac/Linux, use `sudo` if needed

## Next Steps

After successful installation:
1. Try analyzing the example files
2. Analyze your own code
3. Experiment with different thresholds
4. Check out the web UI (coming soon!)
