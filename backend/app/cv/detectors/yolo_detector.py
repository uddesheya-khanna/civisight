from pathlib import Path
from typing import Dict, List, Optional, Any, Literal, Tuple
import logging
import numpy as np
import cv2

from backend.app.cv.detectors.base import Detector, RawDetection
from backend.app.core.errors import AppError, inference_failed_error

logger = logging.getLogger("civisight.yolo")


class YoloDetector(Detector):
    kind: str = "yolo"
    score_type: str = "model_confidence"

    def __init__(
        self,
        name: str,
        weights_path: Path,
        imgsz: int = 640,
        conf: float = 0.25,
        iou: float = 0.50,
        class_map: Optional[Dict[str, str]] = None,
        device: str = "auto",
        task: Literal["detect", "segment"] = "detect",
    ):
        self.name = name
        self.weights_path = Path(weights_path)
        self.imgsz = imgsz
        self.conf = conf
        self.iou = iou
        self.class_map = class_map or {}
        self.configured_device = device
        self.task = task
        self._model = None
        self._is_loaded = False
        self._classes_valid = False
        self._target_class_ids: Dict[int, str] = {}  # model_class_id -> normalized_label

    def _resolve_device(self) -> str:
        if self.configured_device == "auto":
            try:
                import torch
                return "cuda:0" if torch.cuda.is_available() else "cpu"
            except Exception:
                return "cpu"
        return self.configured_device

    def is_available(self) -> bool:
        if not self.weights_path.exists():
            return False
        # If not loaded yet, weights exist so it's potentially available
        if not self._is_loaded:
            return True
        return self._classes_valid

    def load(self) -> None:
        if self._is_loaded:
            return

        if not self.weights_path.exists():
            logger.warning(f"Weights file not found: {self.weights_path}")
            self._classes_valid = False
            return

        try:
            from ultralytics import YOLO

            logger.info(f"Loading YOLO model from {self.weights_path}...")
            self._model = YOLO(str(self.weights_path))
            self._is_loaded = True

            # Validate class_map against model.names
            names = self._model.names or {}
            # names can be dict {0: "person", ...} or list ["person", ...]
            name_to_id: Dict[str, int] = {}
            if isinstance(names, dict):
                name_to_id = {str(v).lower(): k for k, v in names.items()}
            elif isinstance(names, list):
                name_to_id = {str(v).lower(): i for i, v in enumerate(names)}

            self._target_class_ids = {}
            for model_cls, norm_label in self.class_map.items():
                cls_lower = str(model_cls).lower()
                if cls_lower in name_to_id:
                    self._target_class_ids[name_to_id[cls_lower]] = norm_label

            if not self._target_class_ids:
                logger.error(
                    f"Model {self.name} class_map {self.class_map} does not match any classes in model.names: {names}"
                )
                self._classes_valid = False
            else:
                self._classes_valid = True
                logger.info(f"Model {self.name} loaded successfully with mapped classes: {self._target_class_ids}")

        except Exception as e:
            logger.error(f"Failed to load YOLO model from {self.weights_path}: {e}")
            self._is_loaded = False
            self._classes_valid = False

    def unload(self) -> None:
        """Free loaded YOLO model object from memory."""
        if not self._is_loaded and self._model is None:
            return
        logger.info(f"Unloading model {self.name} to preserve memory...")
        self._model = None
        self._is_loaded = False
        self._classes_valid = False
        self._target_class_ids.clear()
        import gc
        gc.collect()

    def describe(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "kind": self.kind,
            "task": self.task,
            "score_type": self.score_type,
            "weights_file": self.weights_path.name if self.weights_path.exists() else None,
            "is_baseline": False,
        }

    def predict(self, image_bgr: np.ndarray) -> List[RawDetection]:
        if not self.is_available():
            raise AppError("MODEL_UNAVAILABLE", f"Model {self.name} is not available.", status_code=503)

        if not self._is_loaded:
            self.load()

        if not self._classes_valid or self._model is None:
            raise AppError("MODEL_UNAVAILABLE", f"Model {self.name} is invalid or has incompatible classes.", status_code=503)

        orig_h, orig_w = image_bgr.shape[:2]
        device = self._resolve_device()

        try:
            results = self._model.predict(
                image_bgr,
                imgsz=self.imgsz,
                conf=self.conf,
                iou=self.iou,
                device=device,
                verbose=False,
            )
        except Exception as e:
            logger.error(f"YOLO predict error on {self.name}: {e}", exc_info=True)
            raise inference_failed_error({"model": self.name, "detail": str(e)})

        raw_detections: List[RawDetection] = []
        if not results:
            return raw_detections

        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return raw_detections

        has_masks = result.masks is not None and len(result.masks) == len(boxes)

        for idx, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            if cls_id not in self._target_class_ids:
                continue

            label = self._target_class_ids[cls_id]
            conf_val = float(box.conf[0].item())
            xyxy = box.xyxy[0].cpu().numpy()

            x1 = float(max(0.0, min(orig_w, xyxy[0])))
            y1 = float(max(0.0, min(orig_h, xyxy[1])))
            x2 = float(max(0.0, min(orig_w, xyxy[2])))
            y2 = float(max(0.0, min(orig_h, xyxy[3])))

            # Discard degenerate boxes
            if (x2 - x1) < 2.0 or (y2 - y1) < 2.0:
                continue

            # Process mask if present
            mask_arr = None
            if has_masks:
                try:
                    poly_mask = result.masks.data[idx].cpu().numpy()  # (mask_h, mask_w)
                    resized_mask = cv2.resize(
                        poly_mask.astype(np.float32),
                        (orig_w, orig_h),
                        interpolation=cv2.INTER_LINEAR,
                    )
                    mask_arr = (resized_mask > 0.5).astype(np.uint8)
                except Exception as me:
                    logger.debug(f"Failed to process mask for detection {idx}: {me}")
                    mask_arr = None

            raw_detections.append(RawDetection(
                label=label,
                score=round(conf_val, 4),
                bbox=(round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)),
                mask=mask_arr,
                extra={},
            ))

        return raw_detections
