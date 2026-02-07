from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    cors_origins: str = "http://localhost:3000"
    pdf_storage_dir: str = "/data/pdfs"
    invite_emails: str = ""
    invite_code: str | None = None
    crossref_mailto: str | None = None

    # Clarivate Web of Science API Expanded (optional)
    clarivate_api_key: str | None = None
    clarivate_wos_base_url: str = "https://wos-api.clarivate.com/api/wos"
    clarivate_timeout_seconds: float = 10.0

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def invite_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.invite_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()

