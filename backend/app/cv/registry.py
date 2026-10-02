from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import yaml
import logging

from backend.app.config import settings
from backend.app.cv.detectors.base import Detector
from backend.app.cv.detectors.yolo_detector import YoloDetector
from backend.app.cv.detectors.crack_classical import ClassicalCrackDetector
from backend.app.core.errors import model_unavailable_error

logger = logging.getLogger("civisight.registry")


class ModelRegistry:
    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or settings.registry_file_path
        self.config: Dict[str, Any] = {}
        self.device = "auto"

        # Detectors
        self.crack_detector: Optional[Detector] = None
        self.pothole_detector: Optional[Detector] = None
        self.person_detector: Optional[Detector] = None
        self.helmet_detector: Optional[Detector] = None

        self._load_config()
        self._init_detectors()

    def _resolve_weights_path(self, rel_path: str) -> Path:
        p = Path(rel_path)
        if p.is_absolute():
            return p
        # Check relative to backend directory
        backend_p = settings.base_dir / p
        if backend_p.exists():
            return backend_p
        # Or relative to backend/models
        models_p = settings.base_dir / "models" / p.name
        if models_p.exists():
            return models_p
        return backend_p

    def _load_config(self) -> None:
        if not self.config_path.exists():
            logger.warning(f"Registry file not found at {self.config_path}, using defaults.")
            self.config = {}
            return

        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f) or {}

        self.device = self.config.get("device", "auto")

    def _init_detectors(self) -> None:
        modules = self.config.get("modules", {})

        # 1. Crack Detector
        crack_cfg = modules.get("crack_detection", {})
        crack_primary = crack_cfg.get("primary")
        crack_yolo_det = None
        if crack_primary and crack_primary.get("type") == "yolo":
            weights = self._resolve_weights_path(crack_primary.get("weights", "models/crack_yolo.pt"))
            crack_task = crack_primary.get("task", "detect")
            crack_yolo_det = YoloDetector(
                name="crack_yolo",
                weights_path=weights,
                imgsz=crack_primary.get("imgsz", 640),
                conf=crack_primary.get("conf", 0.25),
                iou=crack_primary.get("iou", 0.5),
                class_map=crack_primary.get("class_map", {"crack": "crack"}),
                device=self.device,
                task=crack_task,
            )

        if crack_yolo_det and crack_yolo_det.is_available():
            self.crack_detector = crack_yolo_det
        else:
            # Fallback to classical baseline
            self.crack_detector = ClassicalCrackDetector()

        # 2. Pothole Detector
        pothole_cfg = modules.get("pothole_detection", {})
        pothole_primary = pothole_cfg.get("primary")
        if pothole_primary and pothole_primary.get("type") == "yolo":
            weights = self._resolve_weights_path(pothole_primary.get("weights", "models/pothole_yolo.pt"))
            self.pothole_detector = YoloDetector(
                name="pothole_yolo",
                weights_path=weights,
                imgsz=pothole_primary.get("imgsz", 640),
                conf=pothole_primary.get("conf", 0.30),
                iou=pothole_primary.get("iou", 0.5),
                class_map=pothole_primary.get("class_map", {"pothole": "pothole", "D40": "pothole"}),
                device=self.device,
            )

        # 3. Safety Detectors (Person & Helmet)
        safety_cfg = modules.get("safety_detection", {})
        person_cfg = safety_cfg.get("person", {})
        if person_cfg:
            person_weights = self._resolve_weights_path(person_cfg.get("weights", "models/yolov8n.pt"))
            self.person_detector = YoloDetector(
                name="yolov8n_person",
                weights_path=person_weights,
                imgsz=person_cfg.get("imgsz", 960),
                conf=person_cfg.get("conf", 0.35),
                iou=person_cfg.get("iou", 0.5),
                class_map=person_cfg.get("class_map", {"person": "person"}),
                device=self.device,
            )

        helmet_cfg = safety_cfg.get("helmet", {})
        if helmet_cfg:
            helmet_weights = self._resolve_weights_path(helmet_cfg.get("weights", "models/helmet_yolo.pt"))
            self.helmet_detector = YoloDetector(
                name="helmet_yolo",
                weights_path=helmet_weights,
                imgsz=helmet_cfg.get("imgsz", 960),
                conf=helmet_cfg.get("conf", 0.35),
                iou=helmet_cfg.get("iou", 0.5),
                class_map=helmet_cfg.get("class_map", {"helmet": "helmet", "hardhat": "helmet"}),
                device=self.device,
            )

    def preload(self) -> None:
        """Preload available weights at startup."""
        for det in [self.crack_detector, self.pothole_detector, self.person_detector, self.helmet_detector]:
            if det and det.is_available():
                try:
                    det.load()
                except Exception as e:
                    logger.warning(f"Error preloading detector {getattr(det, 'name', 'unknown')}: {e}")

    def get_crack_detector(self) -> Detector:
        if self.crack_detector and self.crack_detector.is_available():
            return self.crack_detector
        # Baseline always available
        return ClassicalCrackDetector()

    def get_pothole_detector(self) -> Detector:
        if self.pothole_detector and self.pothole_detector.is_available():
            return self.pothole_detector
        raise model_unavailable_error("models/pothole_yolo.pt not found. See setup instructions.")

    def get_safety_detectors(self) -> Tuple[Detector, Optional[Detector]]:
        if not self.person_detector or not self.person_detector.is_available():
            raise model_unavailable_error("Person detector model is unavailable.")
        helmet_det = self.helmet_detector if (self.helmet_detector and self.helmet_detector.is_available()) else None
        return self.person_detector, helmet_det

    def describe_modules(self) -> Dict[str, Any]:
        """Provides status dictionary for /api/health matching PRD Section 12.1"""
        # Crack
        if self.crack_detector and getattr(self.crack_detector, "kind", "") == "yolo" and self.crack_detector.is_available():
            crack_task = getattr(self.crack_detector, "task", "detect")
            crack_desc = {
                "available": True,
                "mode": "trained_model",
                "model": self.crack_detector.name,
                "score_type": "model_confidence",
                "note": f"YOLOv8n-seg trained on crack-seg dataset (OpenSistemas/YOLOv8-crack-seg, task={crack_task})",
            }
        else:
            crack_desc = {
                "available": True,
                "mode": "classical_baseline",
                "model": "classical_ridge_v1",
                "score_type": "heuristic_score",
                "note": "No trained crack model installed (running classical ridge baseline)",
            }

        # Pothole
        if self.pothole_detector and self.pothole_detector.is_available():
            pothole_desc = {
                "available": True,
                "mode": "trained_model",
                "model": self.pothole_detector.name,
                "score_type": "model_confidence",
                "note": "Trained pothole model active",
            }
        else:
            pothole_desc = {
                "available": False,
                "mode": "unavailable",
                "note": "models/pothole_yolo.pt not found",
            }

        # Safety
        if self.person_detector and self.person_detector.is_available():
            if self.helmet_detector and self.helmet_detector.is_available():
                safety_desc = {
                    "available": True,
                    "mode": "full",
                    "model": "yolov8n_person + helmet_yolo",
                    "score_type": "model_confidence",
                    "note": "Full person and helmet compliance active",
                }
            else:
                safety_desc = {
                    "available": True,
                    "mode": "person_only",
                    "model": self.person_detector.name,
                    "score_type": "model_confidence",
                    "note": "helmet model not installed (person-only degraded mode)",
                }
        else:
            safety_desc = {
                "available": False,
                "mode": "unavailable",
                "note": "yolov8n.pt not found",
            }

        return {
            "crack_detection": crack_desc,
            "pothole_detection": pothole_desc,
            "safety_detection": safety_desc,
        }


registry = ModelRegistry()
