import json
import os
import re
import shutil
import time
import uuid
from pathlib import Path
from typing import Optional, Any
from backend.app.config import settings
from backend.app.core.errors import not_found_error, AppError
import logging

logger = logging.getLogger("civisight.storage")

ANALYSIS_ID_REGEX = re.compile(r"^[a-f0-9]{32}$")


class StorageManager:
    def __init__(self, storage_dir: Optional[Path] = None):
        self.root_dir = storage_dir or settings.storage_path
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def generate_analysis_id(self) -> str:
        return uuid.uuid4().hex

    def get_analysis_dir(self, analysis_id: str) -> Path:
        if not ANALYSIS_ID_REGEX.match(analysis_id):
            raise not_found_error("Invalid analysis ID.")
        path = (self.root_dir / analysis_id).resolve()
        # Prevent directory traversal
        if not str(path).startswith(str(self.root_dir.resolve())):
            raise not_found_error("Access denied.")
        return path

    def init_analysis_dir(self, analysis_id: str) -> Path:
        adir = self.get_analysis_dir(analysis_id)
        adir.mkdir(parents=True, exist_ok=True)
        return adir

    def get_file_path(self, analysis_id: str, kind: str) -> Path:
        if kind not in {"original", "annotated"}:
            raise not_found_error("Invalid file kind.")
        adir = self.get_analysis_dir(analysis_id)
        fpath = adir / f"{kind}.jpg"
        if not fpath.exists():
            raise not_found_error("File not found.")
        return fpath

    def save_image_atomic(self, analysis_id: str, kind: str, image_bytes: bytes) -> Path:
        if kind not in {"original", "annotated"}:
            raise ValueError(f"Invalid image kind: {kind}")
        adir = self.init_analysis_dir(analysis_id)
        target = adir / f"{kind}.jpg"
        temp_target = adir / f"{kind}.tmp_{uuid.uuid4().hex}"
        with open(temp_target, "wb") as f:
            f.write(image_bytes)
        temp_target.replace(target)
        return target

    def save_result_json_atomic(self, analysis_id: str, data: dict[str, Any]) -> Path:
        adir = self.init_analysis_dir(analysis_id)
        target = adir / "result.json"
        temp_target = adir / f"result.tmp_{uuid.uuid4().hex}"
        with open(temp_target, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_target.replace(target)
        return target

    def load_result_json(self, analysis_id: str) -> dict[str, Any]:
        adir = self.get_analysis_dir(analysis_id)
        target = adir / "result.json"
        if not target.exists():
            raise not_found_error("Analysis result not found.")
        with open(target, "r", encoding="utf-8") as f:
            return json.load(f)

    def cleanup_old_files(self, retention_hours: Optional[int] = None) -> int:
        hours = retention_hours if retention_hours is not None else settings.retention_hours
        cutoff_sec = time.time() - (hours * 3600)
        removed_count = 0
        if not self.root_dir.exists():
            return 0

        for item in self.root_dir.iterdir():
            if item.is_dir() and ANALYSIS_ID_REGEX.match(item.name):
                try:
                    mtime = item.stat().st_mtime
                    if mtime < cutoff_sec:
                        shutil.rmtree(item, ignore_errors=True)
                        removed_count += 1
                except Exception as e:
                    logger.warning(f"Error checking/removing directory {item}: {e}")
        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} expired analysis directories older than {hours}h.")
        return removed_count


storage = StorageManager()
