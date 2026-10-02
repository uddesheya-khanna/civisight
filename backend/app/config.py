import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_upload_mb: int = 10
    max_image_dim: int = 1920
    retention_hours: int = 168
    model_registry_path: str = "models/registry.yaml"
    storage_dir: str = "storage"
    max_concurrent_inferences: int = 2
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def base_dir(self) -> Path:
        # backend root directory
        return Path(__file__).resolve().parent.parent

    @property
    def storage_path(self) -> Path:
        p = Path(self.storage_dir)
        if not p.is_absolute():
            p = self.base_dir / p
        return p

    @property
    def registry_file_path(self) -> Path:
        p = Path(self.model_registry_path)
        if not p.is_absolute():
            p = self.base_dir / p
        return p


settings = Settings()
