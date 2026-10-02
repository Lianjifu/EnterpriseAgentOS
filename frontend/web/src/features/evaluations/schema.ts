export type TabId = 'overview' | 'suite' | 'result' | 'case' | 'template';
export type EvalStatus = 'passed' | 'failed' | 'running' | 'queued' | 'cancelled';
export type EvalSuiteType = 'capability' | 'quality' | 'safety' | 'regression';
export type RiskLevel = 'low' | 'medium' | 'high';
export type DrawerPanel = 'basic' | 'cases' | 'criteria' | 'schedule' | 'history';
export type CaseStatus = 'pass' | 'fail' | 'skipped';
export type ExchangeFormat = 'json' | 'yaml';
export type ExchangeField = 'meta' | 'cases' | 'criteria' | 'schedule';

export interface EvalCaseEntry {
  id: string;
  name: string;
  input: string;
  expected: string;
  status: CaseStatus;
  durationMs: number;
  score: number;
}

export interface EvalSuite {
  id: string;
  name: string;
  description: string;
  type: EvalSuiteType;
  owner: string;
  status: EvalStatus;
  cases: number;
  passRate: number;
  avgScore: number;
  lastRunAt: string;
  schedule: string;
  target: string;
  starred: boolean;
  tags: string[];
  trend: number[];
  casesList: EvalCaseEntry[];
  criteria: string[];
  history: Array<{ runAt: string; status: EvalStatus; passRate: number; duration: string }>;
}

export interface EvalResult {
  id: string;
  suite: string;
  target: string;
  runAt: string;
  status: EvalStatus;
  duration: string;
  passRate: number;
  avgScore: number;
  cost: string;
  notes: string;
}

export interface CaseTemplate {
  id: string;
  name: string;
  description: string;
  type: EvalSuiteType;
  icon: string;
  inputExample: string;
  expectedExample: string;
  criteria: string[];
}

export interface EvalSuiteStats {
  total: number;
  passed: number;
  failed: number;
  running: number;
  queued: number;
  avgPassRate: number;
}