from typing import Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger("civisight.errors")


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


# Pre-defined errors matching PRD Section 12.3
def unsupported_media_type_error() -> AppError:
    return AppError(
        code="UNSUPPORTED_MEDIA_TYPE",
        message="Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image.",
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
    )


def file_too_large_error(max_mb: int) -> AppError:
    return AppError(
        code="FILE_TOO_LARGE",
        message=f"The image is larger than {max_mb} MB. Please upload a smaller image.",
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
    )


def corrupt_image_error() -> AppError:
    return AppError(
        code="CORRUPT_IMAGE",
        message="The image could not be read. The file may be corrupt.",
        status_code=status.HTTP_400_BAD_REQUEST,
    )


def image_too_small_error() -> AppError:
    return AppError(
        code="IMAGE_TOO_SMALL",
        message="The image is too small to analyze (minimum 64×64 pixels).",
        status_code=status.HTTP_400_BAD_REQUEST,
    )


def invalid_inspection_type_error(details: Optional[dict[str, Any]] = None) -> AppError:
    return AppError(
        code="INVALID_INSPECTION_TYPE",
        message="Unknown inspection type.",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=details,
    )


def model_unavailable_error(setup_hint: str = "Please see setup instructions to install required weights.") -> AppError:
    return AppError(
        code="MODEL_UNAVAILABLE",
        message="The detection model for this module is not available on the server.",
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        details={"setup_hint": setup_hint},
    )


def inference_failed_error(details: Optional[dict[str, Any]] = None) -> AppError:
    return AppError(
        code="INFERENCE_FAILED",
        message="Analysis failed while processing the image. Please try another image.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        details=details,
    )


def not_found_error(message: str = "Result or file not found. It may have expired.") -> AppError:
    return AppError(
        code="NOT_FOUND",
        message=message,
        status_code=status.HTTP_404_NOT_FOUND,
    )


def bad_request_error(message: str = "Invalid request.") -> AppError:
    return AppError(
        code="BAD_REQUEST",
        message=message,
        status_code=status.HTTP_400_BAD_REQUEST,
    )



def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        logger.warning(f"AppError [{exc.code}] on {request.url.path}: {exc.message}")
        content: dict[str, Any] = {
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        }
        if exc.details:
            content["error"]["details"] = exc.details
        return JSONResponse(status_code=exc.status_code, content=content)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "HTTP_ERROR"
        message = str(exc.detail) if exc.detail else "An error occurred."
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            code = "NOT_FOUND"
            message = "Result or file not found. It may have expired."
        elif exc.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE:
            code = "FILE_TOO_LARGE"
        elif exc.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE:
            code = "UNSUPPORTED_MEDIA_TYPE"

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": message,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        logger.info(f"Request validation error on {request.url.path}: {exc.errors()}")
        # Check if invalid inspection type
        for err in exc.errors():
            loc = err.get("loc", ())
            if "inspection_type" in loc:
                return JSONResponse(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    content={
                        "error": {
                            "code": "INVALID_INSPECTION_TYPE",
                            "message": "Unknown inspection type.",
                        }
                    },
                )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request parameters.",
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INFERENCE_FAILED",
                    "message": "Analysis failed while processing the image. Please try another image.",
                }
            },
        )
