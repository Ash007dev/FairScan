export interface GroupStats {
  groups: Record<string, number>;
  most_approved_group: string;
  least_approved_group: string;
}

export interface StatResult {
  fairness_score: number;
  sensitive_columns: string[];
  results_per_group: Record<string, GroupStats>;
  row_count: number;
  decision_column: string;
}

export interface FeatureRanking {
  column: string;
  shap_importance: number;
}

export interface RootCauseResult {
  top_bias_driver: string;
  feature_ranking: FeatureRanking[];
  explanation: string;
  model_data: string;
}

export interface Violation {
  regulation: string;
  risk_level: "high" | "medium" | "low";
  finding: string;
  required_action: string;
  deadline: string;
}

export interface LegalResult {
  violations: Violation[];
  summary: string;
}

export interface ReportResult {
  memo: string;
  model_name: string;
  fairness_score: number;
}

export interface AuditResult {
  fairness_score: number;
  model_name: string;
  decision_column: string;
  sensitive_columns: string[];
  stat: StatResult;
  root_cause: RootCauseResult;
  legal: LegalResult;
  report: ReportResult;
  validation_warnings?: { type: string; message: string; severity: string }[];
}

export interface AuditStatus {
  status: "running" | "complete" | "error";
  progress: Record<string, "idle" | "running" | "done">;
  result?: AuditResult;
  message?: string;
}

export interface CounterfactualPrediction {
  prediction: string;
  confidence: number;
  attribute_value: string;
}

export interface CounterfactualResponse {
  original: CounterfactualPrediction;
  counterfactual: CounterfactualPrediction;
  outcome_changed: boolean;
  flip_column: string;
  delta_confidence: number;
}