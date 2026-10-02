from dataclasses import dataclass, field
from typing import Literal, Optional, Protocol, Tuple, Dict, Any, List
import numpy as np


@dataclass
class RawDetection:
    label: str                    # normalized label: "crack" | "pothole" | "person" | "helmet" | ...
    score: float                  # 0..1
    bbox: Tuple[float, float, float, float]   # x1, y1, x2, y2 in ORIGINAL-image pixels
    mask: Optional[np.ndarray] = None         # optional binary mask, original-image size (uint8 0/1)
    extra: Dict[str, Any] = field(default_factory=dict)  # e.g. {"skeleton_length_px": 812.4}


class Detector(Protocol):
    name: str                     # e.g. "crack_yolov8n_seg"
    kind: Literal["yolo", "classical_baseline"]
    task: Literal["detect", "segment", "heuristic"]
    score_type: Literal["model_confidence", "heuristic_score"]

    def is_available(self) -> bool:
        ...

    def load(self) -> None:
        ...

    def predict(self, image_bgr: np.ndarray) -> List[RawDetection]:
        ...

    def describe(self) -> Dict[str, Any]:     # for /api/health and result JSON
        ...
