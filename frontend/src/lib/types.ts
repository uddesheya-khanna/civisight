export type InspectionType = 'crack_detection' | 'pothole_detection' | 'safety_detection';
export type SeverityLevel = 'low' | 'moderate' | 'high';
export type BandColor = 'green' | 'amber' | 'red';

export interface ModuleHealth {
  available: boolean;
  mode: string;
  model?: string | null;
  score_type?: string | null;
  note?: string | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  device: string;
  modules: Record<InspectionType, ModuleHealth>;
  limits: {
    max_upload_mb: number;
    allowed_types: string[];
  };
}

export interface ImageInfo {
  original_filename: string;
  width: number;
  height: number;
  original_url: string;
  annotated_url: string;
}

export interface ModelInfo {
  name: string;
  kind: string;
  task: string;
  score_type: string;
  weights_file?: string | null;
  is_baseline: boolean;
}

export type Detection = DetectionItem;

export interface DetectionItem {
  id: number;
  type: string;
  score: number;
  score_type: string;
  bbox: [number, number, number, number];
  bbox_norm: [number, number, number, number];
  location: string;
  area_ratio: number;
  area_basis: 'mask' | 'bbox';
  relative_length?: number | null;
  length_basis?: 'skeleton' | 'bbox_diagonal' | null;
  severity?: SeverityLevel | null;
  severity_reason?: string | null;
  low_confidence: boolean;
  attributes: {
    helmet_status?: 'helmet_visible' | 'helmet_not_visibly_detected' | 'not_assessable_small';
    [key: string]: unknown;
  };
}

export interface SummaryData {
  total_detections: number;
  by_severity: {
    low: number;
    moderate: number;
    high: number;
  };
  overall_severity: SeverityLevel | null;
  total_area_ratio: number;
  low_confidence_count: number;
}

export interface SafetyMetrics {
  people_detected: number;
  people_assessable: number;
  people_not_assessable: number;
  helmets_detected: number;
  people_with_visible_helmet: number;
  people_without_visible_helmet: number;
  visible_helmet_compliance_pct: number | null;
  helmet_model_available: boolean;
}

export interface ConditionFactor {
  name: string;
  detail: string;
  penalty: number;
}

export interface ConditionIndicator {
  label: string;
  value: number | null;
  max: number;
  formula_id: string;
  band: BandColor | null;
  factors: ConditionFactor[];
  explanation: string;
}

export interface RecommendationItem {
  level: string;
  text: string;
}

export interface AnalysisResult {
  analysis_id: string;
  created_at: string;
  inspection_type: InspectionType;
  image: ImageInfo;
  model: ModelInfo;
  status: 'detections_found' | 'no_detections';
  detections: DetectionItem[];
  summary: SummaryData;
  safety_metrics?: SafetyMetrics | null;
  condition_indicator: ConditionIndicator;
  interpretation: string;
  recommendations: RecommendationItem[];
  warnings: string[];
  limitations: string[];
  timings_ms: Record<string, number>;
  disclaimer: string;
}

export interface ProgressStage {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'done';
}

export interface ProgressResponse {
  stage: string;
  stages: ProgressStage[];
}

export interface HistoryRecord {
  analysis_id: string;
  created_at: string;
  inspection_type: InspectionType;
  filename: string;
  total_detections: number;
  condition_value: number | null;
  overall_severity: SeverityLevel | null;
  summary: string;
  result: AnalysisResult;
  report_generated_at?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}
