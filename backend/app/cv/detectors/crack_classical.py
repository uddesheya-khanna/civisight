import math
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from skimage.filters import sato, apply_hysteresis_threshold
from skimage.morphology import skeletonize

from backend.app.cv.detectors.base import Detector, RawDetection
from backend.app.engineering.thresholds import (
    CLASSICAL_CRACK_MAX_DIM,
    CLASSICAL_CRACK_CLAHE_CLIP,
    CLASSICAL_CRACK_CLAHE_GRID,
    CLASSICAL_CRACK_SATO_SIGMAS,
    CLASSICAL_CRACK_PERCENTILE,
    CLASSICAL_CRACK_HYSTERESIS_LOW,
    CLASSICAL_CRACK_HYSTERESIS_HIGH,
    CLASSICAL_CRACK_MIN_AREA_RATIO,
    CLASSICAL_CRACK_MIN_LENGTH_RATIO,
    CLASSICAL_CRACK_MAX_WIDTH_RATIO,
    CLASSICAL_CRACK_TEXTURE_GUARD_RATIO,
    CLASSICAL_CRACK_LENGTH_NORM_RATIO,
)


class ClassicalCrackDetector(Detector):
    name: str = "classical_ridge_v1"
    kind: str = "classical_baseline"
    task: str = "heuristic"
    score_type: str = "heuristic_score"

    def __init__(self):
        self.last_warnings: List[str] = []

    def is_available(self) -> bool:
        return True

    def load(self) -> None:
        pass

    def describe(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "kind": self.kind,
            "task": self.task,
            "score_type": self.score_type,
            "weights_file": None,
            "is_baseline": True,
        }

    def predict(self, image_bgr: np.ndarray) -> List[RawDetection]:
        self.last_warnings = []
        orig_h, orig_w = image_bgr.shape[:2]
        orig_diag = math.hypot(orig_w, orig_h)

        # 1. Convert to grayscale & downscale if long side > 1280
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        long_side = max(orig_h, orig_w)
        scale = 1.0

        if long_side > CLASSICAL_CRACK_MAX_DIM:
            scale = float(long_side) / float(CLASSICAL_CRACK_MAX_DIM)
            if orig_w >= orig_h:
                proc_w = CLASSICAL_CRACK_MAX_DIM
                proc_h = max(1, round(orig_h / scale))
            else:
                proc_h = CLASSICAL_CRACK_MAX_DIM
                proc_w = max(1, round(orig_w / scale))
            proc_gray = cv2.resize(gray, (proc_w, proc_h), interpolation=cv2.INTER_AREA)
        else:
            proc_gray = gray
            proc_h, proc_w = orig_h, orig_w

        proc_diag = math.hypot(proc_w, proc_h)
        total_pixels = proc_w * proc_h

        # 2. Gaussian blur (5x5) and CLAHE
        blurred = cv2.GaussianBlur(proc_gray, (5, 5), 0)
        clahe = cv2.createCLAHE(
            clipLimit=CLASSICAL_CRACK_CLAHE_CLIP,
            tileGridSize=CLASSICAL_CRACK_CLAHE_GRID,
        )
        enhanced = clahe.apply(blurred)

        # 3. Ridge response via Sato filter
        gray_float = enhanced.astype(np.float32) / 255.0
        ridge = sato(
            gray_float,
            sigmas=CLASSICAL_CRACK_SATO_SIGMAS,
            black_ridges=True,
            mode="reflect",
        )

        p99_5 = np.percentile(ridge, CLASSICAL_CRACK_PERCENTILE)
        if p99_5 > 1e-6:
            ridge_norm = np.clip(ridge / p99_5, 0.0, 1.0)
        else:
            ridge_norm = np.zeros_like(ridge)

        # 4. Hysteresis threshold
        binary = apply_hysteresis_threshold(
            ridge_norm,
            CLASSICAL_CRACK_HYSTERESIS_LOW,
            CLASSICAL_CRACK_HYSTERESIS_HIGH,
        ).astype(np.uint8)

        # 5. Morphological close (3x3 ellipse, 1 iter) & remove small components
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(closed, connectivity=8)
        min_comp_area = CLASSICAL_CRACK_MIN_AREA_RATIO * float(total_pixels)

        valid_components = []
        total_kept_area = 0

        # 6. Analyze each remaining component
        for label_idx in range(1, num_labels):
            area_px = stats[label_idx, cv2.CC_STAT_AREA]
            if area_px < min_comp_area:
                continue

            comp_mask = (labels == label_idx).astype(np.uint8)

            # Skeletonize
            bool_mask = comp_mask.astype(bool)
            skel = skeletonize(bool_mask)
            skeleton_length_px = float(np.count_nonzero(skel))

            if skeleton_length_px <= 0:
                continue

            mean_width_px = float(area_px) / skeleton_length_px

            # 7. Keep component only if elongated and thin
            if (
                skeleton_length_px >= CLASSICAL_CRACK_MIN_LENGTH_RATIO * proc_diag
                and mean_width_px <= CLASSICAL_CRACK_MAX_WIDTH_RATIO * proc_diag
            ):
                mean_ridge_norm = float(np.mean(ridge_norm[skel])) if np.any(skel) else 0.0
                valid_components.append({
                    "comp_mask": comp_mask,
                    "area_px": area_px,
                    "skeleton_length_px": skeleton_length_px,
                    "mean_width_px": mean_width_px,
                    "mean_ridge_norm": mean_ridge_norm,
                    "bbox": (
                        float(stats[label_idx, cv2.CC_STAT_LEFT]),
                        float(stats[label_idx, cv2.CC_STAT_TOP]),
                        float(stats[label_idx, cv2.CC_STAT_LEFT] + stats[label_idx, cv2.CC_STAT_WIDTH]),
                        float(stats[label_idx, cv2.CC_STAT_TOP] + stats[label_idx, cv2.CC_STAT_HEIGHT]),
                    ),
                })
                total_kept_area += area_px

        # 8. Texture guard
        if (float(total_kept_area) / float(max(1, total_pixels))) > CLASSICAL_CRACK_TEXTURE_GUARD_RATIO:
            self.last_warnings.append(
                "Surface texture produced widespread ridge responses; crack detection is unreliable for this image."
            )
            return []

        # 9. & 10. Construct RawDetections scaled back to original resolution
        raw_detections: List[RawDetection] = []
        for comp in valid_components:
            # Score
            len_ratio = comp["skeleton_length_px"] / (CLASSICAL_CRACK_LENGTH_NORM_RATIO * proc_diag)
            score = float(np.clip(
                0.5 * comp["mean_ridge_norm"] + 0.5 * min(1.0, len_ratio),
                0.0,
                1.0,
            ))

            # Scale bbox to original size
            x1 = comp["bbox"][0] * scale
            y1 = comp["bbox"][1] * scale
            x2 = comp["bbox"][2] * scale
            y2 = comp["bbox"][3] * scale

            x1 = max(0.0, min(float(orig_w), x1))
            y1 = max(0.0, min(float(orig_h), y1))
            x2 = max(0.0, min(float(orig_w), x2))
            y2 = max(0.0, min(float(orig_h), y2))

            # Scale mask to original size
            if scale != 1.0:
                orig_mask = cv2.resize(comp["comp_mask"], (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
            else:
                orig_mask = comp["comp_mask"]

            orig_skel_len = comp["skeleton_length_px"] * scale
            orig_mean_w = comp["mean_width_px"] * scale

            raw_detections.append(RawDetection(
                label="crack",
                score=round(score, 4),
                bbox=(round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)),
                mask=orig_mask,
                extra={
                    "skeleton_length_px": round(orig_skel_len, 2),
                    "mean_width_px": round(orig_mean_w, 2),
                },
            ))

        return raw_detections
