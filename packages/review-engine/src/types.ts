export type ReviewSeverity = 'error' | 'warning' | 'info';

export interface ReviewFinding {
  id: string;
  severity: ReviewSeverity;
  category: 'requirements' | 'design' | 'architecture' | 'accessibility' | 'testing' | 'files';
  message: string;
  requirement?: string;
  file?: string;
}

export interface ReviewReport {
  specSlug: string;
  specTitle: string;
  timestamp: string;
  passed: boolean;
  score: number;
  findings: ReviewFinding[];
  summary: string;
}

export interface ReviewOptions {
  specSlug: string;
  taskId?: string;
  filePath?: string;
}
