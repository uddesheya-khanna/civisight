#!/usr/bin/env python3
"""
CiviSight AI — Production Model Download Script
================================================
Downloads all required model weights for production deployment.

IMPORTANT:
  - This script ONLY downloads pre-trained weights.
  - It NEVER trains, fine-tunes, or modifies any model.
  - It is safe to call during Render build steps.
  - It is idempotent — already-present files are not re-downloaded.
  - It fails loudly if a required model cannot be obtained.

Sources (all public, no authentication required):
  crack_yolo.pt   → OpenSistemas/YOLOv8-crack-seg on HuggingFace
  pothole_yolo.pt → peterhdd/pothole-detection-yolov8 on HuggingFace
  yolov8n.pt      → Ultralytics GitHub releases (COCO person detector)
  helmet_yolo.pt  → keremberke/yolov8n-hard-hat-detection on HuggingFace

Usage:
    python backend/scripts/download_deploy_models.py

Build command (Render):
    pip install -r backend/requirements.txt && python backend/scripts/download_deploy_models.py
"""

import sys
import shutil
import urllib.request
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("deploy_models")

# Repo root is two levels above this script: civisight/backend/scripts/
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = REPO_ROOT / "backend" / "models"

MIN_FILE_SIZE_BYTES = 1_000_000  # 1 MB — reject obviously truncated downloads


def _hf_download(repo_id: str, filename: str, dest: Path) -> None:
    """
    Download a file from a public HuggingFace model repository.
    Uses huggingface_hub if available, falls back to direct URL.
    Does NOT require authentication (public repos only).
    """
    try:
        from huggingface_hub import hf_hub_download
        log.info(f"Downloading {repo_id}/{filename} via huggingface_hub...")
        cached = hf_hub_download(repo_id=repo_id, filename=filename)
        shutil.copy(cached, dest)
        log.info(f"  → Saved to {dest}")
    except ImportError:
        # Fallback: construct the direct CDN URL
        url = f"https://huggingface.co/{repo_id}/resolve/main/{filename}"
        log.info(f"huggingface_hub not available — direct download from {url}")
        urllib.request.urlretrieve(url, dest)
        log.info(f"  → Saved to {dest}")
    except Exception as e:
        raise RuntimeError(f"Failed to download {repo_id}/{filename}: {e}") from e


def _direct_download(url: str, dest: Path) -> None:
    log.info(f"Direct download: {url}")
    urllib.request.urlretrieve(url, dest)
    log.info(f"  → Saved to {dest}")


def _validate(path: Path, name: str, required: bool) -> bool:
    """Return True if the file exists and is non-trivially sized."""
    if not path.exists():
        msg = f"[MISSING] {name} at {path}"
        if required:
            raise RuntimeError(msg)
        log.warning(msg)
        return False
    size = path.stat().st_size
    if size < MIN_FILE_SIZE_BYTES:
        msg = f"[SUSPICIOUS] {name} at {path} is only {size} bytes — possibly truncated"
        if required:
            raise RuntimeError(msg)
        log.warning(msg)
        return False
    log.info(f"[OK] {name}: {path} ({size / 1_000_000:.1f} MB)")
    return True


def download_crack_model(dest: Path) -> None:
    """
    Source: OpenSistemas/YOLOv8-crack-seg
    File:   yolov8n/weights/best.pt
    Task:   segment, NC=1, class={0: 'crack'}
    """
    _hf_download(
        repo_id="OpenSistemas/YOLOv8-crack-seg",
        filename="yolov8n/weights/best.pt",
        dest=dest,
    )


def download_pothole_model(dest: Path) -> None:
    """
    Source: peterhdd/pothole-detection-yolov8
    File:   best.pt
    Task:   detect
    """
    _hf_download(
        repo_id="peterhdd/pothole-detection-yolov8",
        filename="best.pt",
        dest=dest,
    )


def download_yolov8n(dest: Path) -> None:
    """
    Source: Ultralytics GitHub releases — public COCO model.
    Used as the person detector in the safety module.
    Ultralytics auto-download is the primary method; direct URL is the fallback.
    """
    try:
        from ultralytics import YOLO
        log.info("Downloading yolov8n.pt via Ultralytics...")
        m = YOLO("yolov8n.pt")  # downloads to CWD or ultralytics cache
        # Find where Ultralytics placed the file
        candidates = [
            Path("yolov8n.pt"),
            Path.home() / ".config" / "Ultralytics" / "yolov8n.pt",
        ]
        src = next((c for c in candidates if c.exists()), None)
        if src and src.resolve() != dest.resolve():
            shutil.copy(src, dest)
            log.info(f"  → Copied from {src} to {dest}")
        elif dest.exists():
            log.info(f"  → Already at {dest}")
        else:
            raise RuntimeError("yolov8n.pt not found after Ultralytics download.")
    except Exception as e:
        log.warning(f"Ultralytics download failed ({e}), trying direct URL...")
        url = "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
        _direct_download(url, dest)


def download_helmet_model(dest: Path) -> None:
    """
    Source: keremberke/yolov8n-hard-hat-detection
    File:   best.pt
    Task:   detect, classes: Hardhat / NO-Hardhat
    """
    _hf_download(
        repo_id="keremberke/yolov8n-hard-hat-detection",
        filename="best.pt",
        dest=dest,
    )


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    log.info("=" * 60)
    log.info(" CiviSight AI — Production Model Download")
    log.info("=" * 60)
    log.info(f"Models directory: {MODELS_DIR}")

    errors = []

    # ── 1. Crack model (required for trained mode; classical fallback exists) ──
    crack_dest = MODELS_DIR / "crack_yolo.pt"
    if not crack_dest.exists():
        try:
            download_crack_model(crack_dest)
        except Exception as e:
            log.warning(
                f"crack_yolo.pt could not be downloaded: {e}\n"
                "  Classical ridge-filter fallback will be used for crack detection."
            )
    _validate(crack_dest, "crack_yolo.pt", required=False)

    # ── 2. Pothole model (required — no fallback) ──────────────────────────────
    pothole_dest = MODELS_DIR / "pothole_yolo.pt"
    if not pothole_dest.exists():
        try:
            download_pothole_model(pothole_dest)
        except Exception as e:
            errors.append(f"pothole_yolo.pt: {e}")
            log.error(f"[FAIL] pothole_yolo.pt: {e}")
    try:
        _validate(pothole_dest, "pothole_yolo.pt", required=True)
    except RuntimeError as e:
        errors.append(str(e))

    # ── 3. COCO yolov8n.pt (required for safety module) ───────────────────────
    yolov8n_dest = MODELS_DIR / "yolov8n.pt"
    if not yolov8n_dest.exists():
        try:
            download_yolov8n(yolov8n_dest)
        except Exception as e:
            errors.append(f"yolov8n.pt: {e}")
            log.error(f"[FAIL] yolov8n.pt: {e}")
    try:
        _validate(yolov8n_dest, "yolov8n.pt", required=True)
    except RuntimeError as e:
        errors.append(str(e))

    # ── 4. Helmet model (graceful degradation to person-only if unavailable) ───
    helmet_dest = MODELS_DIR / "helmet_yolo.pt"
    if not helmet_dest.exists():
        try:
            download_helmet_model(helmet_dest)
        except Exception as e:
            log.warning(
                f"helmet_yolo.pt could not be downloaded: {e}\n"
                "  Safety module will operate in person-only degraded mode."
            )
    _validate(helmet_dest, "helmet_yolo.pt", required=False)

    # ── Summary ────────────────────────────────────────────────────────────────
    log.info("=" * 60)
    if errors:
        log.error("DEPLOYMENT BLOCKED — required model(s) could not be obtained:")
        for err in errors:
            log.error(f"  ✗ {err}")
        log.error(
            "Re-run this script or manually place the required .pt files "
            "in backend/models/ before deploying."
        )
        sys.exit(1)
    else:
        log.info("All required model weights are present. Deployment ready.")
        log.info("=" * 60)


if __name__ == "__main__":
    main()
