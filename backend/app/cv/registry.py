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
    """
    Lazy-loading model registry.

    Detectors are never instantiated until the first inference request for
    their module.  The health endpoint reads file-existence only — it never
    triggers YOLO weight loading.  This keeps startup RAM at ~60–80 MB,
    compatible with Render Free (512 MB).

    Each module loads its model(s) on first use and keeps them cached for
    subsequent requests.  One worker + MAX_CONCURRENT_INFERENCES=1 ensures
    only one YOLO model is active per inference.
    """

    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or settings.registry_file_path
        self.config: Dict[str, Any] = {}
        self.device = "auto"

        # Detector slots — None until lazy-initialised
        self.crack_detector: Optional[Detector] = None
        self.pothole_detector: Optional[Detector] = None
        self.person_detector: Optional[Detector] = None
        self.helmet_detector: Optional[Detector] = None

        # Guards — track whether each slot has been set up
        self._crack_initialised = False
        self._pothole_initialised = False
        self._safety_initialised = False

        self._load_config()
        # ← Intentionally NO call to _init_detectors() or preload() at construction.

    # ── Internals ──────────────────────────────────────────────────────

    def _resolve_weights_path(self, rel_path: str) -> Path:
        p = Path(rel_path)
        if p.is_absolute():
            return p
        backend_p = settings.base_dir / p
        if backend_p.exists():
            return backend_p
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

    # ── Lazy initialisation helpers ─────────────────────────────────────

    def _ensure_crack(self) -> None:
        """Set up crack detector slot on first access (weights loaded on first predict())."""
        if self._crack_initialised:
            return
        modules = self.config.get("modules", {})
        crack_cfg = modules.get("crack_detection", {})
        crack_primary = crack_cfg.get("primary")
        crack_yolo_det = None
        if crack_primary and crack_primary.get("type") == "yolo":
            weights = self._resolve_weights_path(crack_primary.get("weights", "models/crack_yolo.pt"))
            crack_yolo_det = YoloDetector(
                name="crack_yolo",
                weights_path=weights,
                imgsz=crack_primary.get("imgsz", 640),
                conf=crack_primary.get("conf", 0.25),
                iou=crack_primary.get("iou", 0.5),
                class_map=crack_primary.get("class_map", {"crack": "crack"}),
                device=self.device,
                task=crack_primary.get("task", "detect"),
            )

        if crack_yolo_det and crack_yolo_det.is_available():
            self.crack_detector = crack_yolo_det
        else:
            self.crack_detector = ClassicalCrackDetector()

        self._crack_initialised = True

    def _ensure_pothole(self) -> None:
        """Set up pothole detector slot on first access."""
        if self._pothole_initialised:
            return
        modules = self.config.get("modules", {})
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
        self._pothole_initialised = True

    def _ensure_safety(self) -> None:
        """Set up person + helmet detector slots on first access."""
        if self._safety_initialised:
            return
        modules = self.config.get("modules", {})
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
        self._safety_initialised = True

    # ── Eviction / Cache Management ────────────────────────────────────

    def _evict_except(self, active_module: str) -> None:
        """
        Unload models from other modules to ensure at most one module's models
        remain resident in memory on memory-constrained hosts (e.g. Render Free 512MB).
        """
        if active_module != "crack_detection":
            if self.crack_detector and hasattr(self.crack_detector, "unload"):
                self.crack_detector.unload()

        if active_module != "pothole_detection":
            if self.pothole_detector and hasattr(self.pothole_detector, "unload"):
                self.pothole_detector.unload()

        if active_module != "safety_detection":
            if self.person_detector and hasattr(self.person_detector, "unload"):
                self.person_detector.unload()
            if self.helmet_detector and hasattr(self.helmet_detector, "unload"):
                self.helmet_detector.unload()

    # ── Public API ─────────────────────────────────────────────────────

    def preload(self) -> None:
        """
        No-op — retained so existing call-sites don't break.

        The previous implementation called det.load() on every detector at
        startup, consuming ~400–600 MB.  This is incompatible with Render
        Free (512 MB RAM).  Models now load on first inference request only.
        """
        logger.info(
            "Model registry: lazy-loading strategy active — "
            "no YOLO weights loaded at startup."
        )

    def get_crack_detector(self) -> Detector:
        self._evict_except("crack_detection")
        self._ensure_crack()
        if self.crack_detector and self.crack_detector.is_available():
            return self.crack_detector
        return ClassicalCrackDetector()

    def get_pothole_detector(self) -> Detector:
        self._evict_except("pothole_detection")
        self._ensure_pothole()
        if self.pothole_detector and self.pothole_detector.is_available():
            return self.pothole_detector
        raise model_unavailable_error("models/pothole_yolo.pt not found. See setup instructions.")

    def get_safety_detectors(self) -> Tuple[Detector, Optional[Detector]]:
        self._evict_except("safety_detection")
        self._ensure_safety()
        if not self.person_detector or not self.person_detector.is_available():
            raise model_unavailable_error("Person detector model is unavailable.")
        helmet_det = (
            self.helmet_detector
            if (self.helmet_detector and self.helmet_detector.is_available())
            else None
        )
        return self.person_detector, helmet_det

    def describe_modules(self) -> Dict[str, Any]:
        """
        Returns module status for /api/health.

        CRITICAL: checks file existence only — MUST NOT instantiate or load any
        YOLO model.  Health checks must be lightweight even on a cold-started
        Render Free instance.
        """
        modules = self.config.get("modules", {})

        crack_weights = self._resolve_weights_path(
            modules.get("crack_detection", {}).get("primary", {}).get("weights", "models/crack_yolo.pt")
        )
        pothole_weights = self._resolve_weights_path(
            modules.get("pothole_detection", {}).get("primary", {}).get("weights", "models/pothole_yolo.pt")
        )
        person_weights = self._resolve_weights_path(
            modules.get("safety_detection", {}).get("person", {}).get("weights", "models/yolov8n.pt")
        )
        helmet_weights = self._resolve_weights_path(
            modules.get("safety_detection", {}).get("helmet", {}).get("weights", "models/helmet_yolo.pt")
        )
        crack_task = modules.get("crack_detection", {}).get("primary", {}).get("task", "detect")

        # Crack
        if crack_weights.exists():
            crack_desc: Dict[str, Any] = {
                "available": True,
                "mode": "trained_model",
                "model": "crack_yolo",
                "score_type": "model_confidence",
                "note": (
                    f"YOLOv8n-seg trained on crack-seg dataset "
                    f"(OpenSistemas/YOLOv8-crack-seg, task={crack_task})"
                ),
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
        if pothole_weights.exists():
            pothole_desc: Dict[str, Any] = {
                "available": True,
                "mode": "trained_model",
                "model": "pothole_yolo",
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
        if person_weights.exists():
            if helmet_weights.exists():
                safety_desc: Dict[str, Any] = {
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
                    "model": "yolov8n_person",
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
