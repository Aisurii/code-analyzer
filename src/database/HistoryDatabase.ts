import * as fs from 'fs';
import * as path from 'path';
import { FileAnalysis } from '../types';

/**
 * Simple file-based database for tracking historical analysis results
 * Uses JSON for simplicity (can be replaced with SQLite if needed)
 */
export class HistoryDatabase {
  private dbPath: string;
  private data: DatabaseSchema;

  constructor(dbPath: string = '.complexity-history.json') {
    this.dbPath = dbPath;
    this.data = this.loadDatabase();
  }

  /**
   * Store analysis results
   */
  saveAnalysis(analyses: FileAnalysis[]): string {
    const analysisId = this.generateId();
    const timestamp = new Date().toISOString();

    const record: AnalysisRecord = {
      id: analysisId,
      timestamp,
      files: analyses.length,
      totalIssues: analyses.reduce((sum, a) => sum + a.totalIssues, 0),
      totalFunctions: analyses.reduce((sum, a) => sum + a.functions.length, 0),
      avgComplexity: this.calculateAvgComplexity(analyses),
      analyses,
    };

    this.data.analyses.push(record);
    this.data.lastUpdated = timestamp;

    this.saveDatabase();
    return analysisId;
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): AnalysisRecord | null {
    return this.data.analyses.find(a => a.id === id) || null;
  }

  /**
   * Get recent analyses
   */
  getRecentAnalyses(limit: number = 10): AnalysisRecord[] {
    return this.data.analyses
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get analyses for a specific file
   */
  getFileHistory(filePath: string): FileHistory[] {
    const history: FileHistory[] = [];

    this.data.analyses.forEach(record => {
      const fileAnalysis = record.analyses.find(a => a.filePath === filePath);
      if (fileAnalysis) {
        history.push({
          timestamp: record.timestamp,
          metrics: fileAnalysis.overallMetrics,
          issues: fileAnalysis.totalIssues,
        });
      }
    });

    return history.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Get statistics over time
   */
  getStatistics(): DatabaseStatistics {
    if (this.data.analyses.length === 0) {
      return {
        totalAnalyses: 0,
        totalFiles: 0,
        avgIssuesPerFile: 0,
        avgComplexity: 0,
        trend: 'stable',
      };
    }

    const totalAnalyses = this.data.analyses.length;
    const totalFiles = this.data.analyses.reduce((sum, a) => sum + a.files, 0);
    const totalIssues = this.data.analyses.reduce((sum, a) => sum + a.totalIssues, 0);
    const avgIssuesPerFile = totalIssues / totalFiles;
    const avgComplexity = this.data.analyses.reduce((sum, a) => sum + a.avgComplexity, 0) / totalAnalyses;

    // Calculate trend (comparing last 5 vs previous 5)
    const trend = this.calculateTrend();

    return {
      totalAnalyses,
      totalFiles,
      avgIssuesPerFile: Math.round(avgIssuesPerFile * 10) / 10,
      avgComplexity: Math.round(avgComplexity * 10) / 10,
      trend,
    };
  }

  /**
   * Compare two analyses
   */
  compareAnalyses(id1: string, id2: string): ComparisonResult | null {
    const analysis1 = this.getAnalysis(id1);
    const analysis2 = this.getAnalysis(id2);

    if (!analysis1 || !analysis2) return null;

    return {
      timestamp1: analysis1.timestamp,
      timestamp2: analysis2.timestamp,
      filesDiff: analysis2.files - analysis1.files,
      issuesDiff: analysis2.totalIssues - analysis1.totalIssues,
      complexityDiff: analysis2.avgComplexity - analysis1.avgComplexity,
      improvement: analysis2.totalIssues < analysis1.totalIssues,
    };
  }

  /**
   * Clear old analyses (keep last N)
   */
  pruneHistory(keepLast: number = 50): number {
    const originalLength = this.data.analyses.length;

    this.data.analyses = this.data.analyses
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, keepLast);

    this.saveDatabase();
    return originalLength - this.data.analyses.length;
  }

  private loadDatabase(): DatabaseSchema {
    if (!fs.existsSync(this.dbPath)) {
      return {
        version: 1,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        analyses: [],
      };
    }

    try {
      const content = fs.readFileSync(this.dbPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to load history database, creating new one');
      return {
        version: 1,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        analyses: [],
      };
    }
  }

  private saveDatabase(): void {
    const content = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(this.dbPath, content, 'utf-8');
  }

  private generateId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateAvgComplexity(analyses: FileAnalysis[]): number {
    const total = analyses.reduce((sum, a) => sum + a.overallMetrics.cyclomaticComplexity, 0);
    return analyses.length > 0 ? Math.round((total / analyses.length) * 10) / 10 : 0;
  }

  private calculateTrend(): 'improving' | 'degrading' | 'stable' {
    if (this.data.analyses.length < 6) return 'stable';

    const recent = this.data.analyses.slice(-5);
    const previous = this.data.analyses.slice(-10, -5);

    const recentAvg = recent.reduce((sum, a) => sum + a.totalIssues, 0) / recent.length;
    const previousAvg = previous.reduce((sum, a) => sum + a.totalIssues, 0) / previous.length;

    const diff = recentAvg - previousAvg;

    if (diff < -0.1) return 'improving';
    if (diff > 0.1) return 'degrading';
    return 'stable';
  }
}

interface DatabaseSchema {
  version: number;
  createdAt: string;
  lastUpdated: string;
  analyses: AnalysisRecord[];
}

interface AnalysisRecord {
  id: string;
  timestamp: string;
  files: number;
  totalIssues: number;
  totalFunctions: number;
  avgComplexity: number;
  analyses: FileAnalysis[];
}

interface FileHistory {
  timestamp: string;
  metrics: any;
  issues: number;
}

interface DatabaseStatistics {
  totalAnalyses: number;
  totalFiles: number;
  avgIssuesPerFile: number;
  avgComplexity: number;
  trend: 'improving' | 'degrading' | 'stable';
}

interface ComparisonResult {
  timestamp1: string;
  timestamp2: string;
  filesDiff: number;
  issuesDiff: number;
  complexityDiff: number;
  improvement: boolean;
}
