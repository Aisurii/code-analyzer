# Example Files

This directory contains example files demonstrating various code quality issues that the Code Complexity Analyzer can detect.

## all-issues-example.js

Comprehensive JavaScript example demonstrating **ALL** issue types:

### Complexity Issues
- ✓ HIGH_COMPLEXITY - Functions with high cyclomatic/cognitive complexity
- ✓ DEEP_NESTING - Deeply nested control structures (6+ levels)
- ✓ LONG_FUNCTION - Functions exceeding 50 lines
- ✓ TOO_MANY_PARAMETERS - Functions with 7-8 parameters

### Code Smells
- ✓ MAGIC_NUMBER - Hardcoded numbers (42, 100, 777, etc.)
- ✓ POOR_NAMING - Variables named x, y, temp, data, foo, bar
- ✓ CONSOLE_LOG - Debug statements left in code
- ✓ EMPTY_CATCH - Empty catch blocks ignoring errors
- ✓ TODO_COMMENT - TODO, FIXME, HACK comments
- ✓ COMMENTED_CODE - Old code commented out
- ✓ TYPE_COERCION - Using == and != instead of === and !==
- ✓ DEAD_CODE - Unused variables

### Performance Issues
- ✓ NESTED_LOOPS - Triple nested loops (O(n³))
- ✓ DOM_IN_LOOP - DOM queries inside loops
- ✓ STRING_CONCAT_IN_LOOP - String concatenation in loops
- ✓ REGEX_IN_LOOP - Regex creation inside loops
- ✓ INEFFICIENT_ARRAY_OPS - Multiple chained map/filter operations

### Security Issues
- ✓ EVAL_USAGE - Dangerous eval() calls
- ✓ INNERHTML_USAGE - XSS vulnerabilities via innerHTML/outerHTML
- ✓ HARDCODED_SECRET - API keys, passwords, tokens in code
- ✓ SQL_INJECTION_RISK - SQL queries with string concatenation

### Memory Leaks
- ✓ EVENT_LISTENER_LEAK - Event listeners never removed
- ✓ INTERVAL_LEAK - setInterval() never cleared
- ✓ TIMEOUT_LEAK - setTimeout() never cleared
- ✓ CLOSURE_LEAK - Closures capturing large objects
- ✓ GLOBAL_LEAK - Global variable pollution

### Architecture Issues
- ✓ GOD_CLASS - Class with 20+ methods doing everything
- ✓ FEATURE_ENVY - Method using another object's data extensively
- ✓ TIGHT_COUPLING - Direct dependencies on concrete classes
- ✓ MISSING_ABSTRACTION - Duplicated code without abstraction

## all-issues-example.py

Comprehensive Python example demonstrating the same issues adapted for Python:

### Python-Specific Features
- Handles `self` and `cls` parameters (not counted in parameter count)
- Python exception handling (try/except)
- Python string formatting (f-strings, concatenation)
- Python list comprehensions
- Python naming conventions

### All General Issues
Same categories as JavaScript:
- Complexity issues
- Code smells (adapted for Python syntax)
- Performance issues
- Security issues
- Memory leaks
- Architecture issues

## Running Analysis

To analyze these example files:

```bash
# Analyze JavaScript example
npm run build
node dist/cli/index.js analyze examples/all-issues-example.js

# Analyze Python example
node dist/cli/index.js analyze examples/all-issues-example.py

# Generate HTML report
node dist/cli/index.js analyze examples/ --output html

# Save to history and compare
node dist/cli/index.js analyze examples/ --history
node dist/cli/index.js stats --list
```

## Expected Results

When analyzing `all-issues-example.js`, you should see:

- **Total Issues**: 80+ detected issues
- **Complexity**: Multiple high complexity warnings
- **Security**: 10+ critical security issues
- **Performance**: 10+ performance warnings
- **Code Smells**: 30+ maintainability issues
- **Architecture**: Multiple architecture problems

The exact count may vary based on the specific detection rules, but you should see issues in all categories.

## Notes

These files are **intentionally bad code** designed to trigger every type of issue the analyzer can detect. They serve as:

1. **Test cases** - Verify the analyzer detects all issue types
2. **Examples** - Demonstrate what each issue looks like
3. **Documentation** - Show users what to avoid

**DO NOT** use this code in production!
