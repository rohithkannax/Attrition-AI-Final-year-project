export type ColumnType = 'numeric' | 'categorical' | 'boolean' | 'date';

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  uniqueCount: number;
  missingCount: number;
  sampleValues: (string | number | boolean)[];
  isConstant: boolean;
  isIdLike: boolean;
}

export interface SchemaDetectionResult {
  columns: ColumnMeta[];
  idColumn: string | null;
  targetColumn: string | null;
  detectedPositiveClass: string | null;
  candidateTargets: string[];
  candidateIds: string[];
  usableFeatureColumns: string[];
  rowCount: number;
}

export interface RawRow {
  [key: string]: any;
}

export interface FeatureContribution {
  featureName: string;
  originalColumn: string;
  employeeValue: string | number;
  datasetAverage: string | number;
  contributionScore: number; // positive = increases risk, negative = decreases risk
  direction: 'increases_risk' | 'decreases_risk';
  humanSummary: string;
}

export interface EmployeePrediction {
  id: string;
  originalRowIndex: number;
  rawRecord: Record<string, any>;
  riskScore: number; // 0 to 100 percentage
  prediction: 'Will Resign' | 'Will Stay';
  topRiskFactors: FeatureContribution[];
  topProtectiveFactors: FeatureContribution[];
  aiReason?: string;
  mode: 'A' | 'B';
}

export interface ModelMetrics {
  accuracy: number;
  recall: number;
  precision: number;
  f1Score: number;
  rocAuc: number;
  sampleCount: number;
  positiveClassCount: number;
  negativeClassCount: number;
  kFoldFolds: number;
}

export interface DatasetAnalysisResult {
  mode: 'A' | 'B';
  schema: SchemaDetectionResult;
  predictions: EmployeePrediction[];
  metrics?: ModelMetrics;
  modeBNotice?: string;
  featureImportanceSummary?: { name: string; weight: number }[];
}

export interface AIExplanationResponse {
  overview: string;
  factorsAnalysis: string;
  retentionActions: string[];
}
