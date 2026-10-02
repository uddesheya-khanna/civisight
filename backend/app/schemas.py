from typing import List, Dict, Any, Optional, Literal, Tuple
from pydantic import BaseModel, Field

InspectionType = Literal["crack_detection", "pothole_detection", "safety_detection"]
SeverityLevel = Literal["low", "moderate", "high"]
BandColor = Literal["green", "amber", "red"]


class ModuleHealth(BaseModel):
    available: bool
    mode: str
    model: Optional[str] = None
    score_type: Optional[str] = None
    note: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    device: str
    modules: Dict[str, ModuleHealth]
    limits: Dict[str, Any]


class ImageInfo(BaseModel):
    original_filename: str
    width: int
    height: int
    original_url: str
    annotated_url: str


class ModelInfo(BaseModel):
    name: str
    kind: str
    task: str
    score_type: str
    weights_file: Optional[str] = None
    is_baseline: bool = False


class DetectionItem(BaseModel):
    id: int
    type: str
    score: float
    score_type: str
    bbox: Tuple[float, float, float, float]
    bbox_norm: Tuple[float, float, float, float]
    location: str
    area_ratio: float
    area_basis: Literal["mask", "bbox"]
    relative_length: Optional[float] = None
    length_basis: Optional[Literal["skeleton", "bbox_diagonal"]] = None
    severity: Optional[SeverityLevel] = None
    severity_reason: Optional[str] = None
    low_confidence: bool = False
    attributes: Dict[str, Any] = Field(default_factory=dict)


class SummaryData(BaseModel):
    total_detections: int
    by_severity: Dict[str, int]
    overall_severity: Optional[SeverityLevel] = None
    total_area_ratio: float
    low_confidence_count: int


class SafetyMetrics(BaseModel):
    people_detected: int
    people_assessable: int
    people_not_assessable: int
    helmets_detected: int
    people_with_visible_helmet: int
    people_without_visible_helmet: int
    visible_helmet_compliance_pct: Optional[float] = None
    helmet_model_available: bool = False


class ConditionFactor(BaseModel):
    name: str
    detail: str
    penalty: float


class ConditionIndicator(BaseModel):
    label: str = "AI-Assisted Visual Condition Indicator"
    value: Optional[int] = None
    max: int = 100
    formula_id: str
    band: Optional[BandColor] = None
    factors: List[ConditionFactor] = Field(default_factory=list)
    explanation: str


class RecommendationItem(BaseModel):
    level: str
    text: str


class AnalysisResult(BaseModel):
    analysis_id: str
    created_at: str
    inspection_type: InspectionType
    image: ImageInfo
    model: ModelInfo
    status: Literal["detections_found", "no_detections"]
    detections: List[DetectionItem]
    summary: SummaryData
    safety_metrics: Optional[SafetyMetrics] = None
    condition_indicator: ConditionIndicator
    interpretation: str
    recommendations: List[RecommendationItem]
    warnings: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    timings_ms: Dict[str, int]
    disclaimer: str


class ProgressStage(BaseModel):
    key: str
    label: str
    status: Literal["pending", "running", "done"]


class ProgressResponse(BaseModel):
    stage: str
    stages: List[ProgressStage]
