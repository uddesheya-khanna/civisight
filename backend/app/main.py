import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.core.errors import register_error_handlers
from backend.app.core.storage import storage
from backend.app.cv.registry import registry
from backend.app.api.health import router as health_router
from backend.app.api.analyze import router as analyze_router
from backend.app.api.files import router as files_router
from backend.app.api.report import router as report_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("civisight")


async def periodic_cleanup_task():
    """Background task running every hour to clean up files older than RETENTION_HOURS."""
    while True:
        try:
            await asyncio.sleep(3600)
            storage.cleanup_old_files()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic cleanup task: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting CiviSight AI Backend...")
    try:
        storage.cleanup_old_files()
    except Exception as e:
        logger.warning(f"Startup storage cleanup error: {e}")

    try:
        registry.preload()
    except Exception as e:
        logger.warning(f"Model preload error: {e}")

    cleanup_bg_task = asyncio.create_task(periodic_cleanup_task())
    yield
    # Shutdown actions
    cleanup_bg_task.cancel()
    try:
        await cleanup_bg_task
    except asyncio.CancelledError:
        pass
    logger.info("CiviSight AI Backend shutdown complete.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="CiviSight AI",
        description="AI-Powered Infrastructure Inspection API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register error handlers
    register_error_handlers(app)

    # Mount API routers under /api
    app.include_router(health_router, prefix="/api")
    app.include_router(analyze_router, prefix="/api")
    app.include_router(files_router, prefix="/api")
    app.include_router(report_router, prefix="/api")

    return app


app = create_app()
