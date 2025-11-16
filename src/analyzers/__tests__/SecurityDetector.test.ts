import { SecurityDetector } from '../SecurityDetector';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { IssueType } from '../../types';

describe('SecurityDetector', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser();
    parser.setLanguage(JavaScript);
  });

  describe('detectEvalUsage', () => {
    it('should detect eval() usage', () => {
      const code = 'const result = eval("1 + 1");';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const evalIssue = issues.find(i => i.type === IssueType.EVAL_USAGE);
      expect(evalIssue).toBeDefined();
      expect(evalIssue?.severity).toBe('critical');
    });

    it('should not flag eval in comments', () => {
      const code = '// dont use eval()';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const evalIssue = issues.find(i => i.type === IssueType.EVAL_USAGE);
      expect(evalIssue).toBeUndefined();
    });
  });

  describe('detectInnerHTMLUsage', () => {
    it('should detect innerHTML usage', () => {
      const code = 'element.innerHTML = userInput;';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const xssIssue = issues.find(i => i.type === IssueType.INNERHTML_USAGE);
      expect(xssIssue).toBeDefined();
      expect(xssIssue?.severity).toBe('high');
    });

    it('should detect outerHTML usage', () => {
      const code = 'element.outerHTML = userInput;';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const xssIssue = issues.find(i => i.type === IssueType.INNERHTML_USAGE);
      expect(xssIssue).toBeDefined();
    });
  });

  describe('detectHardcodedSecrets', () => {
    it('should detect hardcoded API keys', () => {
      const code = 'const apiKey = "sk_live_123456789";';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const secretIssue = issues.find(i => i.type === IssueType.HARDCODED_SECRET);
      expect(secretIssue).toBeDefined();
      expect(secretIssue?.severity).toBe('critical');
    });

    it('should detect hardcoded passwords', () => {
      const code = 'const password = "secretPass123";';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const secretIssue = issues.find(i => i.type === IssueType.HARDCODED_SECRET);
      expect(secretIssue).toBeDefined();
    });

    it('should not flag empty strings', () => {
      const code = 'const password = "";';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const secretIssue = issues.find(i => i.type === IssueType.HARDCODED_SECRET);
      expect(secretIssue).toBeUndefined();
    });
  });

  describe('detectSQLInjectionRisk', () => {
    it('should detect SQL injection risk', () => {
      const code = 'const query = "SELECT * FROM users WHERE id = " + userId;';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const sqlIssue = issues.find(i => i.type === IssueType.SQL_INJECTION_RISK);
      expect(sqlIssue).toBeDefined();
      expect(sqlIssue?.severity).toBe('critical');
    });

    it('should detect SQL with template literals', () => {
      const code = 'const query = `DELETE FROM users WHERE id = ${userId}`;';
      const detector = new SecurityDetector(code);
      const tree = parser.parse(code);
      const issues = detector.detectSecurityIssues(tree.rootNode);

      const sqlIssue = issues.find(i => i.type === IssueType.SQL_INJECTION_RISK);
      expect(sqlIssue).toBeDefined();
    });
  });
});
