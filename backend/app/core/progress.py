import threading
import time
from typing import Optional, Dict, Any, List

STAGES_ORDER = [
    ("preprocessing", "Image preprocessing"),
    ("detection", "Object/damage detection"),
    ("classification", "Result classification"),
    ("interpretation", "Engineering interpretation"),
]


class ProgressTracker:
    def __init__(self, expiration_seconds: int = 600):
        self._lock = threading.Lock()
        self._data: Dict[str, Dict[str, Any]] = {}
        self._expiration = expiration_seconds

    def init(self, request_id: Optional[str]) -> None:
        if not request_id:
            return
        now = time.time()
        with self._lock:
            self._cleanup_expired(now)
            self._data[request_id] = {
                "current_stage": "preprocessing",
                "updated_at": now,
            }

    def set(self, request_id: Optional[str], stage_key: str) -> None:
        if not request_id:
            return
        now = time.time()
        with self._lock:
            if request_id in self._data:
                self._data[request_id]["current_stage"] = stage_key
                self._data[request_id]["updated_at"] = now

    def complete(self, request_id: Optional[str]) -> None:
        if not request_id:
            return
        now = time.time()
        with self._lock:
            if request_id in self._data:
                self._data[request_id]["current_stage"] = "done"
                self._data[request_id]["updated_at"] = now

    def get(self, request_id: str) -> Optional[Dict[str, Any]]:
        now = time.time()
        with self._lock:
            self._cleanup_expired(now)
            item = self._data.get(request_id)
            if not item:
                return None

            curr = item["current_stage"]
            stages: List[Dict[str, str]] = []
            reached = False

            if curr == "done":
                for key, label in STAGES_ORDER:
                    stages.append({"key": key, "label": label, "status": "done"})
                return {"stage": "done", "stages": stages}

            for key, label in STAGES_ORDER:
                if key == curr:
                    status = "running"
                    reached = True
                elif not reached:
                    status = "done"
                else:
                    status = "pending"
                stages.append({"key": key, "label": label, "status": status})

            return {"stage": curr, "stages": stages}

    def _cleanup_expired(self, now: float) -> None:
        expired_keys = [
            k for k, v in self._data.items()
            if now - v["updated_at"] > self._expiration
        ]
        for k in expired_keys:
            del self._data[k]


progress = ProgressTracker()
