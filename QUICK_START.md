# Quick Start Guide

## ⚡ Get Running in 3 Steps

### Step 1: Install Node.js
Download and install from: **https://nodejs.org/**
(Choose the LTS version - currently 20.x or 18.x)

### Step 2: Install Dependencies
Open terminal in this directory and run:
```bash
npm install
```

### Step 3: Build and Run
```bash
npm run build
npm run analyze examples/complex.js
```

## 🎉 What You'll See

The analyzer will show you:

```
═══════════════════════════════════════════════════════════
📄 File: examples/complex.js
═══════════════════════════════════════════════════════════

📊 Overall Metrics:
   Lines of Code: 120 (95 effective)
   Functions: 3
   Avg Cyclomatic Complexity: 12.3
   Avg Cognitive Complexity: 15.7
   Max Nesting Depth: 6

🔍 Functions:
┌──────────────────┬────────┬─────────────┬────────────┬──────────┬────────┐
│ Function         │ Lines  │ Cyclomatic  │ Cognitive  │ Nesting  │ Issues │
├──────────────────┼────────┼─────────────┼────────────┼──────────┼────────┤
│ processUserData  │ 5-33   │ 18          │ 22         │ 6        │ 3      │
│ calculateDiscount│ 35-65  │ 11          │ 13         │ 3        │ 1      │
│ validateForm     │ 67-98  │ 10          │ 10         │ 2        │ 1      │
└──────────────────┴────────┴─────────────┴────────────┴──────────┴────────┘

⚠️  Issues (5):
   🔴 [Line 5] processUserData: Function has cyclomatic complexity of 18
      💡 Consider breaking this function into smaller functions
   🔴 [Line 5] processUserData: Function has cognitive complexity of 22
      💡 Simplify logic and reduce nesting levels
   🟡 [Line 5] processUserData: Function has nesting depth of 6
      💡 Use early returns or extract nested logic
```

## 📚 Commands

### Analyze a File
```bash
npm run analyze examples/simple.js
```

### Analyze a Directory
```bash
npm run analyze examples/
```

### Analyze Your Own Code
```bash
npm run analyze path/to/your/code.js
```

### Get JSON Output
```bash
npm run analyze examples/complex.js --output json
```

### Set Custom Threshold
```bash
npm run analyze examples/ --threshold 5
```

## 🎨 Color Coding

- 🟢 **Green** = Simple, good code (complexity ≤ 5)
- 🟡 **Yellow** = Moderate complexity (6-10)
- 🟠 **Orange** = Complex, needs attention (11-20)
- 🔴 **Red** = Very complex, refactor recommended (> 20)

## 🔧 Pro Tips

1. **Start Small**: Analyze simple files first to understand the output
2. **Set Realistic Thresholds**: Use `--threshold` to match your team's standards
3. **Focus on Red**: Tackle the most complex functions first
4. **Track Progress**: Re-run after refactoring to see improvements
5. **Use JSON for CI/CD**: Export JSON and parse in your pipelines

## 🐛 Troubleshooting

**Problem**: `npm: command not found`
**Solution**: Install Node.js from nodejs.org

**Problem**: Build errors on Windows
**Solution**: Install windows-build-tools:
```bash
npm install --global windows-build-tools
```

**Problem**: Permission denied
**Solution**: Run terminal as Administrator (Windows) or use sudo (Mac/Linux)

## 📖 Learn More

- See [SETUP.md](SETUP.md) for detailed installation
- See [PROJECT_STATUS.md](PROJECT_STATUS.md) for what's implemented
- See [README.md](README.md) for full documentation

## 🚀 Next Steps

1. Analyze the example files
2. Try analyzing your own codebase
3. Experiment with thresholds
4. Check PROJECT_STATUS.md for upcoming features
5. Consider contributing Python/other language support!

---

**Need help?** Check the docs or open an issue on GitHub.

**Ready to analyze?** Run: `npm run analyze examples/`
