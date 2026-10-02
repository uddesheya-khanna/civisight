#!/usr/bin/env python3
"""
CiviSight AI – Crack YOLO Training & Acquisition Pipeline
==========================================================
Strategy (in priority order):
  1. Try to download pre-trained crack detection weights from HuggingFace
     (cazzz307/yolov8-crack-detection or OpenSistemas/YOLOv8-crack-seg)
  2. If HF weights unavailable, download Ultralytics crack-seg dataset and
     fine-tune yolov8n.pt for detection (50 epochs, early stopping)
  3. Validate the resulting model on our sample images
  4. Copy best.pt to backend/models/crack_yolo.pt

Usage:
    python backend/scripts/train_crack_model.py
"""

import sys
import os
import shutil
import time
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("crack_train")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = REPO_ROOT / "backend" / "models"
SAMPLE_DIR = REPO_ROOT / "frontend" / "public" / "sample-data"
OUTPUT_MODEL = MODELS_DIR / "crack_yolo.pt"

# HuggingFace repos to try (in order of preference)
# 1. OpenSistemas/YOLOv8-crack-seg: Public, YOLOv8n-seg, 100 epochs, crack-seg dataset
#    class_map: {0: 'crack'}, task: segment
# 2. cazzz307/yolov8-crack-detection: Gated (requires HF token), detection model
HF_REPOS = [
    # (repo_id, filename_path)
    ("OpenSistemas/YOLOv8-crack-seg", "yolov8n/weights/best.pt"),  # Public, preferred
    ("OpenSistemas/YOLOv8-crack-seg", "yolov8s/weights/best.pt"),  # Public, small fallback
    ("cazzz307/yolov8-crack-detection", "best.pt"),                # Gated, needs HF_TOKEN
]

# Dataset for local fine-tuning if HF fails
# Ultralytics crack-seg dataset (hosted publicly)
ULTRALYTICS_DATASET = "crack-seg"


def try_download_from_hf() -> Path | None:
    """Try downloading pre-trained crack weights from HuggingFace."""
    try:
        from huggingface_hub import hf_hub_download, list_repo_files
        log.info("huggingface_hub available. Trying to download pre-trained weights...")
    except ImportError:
        log.warning("huggingface_hub not installed. Skipping HF download.")
        return None

    for repo_id, filename in HF_REPOS:
        log.info(f"  Trying {repo_id}/{filename} ...")
        try:
            path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                local_dir=str(MODELS_DIR / "_hf_cache"),
            )
            local_path = Path(path)
            if local_path.exists() and local_path.stat().st_size > 100_000:
                log.info(f"  Downloaded: {local_path} ({local_path.stat().st_size // 1024} KB)")
                return local_path
        except Exception as e:
            log.debug(f"  Failed ({type(e).__name__}): {e}")
            continue

    log.warning("All HuggingFace download attempts failed.")
    return None


def validate_model(weights_path: Path, sample_dir: Path) -> dict:
    """
    Run the model on crack sample images and return real detection counts.
    No fabrication — returns actual model output.
    """
    from ultralytics import YOLO
    import cv2

    log.info(f"\n=== Validating model: {weights_path.name} ===")
    model = YOLO(str(weights_path))

    crack_images = list(sample_dir.glob("crack_*.jpg")) + list(sample_dir.glob("crack_*.png"))
    if not crack_images:
        log.warning(f"No crack_*.jpg images found in {sample_dir}")
        return {"images_tested": 0}

    results_summary = {}
    for img_path in sorted(crack_images):
        t0 = time.perf_counter()
        results = model.predict(str(img_path), conf=0.25, iou=0.5, verbose=False)
        dt = (time.perf_counter() - t0) * 1000
        result = results[0]
        n_boxes = len(result.boxes) if result.boxes else 0

        # Find class names
        class_names = model.names
        labels = [class_names[int(b.cls[0].item())] for b in result.boxes] if result.boxes else []

        log.info(f"  {img_path.name}: {n_boxes} detections in {dt:.0f}ms | classes={labels[:5]}")
        results_summary[img_path.name] = {"detections": n_boxes, "labels": labels, "ms": dt}

    return results_summary


def train_local(sample_dir: Path) -> Path | None:
    """
    Fine-tune yolov8n on the Ultralytics crack-seg dataset.
    Saves best.pt to runs/detect/crack_yolo/weights/best.pt
    """
    from ultralytics import YOLO, settings as ultralytics_settings
    import yaml

    log.info("\n=== Starting local fine-tuning on crack-seg dataset ===")

    # Configure ultralytics to store runs inside civisight project
    runs_dir = REPO_ROOT / "backend" / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    ultralytics_settings.update({"runs_dir": str(runs_dir)})

    # Download + cache the dataset via ultralytics (it fetches crack-seg from their hub)
    log.info("Loading base model yolov8n.pt and downloading crack-seg dataset...")
    model = YOLO("yolov8n.pt")

    train_args = dict(
        data=ULTRALYTICS_DATASET,   # Ultralytics built-in dataset identifier
        epochs=50,
        imgsz=640,
        batch=8,
        patience=10,                # early stopping
        name="crack_yolo",
        project=str(runs_dir / "detect"),
        exist_ok=True,
        cache=False,
        device="cpu",               # CPU-safe; swap to "0" if GPU available
        verbose=False,
        plots=False,
        save_period=-1,             # only save best
        conf=0.25,
        iou=0.5,
        augment=True,
        degrees=10,
        fliplr=0.5,
        mosaic=0.5,
        mixup=0.0,
        copy_paste=0.0,
    )

    log.info(f"Training config: epochs={train_args['epochs']}, imgsz={train_args['imgsz']}, device={train_args['device']}")

    results = model.train(**train_args)
    best_pt = Path(results.save_dir) / "weights" / "best.pt"

    if not best_pt.exists():
        log.error(f"Training finished but best.pt not found at {best_pt}")
        return None

    log.info(f"Training complete. Best weights: {best_pt}")
    return best_pt


def main():
    log.info("=" * 60)
    log.info("CiviSight AI — Crack YOLO Acquisition Pipeline")
    log.info("=" * 60)
    log.info(f"Models dir  : {MODELS_DIR}")
    log.info(f"Output model: {OUTPUT_MODEL}")
    log.info(f"Sample dir  : {SAMPLE_DIR}")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Backup existing crack_yolo.pt if it exists
    if OUTPUT_MODEL.exists():
        backup = OUTPUT_MODEL.with_suffix(".pt.bak")
        shutil.copy2(OUTPUT_MODEL, backup)
        log.info(f"Backed up existing model to {backup.name}")

    # ── STEP 1: Try HuggingFace first ──────────────────────────────
    best_weights = try_download_from_hf()

    # ── STEP 2: If HF failed, train locally ─────────────────────────
    if best_weights is None:
        log.info("\nFalling back to local fine-tuning...")
        best_weights = train_local(SAMPLE_DIR)

    if best_weights is None:
        log.error("FAILED: Could not acquire crack model weights via any method.")
        sys.exit(1)

    # ── STEP 3: Validate before deploying ───────────────────────────
    if SAMPLE_DIR.exists():
        val_results = validate_model(best_weights, SAMPLE_DIR)
        total_detections = sum(r.get("detections", 0) for r in val_results.values())
        log.info(f"\nValidation: {len(val_results)} images, {total_detections} total detections")
        if total_detections == 0 and len(val_results) > 0:
            log.warning("WARNING: Model produced 0 detections on all crack sample images!")
            log.warning("The model may be mismatched or thresholds too high.")
    else:
        log.warning(f"Sample dir not found: {SAMPLE_DIR} — skipping validation")
        val_results = {}

    # ── STEP 4: Install weights ──────────────────────────────────────
    shutil.copy2(str(best_weights), str(OUTPUT_MODEL))
    size_mb = OUTPUT_MODEL.stat().st_size / (1024 * 1024)
    log.info(f"\n✓ Installed: {OUTPUT_MODEL} ({size_mb:.1f} MB)")

    # ── STEP 5: Print summary ────────────────────────────────────────
    log.info("\n" + "=" * 60)
    log.info("CRACK MODEL INSTALLATION COMPLETE")
    log.info("=" * 60)
    log.info(f"  Source      : {best_weights}")
    log.info(f"  Destination : {OUTPUT_MODEL}")
    log.info(f"  Size        : {size_mb:.1f} MB")
    if val_results:
        for img_name, r in val_results.items():
            log.info(f"  {img_name:<30} detections={r['detections']:>3}  ms={r['ms']:>6.0f}")

    log.info("\nNext steps:")
    log.info("  1. Restart the backend server to load the new model")
    log.info("  2. Verify: GET http://localhost:8000/api/health")
    log.info("     -> crack_detection.mode should be 'trained_model'")
    log.info("  3. Run e2e smoke test: python backend/scripts/e2e_smoke.py")


if __name__ == "__main__":
    main()
