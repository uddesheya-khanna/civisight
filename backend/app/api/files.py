from fastapi import APIRouter
from fastapi.responses import FileResponse
from backend.app.core.storage import storage

router = APIRouter(tags=["files"])


@router.get("/files/{analysis_id}/{kind}")
def get_file(analysis_id: str, kind: str) -> FileResponse:
    file_path = storage.get_file_path(analysis_id, kind)
    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg",
        filename=f"{analysis_id}_{kind}.jpg",
    )
